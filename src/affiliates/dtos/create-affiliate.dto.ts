import {
  IsString,
  IsDateString,
  IsObject,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddressDto {
  @ApiProperty({
    description: 'Calle de la dirección',
    example: 'Av. Corrientes',
    required: true,
  })
  @IsString()
  street: string;

  @ApiProperty({
    description: 'Número de la calle',
    example: '1234',
    required: true,
  })
  @IsString()
  streetNumber: string;

  @ApiProperty({
    description: 'Departamento o piso (opcional)',
    example: '2A',
    required: false,
  })
  @IsOptional()
  @IsString()
  apartment?: string;

  @ApiProperty({
    description: 'Ciudad',
    example: 'Buenos Aires',
    required: true,
  })
  @IsString()
  city: string;

  @ApiProperty({
    description: 'Provincia',
    example: 'Buenos Aires',
    required: true,
  })
  @IsString()
  state: string;

  @ApiProperty({
    description: 'Código postal',
    example: 'C1000',
    required: true,
  })
  @IsString()
  postalCode: string;

  @ApiProperty({
    description: 'País',
    example: 'Argentina',
    required: true,
  })
  @IsString()
  country: string;
}

export class HealthInsuranceDto {
  @ApiProperty({
    description: 'Nombre de la obra social',
    example: 'OSDE',
    required: true,
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Número de afiliado a la obra social',
    example: '123456789',
    required: true,
  })
  @IsString()
  affiliateNumber: string;

  @ApiProperty({
    description: 'Plan de la obra social (opcional)',
    example: 'OSDE 210',
    required: false,
  })
  @IsOptional()
  @IsString()
  plan?: string;
}

export class CreateAffiliateDto {
  @ApiProperty({
    description: 'Nombre del afiliado',
    example: 'Juan',
    required: true,
  })
  @IsString()
  firstName: string;

  @ApiProperty({
    description: 'Apellido del afiliado',
    example: 'Pérez',
    required: true,
  })
  @IsString()
  lastName: string;

  @ApiProperty({
    description: 'DNI del afiliado',
    example: '12345678',
    required: true,
  })
  @IsString()
  dni: string;

  @ApiProperty({
    description: 'Fecha de nacimiento del afiliado',
    example: '1990-01-01',
    required: true,
  })
  @IsDateString()
  birthDate: string;

  @ApiProperty({
    description: 'Género del afiliado',
    example: 'Masculino',
    required: true,
  })
  @IsString()
  gender: string;

  @ApiProperty({
    description: 'Número de teléfono del afiliado',
    example: '+541123456789',
    required: true,
  })
  @IsString()
  phoneNumber: string;

  @ApiProperty({
    description: 'Correo electrónico del afiliado',
    example: 'juan.perez@example.com',
    required: true,
  })
  @IsString()
  email: string;

  @ApiProperty({
    description: 'Dirección del afiliado',
    required: true,
    type: AddressDto,
  })
  @IsObject()
  address: AddressDto;

  @ApiProperty({
    description: 'Información de la obra social del afiliado',
    required: true,
    type: HealthInsuranceDto,
  })
  @IsObject()
  healthInsurance: HealthInsuranceDto;

  @ApiProperty({
    description: 'Estado del afiliado (activo/inactivo)',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
