import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, _id: false }) // Desactivar _id automático
export class Product extends Document {
  @Prop({ type: String, required: true, default: () => require('uuid').v4() }) // Usar UUID como _id
  _id: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  price: number;

  @Prop({ default: 0 })
  discount?: number;

  @Prop({ required: true, min: 0 })
  stock: number;

  @Prop()
  imageUrl?: string;

  @Prop({ type: String, required: true }) // Referencia como String (UUID)
  categoryId?: string;

  @Prop({ type: String })
  subcategoryId?: string;

  @Prop({ type: String, required: true }) // Referencia como String (UUID)
  brandId?: string;

  @Prop({ default: false })
  isFeatured?: boolean;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
