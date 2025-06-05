import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  Max,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ description: 'Nombre del producto', example: 'Paracetamol' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Descripción del producto',
    required: false,
    example: 'Analgésico y antipirético',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Precio del producto', example: 100 })
  @IsNumber()
  price: number;

  @ApiProperty({
    description: 'Porcentaje de descuento',
    required: false,
    minimum: 0,
    maximum: 100,
    example: 10,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  discount?: number;

  @ApiProperty({ description: 'Stock disponible', minimum: 0, example: 50 })
  @IsNumber()
  @Min(0)
  stock: number;

  @ApiProperty({
    description: 'URL de la imagen',
    required: false,
    example: 'http://example.com/image.jpg',
  })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({
    description: 'ID de la categoría',
    required: false, // Hacer opcional
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsOptional() // Hacer opcional
  categoryId?: string;

  @ApiProperty({
    description: 'ID de la subcategoría',
    required: false,
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  @IsOptional()
  subcategoryId?: string;

  @ApiProperty({
    description: 'ID de la marca',
    required: false, // Hacer opcional
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsUUID()
  @IsOptional() // Hacer opcional
  brandId?: string;

  @ApiProperty({
    description: 'Indica si el producto es destacado',
    required: false,
    example: true,
  })
  @IsOptional()
  isFeatured?: boolean;
}