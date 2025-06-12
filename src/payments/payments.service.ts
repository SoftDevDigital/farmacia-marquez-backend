import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import mercadopagoClient from '../common/config/mercadopago.config';
import { Preference } from 'mercadopago';
import { CreatePaymentDto } from './dtos/create-payment.dto';
import { OrdersService } from '../orders/orders.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class PaymentsService {
  private preference: Preference;

  constructor(
    private ordersService: OrdersService,
    private usersService: UsersService,
  ) {
    try {
      this.preference = new Preference(mercadopagoClient);
    } catch (error) {
      throw new InternalServerErrorException(
        'Error al inicializar el cliente de Mercado Pago: configuración inválida',
      );
    }
  }

  // Función auxiliar para validar IDs como UUIDs
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

  // Función auxiliar para validar cantidades y precios
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

  async processPayment(
    userId: string,
    createPaymentDto: CreatePaymentDto,
  ): Promise<any> {
    // Validar userId
    this.validateId(userId, 'userId');

    // Validar que createPaymentDto no sea nulo o vacío
    if (!createPaymentDto || Object.keys(createPaymentDto).length === 0) {
      throw new BadRequestException(
        'El cuerpo de la solicitud no puede estar vacío',
      );
    }

    const { orderId, amount } = createPaymentDto;

    // Validar los campos de createPaymentDto
    this.validateId(orderId, 'orderId');
    this.validateNumber(amount, 'amount');

    try {
      // Verificar que el pedido exista y pertenezca al usuario
      const order = await this.ordersService.findOne(orderId, userId);
      if (order.status !== 'pending') {
        throw new BadRequestException('El pedido no está en estado pendiente');
      }

      // Obtener el email del usuario
      const userEmail = await this.usersService.findEmailById(userId);
      if (!userEmail) {
        throw new NotFoundException('No se pudo obtener el email del usuario');
      }

      // Crear una preferencia de pago con Checkout Pro
      const preferenceData = {
        items: [
          {
            id: orderId, // Usamos el orderId como identificador único del ítem
            title: `Pago del pedido ${orderId}`,
            unit_price: amount,
            quantity: 1,
          },
        ],
        payer: {
          email: userEmail,
        },
        back_urls: {
          success: `${process.env.BACKEND_URL}/payments/success`,
          failure: `${process.env.BACKEND_URL}/payments/failure`,
          pending: `${process.env.BACKEND_URL}/payments/pending`,
        },
        auto_return: 'approved',
        external_reference: orderId, // Usamos el orderId como referencia para identificar el pago
      };

      const preferenceResponse = await this.preference.create({
        body: preferenceData,
      });
      return {
        status: 'pending',
        paymentUrl: preferenceResponse.init_point, // Enlace de Checkout Pro
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al generar el enlace de pago: ${error}`,
      );
    }
  }

  async handlePaymentCallback(
    paymentId: string,
    status: string,
    externalReference: string,
  ): Promise<void> {
    // Validar que los parámetros no estén vacíos
    if (!paymentId || paymentId.trim() === '') {
      throw new BadRequestException('El paymentId no puede estar vacío');
    }
    if (!status || status.trim() === '') {
      throw new BadRequestException('El status no puede estar vacío');
    }
    if (!externalReference || externalReference.trim() === '') {
      throw new BadRequestException(
        'El externalReference no puede estar vacío',
      );
    }

    // Validar que externalReference (orderId) sea un UUID válido
    const orderId = externalReference;
    this.validateId(orderId, 'orderId');

    // Validar que status sea un valor esperado
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      throw new BadRequestException(
        'El status debe ser uno de: approved, rejected, pending',
      );
    }

    try {
      // Obtener el pedido para extraer el userId
      const order = await this.ordersService.findOne(orderId, '');
      const userId = order.userId;
      if (!userId) {
        throw new BadRequestException(
          'No se pudo obtener el userId del pedido',
        );
      }

      // Validar que userId sea un UUID válido
      this.validateId(userId, 'userId');

      if (status === 'approved') {
        await this.ordersService.update(orderId, userId, {
          status: 'processing',
        });
      } else if (status === 'rejected') {
        await this.ordersService.update(orderId, userId, {
          status: 'cancelled',
        });
      }
      // Si el estado es 'pending', no hacemos nada, ya que el pedido ya está en estado 'pending'
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error al procesar el callback de pago',
      );
    }
  }
}
