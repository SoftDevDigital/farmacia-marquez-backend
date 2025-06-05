import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order, OrderSchema } from './schemas/orders.schema';
import { ProductsModule } from '../products/products.module';
import { CartModule } from '../cart/cart.module';
import { UsersModule } from '../users/users.module'; // Añadido

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    ProductsModule,
    CartModule, // Para inyectar CartService
    UsersModule, // Para inyectar UsersService
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
