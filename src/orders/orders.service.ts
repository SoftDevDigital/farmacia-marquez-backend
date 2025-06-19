import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order } from './schemas/orders.schema';
import { CartService } from '../cart/cart.service';
import { CreateOrderDto } from './dtos/create-order.dto';
import { UsersService } from '../users/users.service';
import { PromotionsService } from '../promotions/promotions.service';
import { User } from '../auth/schemas/users.schema';
import { Product } from '../products/schemas/products.schema';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    private cartService: CartService,
    private usersService: UsersService,
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

  async findAll(userId: string): Promise<Order[]> {
    this.validateId(userId, 'userId');

    try {
      return await this.orderModel.find({ userId }).exec();
    } catch (error: unknown) {
      if ((error as Error).name === 'CastError') {
        throw new BadRequestException(
          'El userId no tiene un formato válido (debe ser un UUID)',
        );
      }
      throw new InternalServerErrorException('Error al obtener los pedidos');
    }
  }

  async findOne(id: string, userId: string): Promise<Order> {
    this.validateId(id, 'id');
    console.log('findOne - userId recibido:', userId);
    this.validateId(userId, 'userId');

    try {
      const order = await this.orderModel.findOne({ _id: id, userId }).exec();
      if (!order) {
        throw new NotFoundException('Pedido no encontrado');
      }
      return order;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if ((error as Error).name === 'CastError') {
        throw new BadRequestException(
          'El id o userId no tiene un formato válido (debe ser un UUID)',
        );
      }
      throw new InternalServerErrorException('Error al buscar el pedido');
    }
  }

  async create(userId: string, createOrderDto: CreateOrderDto): Promise<Order> {
    this.validateId(userId, 'userId');

    if (!createOrderDto || Object.keys(createOrderDto).length === 0) {
      throw new BadRequestException(
        'El cuerpo de la solicitud no puede estar vacío',
      );
    }

    const { items, total, status } = createOrderDto;

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('Los ítems deben ser un arreglo no vacío');
    }
    this.validateNumber(total, 'total');
    if (
      status &&
      !['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(
        status,
      )
    ) {
      throw new BadRequestException(
        'El estado debe ser uno de: pending, processing, shipped, delivered, cancelled',
      );
    }

    for (const item of items) {
      console.log('create - productId recibido:', item.productId);
      this.validateId(item.productId, 'productId');
      this.validateNumber(item.quantity, 'quantity');
      this.validateNumber(item.price, 'price');
    }

    try {
      const user = await this.usersService.findOne(userId);
      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      const order = new this.orderModel({
        userId,
        items,
        total,
        status: status || 'pending',
        shippingAddress: user.shippingInfo || {
          recipientName: '',
          phoneNumber: '',
          documentNumber: '',
          street: '',
          streetNumber: '',
          apartment: '',
          city: '',
          state: '',
          postalCode: '',
          country: '',
          additionalNotes: '',
        },
      });

      return await order.save();
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      if ((error as Error).name === 'CastError') {
        throw new BadRequestException(
          'El userId no tiene un formato válido (debe ser un UUID)',
        );
      }
      throw new InternalServerErrorException('Error al crear el pedido');
    }
  }

  async createFromCart(
    userId: string,
    selectedProductIds?: string[],
  ): Promise<{ order: Order; removedItems?: string[] }> {
    console.log('Iniciando createFromCart', { userId, selectedProductIds });

    this.validateId(userId, 'userId');
    console.log('userId validado correctamente:', userId);

    // Validar selectedProductIds como UUIDs
    if (selectedProductIds) {
      for (const productId of selectedProductIds) {
        this.validateId(productId, 'productId');
      }
    }

    try {
      console.log('Buscando carrito para userId:', userId);
      const cart = await this.cartService.findOne(userId);

      if (!cart.items || cart.items.length === 0) {
        throw new NotFoundException('El carrito está vacío');
      }
      const user = await this.usersService.findOne(userId);
      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      const requiredShippingFields = [
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
      const missingFields = requiredShippingFields.filter(
        (field) =>
          !user.shippingInfo[field] || user.shippingInfo[field].trim() === '',
      );
      if (missingFields.length > 0) {
        console.log('Falta información de envío:', missingFields);
        throw new BadRequestException(
          `Falta información de envío requerida: ${missingFields.join(', ')}`,
        );
      }

      // Filtrar ítems según selectedProductIds
      const filteredItems =
        selectedProductIds && selectedProductIds.length > 0
          ? cart.items.filter((item) =>
              selectedProductIds.includes(item.productId),
            )
          : cart.items;

      if (filteredItems.length === 0) {
        throw new BadRequestException('Ningún producto seleccionado es válido');
      }

      // Enriquecer ítems y aplicar descuentos
      const orderItems = await Promise.all(
        filteredItems.map(async (item) => {
          const product = await this.productModel
            .findOne({ _id: item.productId })
            .exec();
          if (!product) {
            throw new NotFoundException(
              `Producto no encontrado: ${item.productId}`,
            );
          }

          if (item.unitPrice !== product.price) {
            item.unitPrice = product.price; // Actualizar al precio actual
          }

          return {
            productId: item.productId,
            name: product.name,
            quantity: item.quantity,
            price: item.unitPrice,
          };
        }),
      );

      // Calcular descuentos usando PromotionsService
      const { itemsWithDiscount, totalDiscount } =
        await this.promotionsService.calculateDiscountForCartItems(
          orderItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.price,
          })),
        );
      console.log('Descuentos calculados:', {
        itemsWithDiscount,
        totalDiscount,
      });

      // Preparar orderItems con descuentos aplicados
      const finalOrderItems = itemsWithDiscount.map((item) => ({
        productId: item.productId,
        name:
          orderItems.find((oi) => oi.productId === item.productId)?.name || '',
        quantity: item.quantity,
        price: item.discountedSubtotal
          ? item.discountedSubtotal / item.quantity
          : item.unitPrice,
      }));

      // Calcular el total final
      const total = finalOrderItems.reduce(
        (sum, item) => sum + item.quantity * item.price,
        0,
      );
      console.log('Total calculado:', { total });

      const order = new this.orderModel({
        userId,
        items: finalOrderItems,
        total,
        status: 'pending',
        shippingAddress: user.shippingInfo,
      });

      await order.save();
      console.log('Orden guardada en la base de datos:', {
        orderId: order._id,
      });

      return { order };
    } catch (error: unknown) {
      console.error('Error en createFromCart:', {
        errorName: (error as Error).name,
        errorMessage: (error as Error).message,
        stack: (error as Error).stack,
      });

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      if ((error as Error).name === 'CastError') {
        console.log('CastError detectado, userId no válido:', userId);
        throw new BadRequestException(
          'El userId no tiene un formato válido (debe ser un UUID)',
        );
      }
      throw new InternalServerErrorException(
        'Error al crear el pedido desde el carrito',
      );
    }
  }

  async update(id: string, userId: string, updateData: any): Promise<Order> {
    console.log('update - id recibido:', id);
    this.validateId(id, 'id');
    console.log('update - userId recibido:', userId);
    this.validateId(userId, 'userId');

    if (!updateData || Object.keys(updateData).length === 0) {
      throw new BadRequestException(
        'El cuerpo de la solicitud no puede estar vacío',
      );
    }

    if (
      updateData.status &&
      !['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(
        updateData.status,
      )
    ) {
      throw new BadRequestException(
        'El estado debe ser uno de: pending, processing, shipped, delivered, cancelled',
      );
    }

    try {
      const order = await this.orderModel
        .findOneAndUpdate(
          { _id: id, userId },
          { $set: updateData },
          { new: true },
        )
        .exec();
      if (!order) {
        throw new NotFoundException('Pedido no encontrado');
      }
      return order;
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      if ((error as Error).name === 'CastError') {
        throw new BadRequestException(
          'El id o userId no tiene un formato válido (debe ser un UUID)',
        );
      }
      throw new InternalServerErrorException('Error al actualizar el pedido');
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    console.log('remove - id recibido:', id);
    this.validateId(id, 'id');
    console.log('remove - userId recibido:', userId);
    this.validateId(userId, 'userId');

    try {
      const result = await this.orderModel
        .deleteOne({ _id: id, userId })
        .exec();
      if (result.deletedCount === 0) {
        throw new NotFoundException('Pedido no encontrado');
      }
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      if ((error as Error).name === 'CastError') {
        throw new BadRequestException(
          'El id o userId no tiene un formato válido (debe ser un UUID)',
        );
      }
      throw new InternalServerErrorException('Error al eliminar el pedido');
    }
  }
}
