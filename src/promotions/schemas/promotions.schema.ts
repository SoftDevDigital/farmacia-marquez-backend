import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum PromotionType {
  NXN = 'NXN',
  PERCENT_SECOND = 'PERCENT_SECOND',
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
  BUNDLE = 'BUNDLE',
}

@Schema({ timestamps: true, _id: false }) // Desactivar el _id automático de Mongoose
export class Promotion extends Document {
  @Prop({ type: String, required: true }) // Definir _id como String
  _id: string;

  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop({ required: true, enum: PromotionType })
  type: PromotionType;

  @Prop({ default: 0 })
  buyQuantity: number; // Para NXN (compra N, obtén X gratis)

  @Prop({ default: 0 })
  getQuantity: number; // Para NXN (obtén X gratis)

  @Prop({ default: 0, min: 0, max: 100 })
  discountPercentage: number; // Para PERCENTAGE y PERCENT_SECOND

  @Prop({ default: 0, min: 0 })
  discountAmount: number; // Para FIXED

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop()
  imageUrl: string;

  @Prop({ type: [String], required: true })
  productIds: string[];

  @Prop({ default: true })
  isActive: boolean;
}

export const PromotionSchema = SchemaFactory.createForClass(Promotion);

// Desactivar el uso de ObjectId para _id
PromotionSchema.set('id', false);
PromotionSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});
