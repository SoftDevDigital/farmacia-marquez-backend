import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Role } from '../../common/enums/role.enum';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ type: String, default: () => require('uuid').v4() })
  _id: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: false }) // Hacer el campo password opcional
  password: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ type: String, enum: Role, default: Role.USER })
  role: Role;

  @Prop({
    type: {
      recipientName: String,
      phoneNumber: String,
      documentNumber: String,
      street: String,
      streetNumber: String,
      apartment: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
      additionalNotes: String,
    },
    default: {},
  })
  shippingInfo: {
    recipientName: string; // Nombre completo del destinatario
    phoneNumber: string; // Número de teléfono
    documentNumber: string; // Número de documento (DNI, CUIT, etc.)
    street: string; // Calle
    streetNumber: string; // Número de la calle
    apartment: string; // Departamento (opcional)
    city: string; // Ciudad
    state: string; // Estado o provincia
    postalCode: string; // Código postal
    country: string; // País
    additionalNotes: string; // Notas adicionales (por ejemplo, "Dejar en portería")
  };

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
