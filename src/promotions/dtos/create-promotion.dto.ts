import {
  IsString,
  IsOptional,
  IsArray,
  IsUUID,
  IsDateString,
  IsNumber,
  IsEnum,
  IsBoolean,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PromotionType } from '../enums/promotion-type.enum';

export class CreatePromotionDto {
  @ApiProperty({
    description: 'Título de la promoción',
    example: 'Oferta 50% Crema',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Descripción de la promoción',
    required: false,
    example: 'Descuento especial en cremas',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Tipo de promoción',
    enum: PromotionType,
    example: 'PERCENTAGE',
  })
  @IsEnum(PromotionType)
  type: PromotionType;

  @ApiProperty({
    description: 'Cantidad a comprar (N en NXN)',
    required: false,
    minimum: 1,
    example: 3,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  buyQuantity?: number; // Cantidad a comprar (N en NXN, ignorado en otros tipos)

  @ApiProperty({
    description: 'Cantidad gratis (M en NXN)',
    required: false,
    minimum: 0,
    example: 2,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  getQuantity?: number; // Cantidad gratis (M en NXN, ignorado en otros tipos)

  @ApiProperty({
    description: 'Porcentaje de descuento',
    required: false,
    minimum: 0,
    example: 50,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  discountPercentage?: number; // % de descuento (para PERCENT_SECOND o PERCENTAGE)

  @ApiProperty({
    description: 'Monto fijo de descuento',
    required: false,
    minimum: 0,
    example: 10,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  discountAmount?: number; // Monto fijo de descuento (para FIXED)

  @ApiProperty({
    description: 'Fecha de inicio (ISO)',
    example: '2025-03-01T00:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({
    description: 'Fecha de fin (ISO)',
    example: '2025-05-01T00:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({
    description: 'URL de la imagen',
    required: false,
    example: 'http://example.com/promo.jpg',
  })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({
    description: 'IDs de los productos asociados',
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440000'],
  })
  @IsArray()
  @IsUUID('all', { each: true })
  productIds: string[];

  @ApiProperty({ description: 'Estado activo', required: false, example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
