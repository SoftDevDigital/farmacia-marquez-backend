import {
  IsOptional,
  IsDateString,
  IsUUID,
  IsEnum,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PromotionType } from '../enums/promotion-type.enum';

export class PromotionFilterDto {
  @ApiProperty({
    description: 'Fecha de inicio (ISO)',
    required: false,
    example: '2025-03-01T00:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({
    description: 'Fecha de fin (ISO)',
    required: false,
    example: '2025-05-01T00:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({
    description: 'ID del producto (UUID)',
    required: false,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsOptional()
  productId?: string;

  @ApiProperty({
    description: 'Tipo de promoción',
    enum: PromotionType,
    required: false,
    example: 'PERCENTAGE',
  })
  @IsEnum(PromotionType)
  @IsOptional()
  type?: PromotionType;

  @ApiProperty({
    description: 'Porcentaje mínimo de descuento',
    required: false,
    minimum: 0,
    maximum: 100,
    example: 10,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  minDiscountPercentage?: number;

  @ApiProperty({
    description: 'Porcentaje máximo de descuento',
    required: false,
    minimum: 0,
    maximum: 100,
    example: 50,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  maxDiscountPercentage?: number;
}
