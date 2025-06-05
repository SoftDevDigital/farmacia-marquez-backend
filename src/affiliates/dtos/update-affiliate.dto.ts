import {
  IsString,
  IsDateString,
  IsObject,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AddressDto, HealthInsuranceDto } from './create-affiliate.dto';

export class UpdateAffiliateDto {
  @ApiProperty({
    description: 'Nombre del afiliado',
    example: 'Juan',
    required: false,
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({
    description: 'Apellido del afiliado',
    example: 'Pérez',
    required: false,
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({
    description: 'DNI del afiliado',
    example: '12345678',
    required: false,
  })
  @IsOptional()
  @IsString()
  dni?: string;

  @ApiProperty({
    description: 'Fecha de nacimiento del afiliado',
    example: '1990-01-01',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiProperty({
    description: 'Género del afiliado',
    example: 'Masculino',
    required: false,
  })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiProperty({
    description: 'Número de teléfono del afiliado',
    example: '+541123456789',
    required: false,
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({
    description: 'Correo electrónico del afiliado',
    example: 'juan.perez@example.com',
    required: false,
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({
    description: 'Dirección del afiliado',
    required: false,
    type: AddressDto,
  })
  @IsOptional()
  @IsObject()
  address?: AddressDto;

  @ApiProperty({
    description: 'Información de la obra social del afiliado',
    required: false,
    type: HealthInsuranceDto,
  })
  @IsOptional()
  @IsObject()
  healthInsurance?: HealthInsuranceDto;

  @ApiProperty({
    description: 'Estado del afiliado (activo/inactivo)',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
