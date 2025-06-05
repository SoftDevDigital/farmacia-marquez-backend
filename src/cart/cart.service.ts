import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart } from './schemas/cart.schema';
import { Product } from '../products/schemas/products.schema';
import { AddToCartDto } from './dtos/add-to-cart.dto';
import { UpdateCartDto } from './dtos/update-cart.dto';
import { CartResponseDto, CartItemResponseDto } from './dtos/cart-response.dto';
import { UsersService } from '../users/users.service';
import { MercadoPagoService } from '../payments/mercadopago/mercado-pago.service';
import { PromotionsService } from '../promotions/promotions.service';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private cartModel: Model<Cart>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    private usersService: UsersService,
    private mercadoPagoService: MercadoPagoService,
    private promotionsService: PromotionsService,
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

  private validateQuantity(
    quantity: number,
    fieldName: string = 'cantidad',
  ): void {
    if (typeof quantity !== 'number' || quantity <= 0) {
      throw new BadRequestException(
        `La ${fieldName} debe ser un número positivo`,
      );
    }
  }

  async findOne(userId: string): Promise<CartResponseDto> {
    this.validateId(userId, 'userId');

    try {
      const cart = await this.cartModel.findOne({ userId }).exec();
      if (!cart) {
        throw new NotFoundException('Carrito no encontrado');
      }

      const items: CartItemResponseDto[] = [];
      let totalItems = 0;
      let totalPrice = 0;
      const stockIssues: {
        productId: string;
        name: string;
        available: number;
        requested: number;
      }[] = [];

      // Actualizar precios de los ítems en el carrito
      for (const item of cart.items) {
        try {
          const product = await this.productModel
            .findOne({ _id: item.productId })
            .exec();
          if (!product) {
            continue;
          }

          // Actualizar el precio del ítem en el carrito con el precio actual del producto
          item.price = product.price;

          const subtotal = item.quantity * item.price;
          totalItems += item.quantity;
          totalPrice += subtotal;

          if (product.stock < item.quantity) {
            stockIssues.push({
              productId: item.productId,
              name: product.name,
              available: product.stock,
              requested: item.quantity,
            });
          }

          items.push({
            productId: item.productId,
            name: product.name,
            quantity: item.quantity,
            unitPrice: item.price,
            subtotal: subtotal,
          });
        } catch (error) {
          continue;
        }
      }

      // Actualizar el total del carrito y guardarlo en la base de datos
      cart.total = totalPrice;
      await cart.save();

      return {
        cartId: cart._id,
        userId: cart.userId,
        items,
        totalItems,
        totalPrice,
        currency: cart.currency || 'ARS',
        createdAt: cart.createdAt.toISOString(),
        updatedAt: cart.updatedAt.toISOString(),
        stockIssues: stockIssues.length > 0 ? stockIssues : undefined,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al obtener el carrito');
    }
  }

  async createVirtualCart(
    userId: string,
    selectedProductIds: string[],
  ): Promise<CartResponseDto> {
    this.validateId(userId, 'userId');
    for (const productId of selectedProductIds) {
      this.validateId(productId, 'productId');
    }

    try {
      const cart = await this.cartModel.findOne({ userId }).exec();
      if (!cart) {
        throw new NotFoundException('Carrito no encontrado');
      }

      const selectedItems = cart.items.filter((item) =>
        selectedProductIds.includes(item.productId),
      );

      if (selectedItems.length === 0) {
        throw new BadRequestException(
          'Ningún producto seleccionado está en el carrito',
        );
      }

      const items: CartItemResponseDto[] = [];
      let totalItems = 0;
      let totalPrice = 0;
      const stockIssues: {
        productId: string;
        name: string;
        available: number;
        requested: number;
      }[] = [];

      for (const item of selectedItems) {
        const product = await this.productModel
          .findOne({ _id: item.productId })
          .exec();
        if (!product) {
          throw new NotFoundException(
            `Producto no encontrado: ${item.productId}`,
          );
        }

        // Actualizar el precio del ítem con el precio actual del producto
        item.price = product.price;

        const subtotal = item.quantity * item.price;
        totalItems += item.quantity;
        totalPrice += subtotal;

        if (product.stock < item.quantity) {
          stockIssues.push({
            productId: item.productId,
            name: product.name,
            available: product.stock,
            requested: item.quantity,
          });
        }

        items.push({
          productId: item.productId,
          name: product.name,
          quantity: item.quantity,
          unitPrice: item.price,
          subtotal: subtotal,
        });
      }

      if (items.length === 0) {
        throw new BadRequestException(
          'No se encontraron productos válidos para los IDs seleccionados',
        );
      }

      // Guardar los precios actualizados en el carrito original
      await cart.save();

      let virtualCart: CartResponseDto = {
        cartId: cart._id,
        userId: cart.userId,
        items,
        totalItems,
        totalPrice,
        currency: cart.currency || 'ARS',
        createdAt: cart.createdAt.toISOString(),
        updatedAt: cart.updatedAt.toISOString(),
        stockIssues: stockIssues.length > 0 ? stockIssues : undefined,
      };

      try {
        const { itemsWithDiscount, totalDiscount } =
          await this.promotionsService.calculateDiscountForCartItems(
            items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice, // Ahora usa el precio actualizado
            })),
          );

        const discountedTotalPrice = totalPrice - totalDiscount;

        virtualCart = {
          ...virtualCart,
          items: itemsWithDiscount,
          totalDiscount: totalDiscount > 0 ? totalDiscount : undefined,
          discountedTotalPrice:
            discountedTotalPrice > 0 ? discountedTotalPrice : undefined,
        };
      } catch (error) {
        // Si falla el cálculo de descuentos, devolver sin descuentos
      }

      return virtualCart;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error al crear el carrito virtual',
      );
    }
  }

  async addItem(userId: string, addToCartDto: AddToCartDto): Promise<Cart> {
    this.validateId(userId, 'userId');
    this.validateId(addToCartDto.productId, 'productId');
    this.validateQuantity(addToCartDto.quantity);

    try {
      const product = await this.productModel
        .findOne({ _id: addToCartDto.productId })
        .exec();
      if (!product) {
        throw new NotFoundException('Producto no encontrado');
      }
      if (product.stock < addToCartDto.quantity) {
        throw new ConflictException(
          `Stock insuficiente. Disponible: ${product.stock}`,
        );
      }

      let cart = await this.cartModel.findOne({ userId }).exec();
      if (!cart) {
        cart = new this.cartModel({ userId, items: [], total: 0 });
      }

      const existingItem = cart.items.find(
        (item) => item.productId === addToCartDto.productId,
      );
      if (existingItem) {
        existingItem.quantity += addToCartDto.quantity;
      } else {
        cart.items.push({
          productId: addToCartDto.productId,
          quantity: addToCartDto.quantity,
          price: product.price,
        });
      }

      cart.total = cart.items.reduce(
        (sum, item) => sum + item.quantity * item.price,
        0,
      );

      return await cart.save();
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      if ((error as Error).name === 'CastError') {
        throw new BadRequestException(
          'ID de usuario o producto no válido (debe ser un UUID)',
        );
      }
      throw new InternalServerErrorException(
        'Error al agregar el ítem al carrito',
      );
    }
  }

  async updateItem(
    userId: string,
    productId: string,
    updateCartDto: UpdateCartDto,
  ): Promise<Cart> {
    this.validateId(userId, 'userId');
    this.validateId(productId, 'productId');
    this.validateQuantity(updateCartDto.quantity);

    try {
      const cart = await this.cartModel.findOne({ userId }).exec();
      if (!cart) {
        throw new NotFoundException('Carrito no encontrado');
      }

      const item = cart.items.find((item) => item.productId === productId);
      if (!item) {
        throw new NotFoundException('Producto no encontrado en el carrito');
      }

      const product = await this.productModel
        .findOne({ _id: productId })
        .exec();
      if (!product) {
        throw new NotFoundException('Producto no encontrado');
      }
      if (product.stock < updateCartDto.quantity) {
        throw new ConflictException(
          `Stock insuficiente. Disponible: ${product.stock}`,
        );
      }

      item.quantity = updateCartDto.quantity;
      item.price = product.price; // Actualizar el precio al modificar la cantidad
      cart.total = cart.items.reduce(
        (sum, item) => sum + item.quantity * item.price,
        0,
      );

      return await cart.save();
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      if ((error as Error).name === 'CastError') {
        throw new BadRequestException(
          'ID de usuario o producto no válido (debe ser un UUID)',
        );
      }
      throw new InternalServerErrorException(
        'Error al actualizar el ítem en el carrito',
      );
    }
  }

  async removeItem(userId: string, productId: string): Promise<Cart> {
    this.validateId(userId, 'userId');
    this.validateId(productId, 'productId');

    try {
      const cart = await this.cartModel.findOne({ userId }).exec();
      if (!cart) {
        throw new NotFoundException('Carrito no encontrado');
      }

      const itemIndex = cart.items.findIndex(
        (item) => item.productId === productId,
      );
      if (itemIndex === -1) {
        throw new NotFoundException('Producto no encontrado en el carrito');
      }

      cart.items.splice(itemIndex, 1);
      cart.total = cart.items.reduce(
        (sum, item) => sum + item.quantity * item.price,
        0,
      );

      return await cart.save();
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      if ((error as Error).name === 'CastError') {
        throw new BadRequestException(
          'ID de usuario o producto no válido (debe ser un UUID)',
        );
      }
      throw new InternalServerErrorException(
        'Error al eliminar el ítem del carrito',
      );
    }
  }

  async clearCart(userId: string, productIds?: string[]): Promise<Cart> {
    this.validateId(userId, 'userId');
    if (productIds) {
      for (const productId of productIds) {
        this.validateId(productId, 'productId');
      }
    }

    try {
      const cart = await this.cartModel.findOne({ userId }).exec();
      if (!cart) {
        throw new NotFoundException('Carrito no encontrado');
      }

      if (productIds && productIds.length > 0) {
        cart.items = cart.items.filter(
          (item) => !productIds.includes(item.productId),
        );
      } else {
        cart.items = [];
      }

      cart.total = cart.items.reduce(
        (sum, item) => sum + item.quantity * item.price,
        0,
      );

      return await cart.save();
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      if ((error as Error).name === 'CastError') {
        throw new BadRequestException(
          'ID de usuario no válido (debe ser un UUID)',
        );
      }
      throw new InternalServerErrorException('Error al limpiar el carrito');
    }
  }

  async checkout(userId: string): Promise<any> {
    this.validateId(userId, 'userId');

    try {
      const cart = await this.findOne(userId);
      if (!cart.items || cart.items.length === 0) {
        throw new NotFoundException('El carrito está vacío');
      }

      const user = await this.usersService.findOne(userId);
      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      const requiredFields = [
        'recipientName',
        'phoneNumber',
        'documentNumber',
        'street',
        'streetNumber',
        'city',
        'state',
        'postalCode',
        'country',
      ];
      const missingFields = requiredFields.filter(
        (field) => !user.shippingInfo[field],
      );
      if (missingFields.length > 0) {
        throw new BadRequestException(
          `Falta información de envío requerida: ${missingFields.join(', ')}`,
        );
      }

      for (const item of cart.items) {
        const product = await this.productModel
          .findOne({ _id: item.productId })
          .exec();
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

      // Generar externalReference similar a PaymentsController
      const selectedProductIds = cart.items.map((item) => item.productId);
      const externalReference = `${userId}|${selectedProductIds.join(',')}`;

      const preference = await this.mercadoPagoService.createPreference(
        cart.items.map((item) => ({
          productId: item.productId,
          name: item.name,
          price: item.unitPrice,
          quantity: item.quantity,
        })),
        cart.totalPrice,
        userId,
        externalReference, // Añadir el argumento externalReference
      );

      return preference;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Error al procesar el checkout');
    }
  }
}
