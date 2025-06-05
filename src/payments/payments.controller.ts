import {
  Controller,
  Post,
  Get,
  Query,
  UseGuards,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  ConflictException,
  Logger,
  Response,
  Body,
} from '@nestjs/common';
import { MercadoPagoService } from './mercadopago/mercado-pago.service';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../auth/schemas/users.schema';
import { CartService } from '../cart/cart.service';
import { ProductsService } from '../products/products.service';
import { OrdersService } from '../orders/orders.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CheckoutDto } from './dtos/checkout.dto';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly mercadoPagoService: MercadoPagoService,
    private readonly cartService: CartService,
    private readonly productsService: ProductsService,
    private readonly ordersService: OrdersService,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  private validateId(id: string, fieldName: string = 'ID'): void {
    if (!id || id.trim() === '') {
      throw new BadRequestException(`El ${fieldName} no puede estar vacío`);
    }
    const uuidRegex =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(id)) {
      throw new BadRequestException(
        `El ${fieldName} no tiene un formato válido (debe ser un UUID)`,
      );
    }
  }

  private validateNumber(
    value: number,
    fieldName: string,
    allowZero: boolean = false,
  ): void {
    if (typeof value !== 'number' || (allowZero ? value < 0 : value <= 0)) {
      throw new BadRequestException(
        `El ${fieldName} debe ser un número ${allowZero ? 'no negativo' : 'positivo'}`,
      );
    }
  }

  @Post('checkout')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary:
      'Iniciar el proceso de pago con Mercado Pago para todo el carrito o productos seleccionados',
  })
  @ApiBody({ type: CheckoutDto })
  @ApiResponse({
    status: 201,
    description:
      'Carrito procesado (completo o seleccionado) y URL de pago generada',
    type: Object,
  })
  @ApiResponse({
    status: 400,
    description:
      'Carrito vacío, stock insuficiente, ítems no válidos o ID no válido',
  })
  @ApiResponse({ status: 404, description: 'Producto o usuario no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 500, description: 'Error al procesar el checkout' })
  async checkout(
    @GetUser() user: User,
    @Body() checkoutDto: CheckoutDto = { selectedProductIds: [] },
  ) {
    console.log('checkout - userId recibido:', user._id);
    this.validateId(user._id, 'userId');

    try {
      const cart = await this.cartService.findOne(user._id);

      if (!cart.items || cart.items.length === 0) {
        throw new BadRequestException('El carrito está vacío');
      }

      // Si selectedProductIds está vacío o no proporcionado, usar todos los ítems del carrito
      const selectedProductIds =
        checkoutDto.selectedProductIds &&
        checkoutDto.selectedProductIds.length > 0
          ? checkoutDto.selectedProductIds
          : cart.items.map((item) => item.productId);

      // Generar carrito virtual (o completo si no hay selección)
      const virtualCart = await this.cartService.createVirtualCart(
        user._id,
        selectedProductIds,
      );

      if (!virtualCart.items || virtualCart.items.length === 0) {
        throw new BadRequestException(
          'No se encontraron ítems válidos para el checkout',
        );
      }

      // Validar stock
      for (const item of virtualCart.items) {
        const product = await this.productsService.findOne(item.productId);
        if (!product) {
          throw new NotFoundException(
            `Producto no encontrado: ${item.productId}`,
          );
        }
        if (product.stock < item.quantity) {
          throw new ConflictException(
            `Stock insuficiente para el producto ${product.name}. Disponible: ${product.stock}, Requerido: ${item.quantity}`,
          );
        }
      }

      const cartItems = virtualCart.items.map((item) => ({
        productId: item.productId,
        price: item.discountedSubtotal
          ? item.discountedSubtotal / item.quantity
          : item.unitPrice,
        quantity: item.quantity,
      }));

      const totalPrice =
        virtualCart.discountedTotalPrice || virtualCart.totalPrice;

      // Crear external_reference con productIds
      const externalReference = `${user._id}|${selectedProductIds.join(',')}`;

      const preference = await this.mercadoPagoService.createPreference(
        cartItems,
        totalPrice,
        user._id,
        externalReference,
      );

      return {
        cart: virtualCart,
        init_point: preference.init_point,
      };
    } catch (error: unknown) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error(
        `Error al procesar el checkout: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('Error al procesar el checkout');
    }
  }

  @Get('success')
  @ApiOperation({ summary: 'Callback de pago exitoso de Mercado Pago' })
  @ApiQuery({ name: 'payment_id', required: true, type: String })
  @ApiQuery({ name: 'external_reference', required: false, type: String })
  @ApiResponse({
    status: 302,
    description: 'Redirige directamente a la vista de órdenes en el frontend',
  })
  @ApiResponse({
    status: 400,
    description: 'payment_id, external_reference o status inválidos',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario, carrito o pago no encontrado',
  })
  @ApiResponse({
    status: 500,
    description: 'Error al procesar el callback de pago exitoso',
  })
  async success(
    @Query('payment_id') paymentId: string,
    @Response() res: any,
    @Query('external_reference') externalReference?: string,
  ) {
    if (!paymentId || paymentId.trim() === '') {
      throw new BadRequestException('El payment_id no puede estar vacío');
    }

    try {
      const paymentStatus =
        await this.mercadoPagoService.getPaymentStatus(paymentId);

      if (!['approved', 'rejected', 'pending'].includes(paymentStatus.status)) {
        throw new BadRequestException(
          'El estado del pago debe ser uno de: approved, rejected, pending',
        );
      }

      if (paymentStatus.status !== 'approved') {
        return res.redirect('http://localhost:3003/payment-failure');
      }

      let userId: string | undefined;
      let productIds: string[] = [];
      if (externalReference) {
        const [extractedUserId, productIdsStr] = externalReference.split('|');
        if (!extractedUserId) {
          throw new BadRequestException(
            'El external_reference no tiene un formato válido',
          );
        }
        console.log(
          'success - userId recibido desde external_reference:',
          extractedUserId,
        );
        this.validateId(extractedUserId, 'userId');
        userId = extractedUserId;
        if (productIdsStr) {
          productIds = productIdsStr.split(',');
          for (const productId of productIds) {
            this.validateId(productId, 'productId');
          }
        }
      }

      if (!userId) {
        return res.redirect(
          'http://localhost:3003/payment-failure?error=user_not_found',
        );
      }

      const user = await this.userModel.findById(userId).exec();
      if (!user) {
        return res.redirect(
          'http://localhost:3003/payment-failure?error=user_not_found',
        );
      }

      const cart = await this.cartService.findOne(user._id);
      if (!cart) {
        return res.redirect(
          'http://localhost:3003/payment-failure?error=cart_not_found',
        );
      }

      if (!cart.items || cart.items.length === 0) {
        return res.redirect(
          'http://localhost:3003/payment-failure?error=empty_cart',
        );
      }

      const paidItems =
        productIds.length > 0
          ? cart.items.filter((item) => productIds.includes(item.productId))
          : cart.items;

      for (const item of paidItems) {
        const product = await this.productsService.findOne(item.productId);
        if (!product) {
          throw new NotFoundException(
            `Producto no encontrado: ${item.productId}`,
          );
        }
        if (product.stock < item.quantity) {
          throw new ConflictException(
            `Stock insuficiente para el producto ${product.name}. Disponible: ${product.stock}, Requerido: ${item.quantity}`,
          );
        }
        product.stock -= item.quantity;
        await product.save();
      }

      const order = await this.ordersService.createFromCart(
        user._id,
        productIds,
      );

      if (!order.order._id) {
        throw new InternalServerErrorException(
          'El ID del pedido creado no es válido',
        );
      }
      console.log('success - orderId creado:', order.order._id);
      this.validateId(order.order._id, 'orderId');

      await this.cartService.clearCart(user._id, productIds);

      return res.redirect('http://localhost:3003/orders');
    } catch (error: unknown) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        this.logger.error(
          `Error procesando callback de éxito: ${error.message}`,
          error.stack,
        );
        return res.redirect(
          `http://localhost:3003/payment-failure?error=${error.message}`,
        );
      }
      this.logger.error(
        `Error al procesar el callback de pago exitoso: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      return res.redirect(
        'http://localhost:3003/payment-failure?error=server_error',
      );
    }
  }

  @Get('failure')
  @ApiOperation({ summary: 'Callback de pago fallido de Mercado Pago' })
  @ApiQuery({ name: 'payment_id', required: true, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiResponse({ status: 302, description: 'Redirige al frontend' })
  async failure(@Query('status') status: string, @Response() res: any) {
    this.logger.warn('Pago cancelado o fallido', { status });
    return res.redirect('http://localhost:3003/');
  }

  @Get('pending')
  @ApiOperation({ summary: 'Callback de pago pendiente de Mercado Pago' })
  @ApiQuery({ name: 'payment_id', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Estado del pago', type: Object })
  @ApiResponse({ status: 400, description: 'payment_id no válido' })
  @ApiResponse({ status: 404, description: 'Pago no encontrado' })
  @ApiResponse({
    status: 500,
    description: 'Error al procesar el callback de pago pendiente',
  })
  async pending(@Query('payment_id') paymentId: string) {
    if (!paymentId || paymentId.trim() === '') {
      throw new BadRequestException('El payment_id no puede estar vacío');
    }

    try {
      const paymentStatus =
        await this.mercadoPagoService.getPaymentStatus(paymentId);
      return paymentStatus;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message);
      }
      this.logger.error(
        `Error al procesar el callback de pago pendiente: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(
        'Error al procesar el callback de pago pendiente',
      );
    }
  }
}
