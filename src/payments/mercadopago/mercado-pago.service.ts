import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

@Injectable()
export class MercadoPagoService {
  private client: MercadoPagoConfig;

  constructor(private configService: ConfigService) {
    const accessToken =
      process.env.MERCADOPAGO_ACCESS_TOKEN ||
      this.configService.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken || accessToken.trim() === '') {
      throw new InternalServerErrorException(
        'MERCADO_PAGO_ACCESS_TOKEN no está definido o está vacío en el archivo .env',
      );
    }

    try {
      this.client = new MercadoPagoConfig({
        accessToken,
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Error al inicializar el cliente de Mercado Pago: configuración inválida',
      );
    }
  }

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

  async createPreference(
    cartItems: {
      productId: string;
      price: number;
      quantity: number;
    }[],
    cartTotal: number,
    userId: string,
    externalReference: string,
  ): Promise<any> {
    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      throw new BadRequestException(
        'Los ítems del carrito deben ser un arreglo no vacío',
      );
    }

    for (const item of cartItems) {
      this.validateId(item.productId, 'productId');
      this.validateNumber(item.price, 'precio', true);
      this.validateNumber(item.quantity, 'cantidad');
    }

    this.validateNumber(cartTotal, 'total del carrito', true);
    this.validateId(userId, 'userId');

    const preference = new Preference(this.client);

    const preferenceData = {
      items: cartItems.map((item) => ({
        id: item.productId,
        title: item.productId,
        unit_price: item.price,
        quantity: item.quantity,
      })),
      back_urls: {
        success: `${process.env.BACKEND_URL}/payments/success`,
        failure: `${process.env.BACKEND_URL}/payments/failure`,
        pending: `${process.env.BACKEND_URL}/payments/pending`,
      },
      auto_return: 'approved',
      external_reference: externalReference,
      transaction_amount: cartTotal,
    };

    try {
      const response = await preference.create({ body: preferenceData });
      if (!response || !response.init_point) {
        throw new InternalServerErrorException(
          'Respuesta inválida de Mercado Pago al crear la preferencia',
        );
      }
      return response;
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al crear preferencia de Mercado Pago: ${(error as Error).message || error}`,
      );
    }
  }

  async getPaymentStatus(paymentId: string): Promise<any> {
    if (!paymentId || paymentId.trim() === '') {
      throw new BadRequestException('El paymentId no puede estar vacío');
    }

    const payment = new Payment(this.client);

    try {
      const paymentStatus = await payment.get({ id: paymentId });
      return paymentStatus;
    } catch (error: unknown) {
      if ((error as { status?: number }).status === 404) {
        throw new NotFoundException(`Pago no encontrado: ${paymentId}`);
      }
      throw new InternalServerErrorException(
        `Error al obtener el estado del pago: ${error}`,
      );
    }
  }
}
