import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class OrderItem {
  @Prop({ required: true })
  productId: string;

  @Prop({ required: true })
  name: string; // Nuevo campo para el nombre del producto

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  price: number;
}

@Schema({ timestamps: true })
export class Order extends Document {
  @Prop({ type: String, default: () => require('uuid').v4() })
  _id: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  total: number;

  @Prop({
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
  })
  status: string;

  @Prop({ type: [OrderItem], default: [] })
  items: OrderItem[];

  @Prop({
    type: {
      recipientName: { type: String, required: true },
      phoneNumber: { type: String, required: true },
      documentNumber: { type: String, required: true },
      street: { type: String, required: true },
      streetNumber: { type: String, required: true },
      apartment: { type: String },
      city: { type: String, required: true },
      state: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
      additionalNotes: { type: String },
    },
    required: true,
  })
  shippingAddress: {
    recipientName: string;
    phoneNumber: string;
    documentNumber: string;
    street: string;
    streetNumber: string;
    apartment: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    additionalNotes: string;
  };
}

export const OrderSchema = SchemaFactory.createForClass(Order);
