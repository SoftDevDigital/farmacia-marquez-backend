import { IsUUID, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ProductFilterDto {
  @ApiProperty({
    description: 'ID de la categoría',
    required: false,
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsOptional()
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
    required: false,
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsUUID()
  @IsOptional()
  brandId?: string;

  @ApiProperty({
    description: 'ID de la Promosión',
    required: false,
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440003',
  })
  @IsUUID()
  @IsOptional()
  promotionId?: string;

  @ApiProperty({
    description: 'Tipo del promoción',
    required: false,
    format: 'string',
    example: 'NXN, PORCENTAGE, FIXED',
  })
  @IsOptional()
  promotionType?: string;

  @ApiProperty({
    description: 'Búsqueda por nombre',
    required: false,
    example: 'Paracetamol',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({
    description: 'Filtrar por productos destacados',
    required: false,
    example: true,
  })
  @IsOptional()
  isFeatured?: boolean;
}
