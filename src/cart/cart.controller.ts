import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto } from './dtos/add-to-cart.dto';
import { UpdateCartDto } from './dtos/update-cart.dto';
import { CheckoutDto } from '../payments/dtos/checkout.dto';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../auth/schemas/users.schema';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CartResponseDto } from './dtos/cart-response.dto';
import { MercadoPagoService } from '../payments/mercadopago/mercado-pago.service';
import { ProductsService } from '../products/products.service';
import { PromotionsService } from '../promotions/promotions.service';

@ApiTags('Cart')
@Controller('cart')
@UseGuards(AuthGuard('jwt'))
export class CartController {
  constructor(
    private readonly cartService: CartService,
    private readonly mercadoPagoService: MercadoPagoService,
    private readonly productsService: ProductsService,
    private readonly promotionsService: PromotionsService,
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

  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener el carrito del usuario autenticado' })
  @ApiResponse({
    status: 200,
    description: 'Carrito del usuario con descuentos aplicados',
    type: CartResponseDto,
  })
  @ApiResponse({ status: 400, description: 'ID de usuario no válido' })
  @ApiResponse({ status: 404, description: 'Carrito no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 500, description: 'Error al obtener el carrito' })
  async getCart(@GetUser() user: User): Promise<CartResponseDto> {
    console.log('getCart - userId recibido:', user._id);
    this.validateId(user._id, 'userId');

    try {
      const cart = await this.cartService.findOne(user._id);

      try {
        const { itemsWithDiscount, totalDiscount } =
          await this.promotionsService.calculateDiscountForCartItems(
            cart.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          );

        const discountedTotalPrice = cart.totalPrice - totalDiscount;

        return {
          ...cart,
          items: itemsWithDiscount,
          totalDiscount: totalDiscount > 0 ? totalDiscount : undefined,
          discountedTotalPrice:
            discountedTotalPrice > 0 ? discountedTotalPrice : undefined,
        };
      } catch (error) {
        return {
          ...cart,
          items: cart.items,
          totalDiscount: undefined,
          discountedTotalPrice: undefined,
        };
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Error al obtener el carrito');
    }
  }

  @Post('add')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Agregar un ítem al carrito' })
  @ApiBody({ type: AddToCartDto })
  @ApiResponse({
    status: 201,
    description: 'Ítem agregado al carrito',
    type: CartResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o ID no válido',
  })
  @ApiResponse({
    status: 404,
    description: 'Producto no encontrado o stock insuficiente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 500,
    description: 'Error al agregar el ítem al carrito',
  })
  async addItem(
    @GetUser() user: User,
    @Body() addToCartDto: AddToCartDto,
  ): Promise<CartResponseDto> {
    console.log('addItem - userId recibido:', user._id);
    this.validateId(user._id, 'userId');

    if (!addToCartDto || Object.keys(addToCartDto).length === 0) {
      throw new BadRequestException(
        'El cuerpo de la solicitud no puede estar vacío',
      );
    }

    try {
      await this.cartService.addItem(user._id, addToCartDto);
      return await this.getCart(user);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException(
        'Error al agregar el ítem al carrito',
      );
    }
  }

  @Patch('update/:productId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Actualizar la cantidad de un ítem en el carrito' })
  @ApiParam({
    name: 'productId',
    description: 'ID del producto (UUID)',
    type: String,
  })
  @ApiBody({ type: UpdateCartDto })
  @ApiResponse({
    status: 200,
    description: 'Cantidad actualizada',
    type: CartResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o ID no válido',
  })
  @ApiResponse({ status: 404, description: 'Carrito o producto no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 500,
    description: 'Error al actualizar el ítem en el carrito',
  })
  async updateItem(
    @GetUser() user: User,
    @Param('productId') productId: string,
    @Body() updateCartDto: UpdateCartDto,
  ): Promise<CartResponseDto> {
    console.log('updateItem - userId recibido:', user._id);
    this.validateId(user._id, 'userId');
    console.log('updateItem - productId recibido:', productId);
    this.validateId(productId, 'productId');

    if (!updateCartDto || Object.keys(updateCartDto).length === 0) {
      throw new BadRequestException(
        'El cuerpo de la solicitud no puede estar vacío',
      );
    }

    try {
      await this.cartService.updateItem(user._id, productId, updateCartDto);
      return await this.getCart(user);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException(
        'Error al actualizar el ítem en el carrito',
      );
    }
  }

  @Delete('remove/:productId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Eliminar un ítem del carrito' })
  @ApiParam({
    name: 'productId',
    description: 'ID del producto (UUID)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Ítem eliminado',
    type: CartResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'ID no válido',
  })
  @ApiResponse({ status: 404, description: 'Carrito o producto no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 500,
    description: 'Error al eliminar el ítem del carrito',
  })
  async removeItem(
    @GetUser() user: User,
    @Param('productId') productId: string,
  ): Promise<CartResponseDto> {
    console.log('removeItem - userId recibido:', user._id);
    this.validateId(user._id, 'userId');
    console.log('removeItem - productId recibido:', productId);
    this.validateId(productId, 'productId');

    try {
      await this.cartService.removeItem(user._id, productId);
      return await this.getCart(user);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException(
        'Error al eliminar el ítem del carrito',
      );
    }
  }

  @Delete('clear')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Vaciar el carrito' })
  @ApiResponse({
    status: 200,
    description: 'Carrito vaciado',
    type: CartResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'ID de usuario no válido',
  })
  @ApiResponse({ status: 404, description: 'Carrito no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 500, description: 'Error al vaciar el carrito' })
  async clearCart(@GetUser() user: User): Promise<CartResponseDto> {
    console.log('clearCart - userId recibido:', user._id);
    this.validateId(user._id, 'userId');

    try {
      await this.cartService.clearCart(user._id);
      return await this.getCart(user);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Error al vaciar el carrito');
    }
  }

  @Post('checkout')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Iniciar el proceso de pago con Mercado Pago' })
  @ApiResponse({
    status: 201,
    description: 'URL de pago generada',
    type: Object,
  })
  @ApiResponse({
    status: 400,
    description:
      'Carrito vacío, stock insuficiente, información de envío incompleta o ID no válido',
  })
  @ApiResponse({ status: 404, description: 'Producto o usuario no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 500, description: 'Error al procesar el checkout' })
  async checkout(@GetUser() user: User) {
    console.log('checkout - userId recibido:', user._id);
    this.validateId(user._id, 'userId');

    try {
      const cart = await this.getCart(user);

      if (!cart.items || cart.items.length === 0) {
        throw new BadRequestException('El carrito está vacío');
      }

      for (const item of cart.items) {
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

      const cartItems = cart.items.map((item) => ({
        productId: item.productId,
        price: item.discountedSubtotal
          ? item.discountedSubtotal / item.quantity
          : item.unitPrice,
        quantity: item.quantity,
      }));

      const totalPrice = cart.discountedTotalPrice || cart.totalPrice;

      const externalReference = `${user._id}|${cartItems.map((item) => item.productId).join(',')}`;

      const preference = await this.mercadoPagoService.createPreference(
        cartItems,
        totalPrice,
        user._id,
        externalReference,
      );
      return { init_point: preference.init_point };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Error al procesar el checkout');
    }
  }

  @Post('checkout-selected')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary:
      'Iniciar el proceso de pago con Mercado Pago para productos seleccionados',
  })
  @ApiBody({ type: CheckoutDto })
  @ApiResponse({
    status: 201,
    description: 'Carrito con ítems seleccionados y URL de pago generada',
    type: Object,
  })
  @ApiResponse({
    status: 400,
    description:
      'Carrito vacío, ítems no válidos, stock insuficiente o ID no válido',
  })
  @ApiResponse({ status: 404, description: 'Producto o usuario no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 500,
    description: 'Error al procesar el checkout',
  })
  async checkoutSelected(
    @GetUser() user: User,
    @Body() CheckoutDto: CheckoutDto,
  ) {
    console.log('checkout-selected - userId recibido:', user._id);
    this.validateId(user._id, 'userId');

    try {
      const cart = await this.cartService.findOne(user._id);

      if (!cart.items || cart.items.length === 0) {
        throw new BadRequestException('El carrito está vacío');
      }

      const virtualCart = await this.cartService.createVirtualCart(
        user._id,
        CheckoutDto.selectedProductIds as string[],
      );

      const cartItems = virtualCart.items.map((item) => ({
        productId: item.productId,
        price: item.discountedSubtotal
          ? item.discountedSubtotal / item.quantity
          : item.unitPrice,
        quantity: item.quantity,
      }));

      const totalPrice =
        virtualCart.discountedTotalPrice || virtualCart.totalPrice;

      const externalReference = `${user._id}|${(CheckoutDto.selectedProductIds as string[]).join(',')}`;

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
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error al procesar el checkout de ítems seleccionados',
      );
    }
  }
}
