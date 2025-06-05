import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Subcategory {
  @Prop({ type: String, default: () => require('uuid').v4() })
  _id: string;

  @Prop({ required: true })
  name: string;
}

@Schema({ timestamps: true })
export class Category extends Document {
  @Prop({ type: String, default: () => require('uuid').v4() })
  _id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ type: [Subcategory], default: [] })
  subcategories: Subcategory[];

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
