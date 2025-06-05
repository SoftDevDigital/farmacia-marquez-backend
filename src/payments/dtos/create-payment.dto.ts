import {
  IsString,
  IsNumber,
  IsEnum,
  IsUUID,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  CASH = 'cash',
}

export class CreatePaymentDto {
  @IsUUID()
  orderId: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod; // Opcional, ya que Checkout Pro maneja los métodos de pago

  @IsString()
  @IsOptional()
  cardToken?: string; // No se necesita para Checkout Pro

  @IsNumber()
  @Min(1)
  @Max(12)
  @IsOptional()
  installments?: number; // No se necesita para Checkout Pro
}
