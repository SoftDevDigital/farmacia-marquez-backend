// mercado-pago.module.ts
import { Module } from '@nestjs/common';
import { MercadoPagoService } from './mercado-pago.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [MercadoPagoService],
  exports: [MercadoPagoService],
})
export class MercadoPagoModule {}
