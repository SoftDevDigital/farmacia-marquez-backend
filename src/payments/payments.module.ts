import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { MercadoPagoService } from './mercadopago/mercado-pago.service';
import { CartModule } from '../cart/cart.module';
import { ProductsModule } from '../products/products.module';
import { OrdersModule } from '../orders/orders.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    CartModule,
    ProductsModule,
    OrdersModule,
    AuthModule, // Importar AuthModule para proporcionar UserModel
  ],
  controllers: [PaymentsController],
  providers: [MercadoPagoService],
})
export class PaymentsModule {}
