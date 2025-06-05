import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsArray,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { PromotionType } from '../enums/promotion-type.enum';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePromotionDto {
  @ApiProperty({
    description: 'Título de la promoción',
    example: 'Oferta 50% Crema',
    required: false,
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    description: 'Descripción de la promoción',
    example: 'Descuento especial en cremas',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description:
      'Tipo de promoción (NXN, PERCENT_SECOND, PERCENTAGE, FIXED, BUNDLE)',
    example: 'PERCENTAGE',
    required: false,
  })
  @IsOptional()
  @IsEnum(PromotionType, {
    message:
      'El tipo de promoción debe ser uno de: NXN, PERCENT_SECOND, PERCENTAGE, FIXED, BUNDLE',
  })
  type?: PromotionType;

  @ApiProperty({
    description:
      'Cantidad de ítems a comprar para calificar para ítems gratis (usado en NXN)',
    example: 2,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  buyQuantity?: number;

  @ApiProperty({
    description: 'Cantidad de ítems gratis obtenidos (usado en NXN)',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  getQuantity?: number;

  @ApiProperty({
    description:
      'Porcentaje de descuento (usado en PERCENTAGE y PERCENT_SECOND)',
    example: 50,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  discountPercentage?: number;

  @ApiProperty({
    description: 'Monto fijo de descuento por unidad (usado en FIXED)',
    example: 500,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  discountAmount?: number;

  @ApiProperty({
    description: 'Fecha de inicio de la promoción (formato ISO)',
    example: '2025-03-01T00:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: 'Fecha de fin de la promoción (formato ISO)',
    example: '2025-05-01T00:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description: 'URL de la imagen asociada con la promoción',
    example: 'http://example.com/promo.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({
    description:
      'Lista de IDs de productos a los que se aplica la promoción (UUIDs)',
    example: ['824b589f-3f10-4249-a1f9-7ba8a6ce4f6f'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productIds?: string[];

  @ApiProperty({
    description: 'Indica si la promoción está activa',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
