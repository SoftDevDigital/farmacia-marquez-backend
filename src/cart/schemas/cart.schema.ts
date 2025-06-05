import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class CartItem {
  @Prop({ type: String, required: true })
  productId: string;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true })
  price: number;
}

@Schema({ timestamps: true, _id: false })
export class Cart extends Document {
  @Prop({ type: String, required: true, default: () => require('uuid').v4() })
  _id: string;

  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ type: [CartItem], default: [] })
  items: CartItem[];

  @Prop({ default: 0 })
  total: number;

  @Prop({ default: 'ARS' })
  currency: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const CartSchema = SchemaFactory.createForClass(Cart);
