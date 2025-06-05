import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Affiliate extends Document {
  @Prop({ type: String, default: () => require('uuid').v4() })
  _id: string;

  @Prop({ required: true })
  firstName: string; // Nombre

  @Prop({ required: true })
  lastName: string; // Apellido

  @Prop({ required: true, unique: true })
  dni: string; // DNI (Documento Nacional de Identidad)

  @Prop({ required: true })
  birthDate: Date; // Fecha de nacimiento

  @Prop({ required: true })
  gender: string; // Género (por ejemplo, "Masculino", "Femenino", "Otro")

  @Prop({ required: true })
  phoneNumber: string; // Número de teléfono

  @Prop({ required: true })
  email: string; // Correo electrónico

  @Prop({
    type: {
      street: { type: String, required: true },
      streetNumber: { type: String, required: true },
      apartment: { type: String },
      city: { type: String, required: true },
      state: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true, default: 'Argentina' },
    },
    required: true,
  })
  address: {
    street: string; // Calle
    streetNumber: string; // Número de la calle
    apartment: string; // Departamento (opcional)
    city: string; // Ciudad
    state: string; // Provincia
    postalCode: string; // Código postal
    country: string; // País (por defecto Argentina)
  };

  @Prop({
    type: {
      name: { type: String, required: true },
      affiliateNumber: { type: String, required: true },
      plan: { type: String },
    },
    required: true,
  })
  healthInsurance: {
    name: string; // Nombre de la obra social (por ejemplo, "OSDE", "Swiss Medical", "PAMI")
    affiliateNumber: string; // Número de afiliado a la obra social
    plan: string; // Plan de la obra social (opcional, por ejemplo, "OSDE 210")
  };

  @Prop({ default: true })
  isActive: boolean; // Estado del afiliado (activo/inactivo)

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const AffiliateSchema = SchemaFactory.createForClass(Affiliate);
