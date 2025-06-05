// cart.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { Cart, CartSchema } from './schemas/cart.schema';
import { ProductsModule } from '../products/products.module';
import { MercadoPagoModule } from '../payments/mercadopago/mercado-pago.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { UsersModule } from '../users/users.module'; // Añadido

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Cart.name, schema: CartSchema }]),
    ProductsModule,
    MercadoPagoModule,
    PromotionsModule,
    UsersModule, // Para inyectar UsersService
  ],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService], // Exportar CartService
})
export class CartModule {}
