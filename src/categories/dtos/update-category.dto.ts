import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class SubcategoryDto {
  @ApiProperty({
    description: 'ID de la subcategoría',
    required: false,
    example: 'uuid',
  })
  @IsString()
  @IsOptional()
  _id?: string;

  @ApiProperty({
    description: 'Nombre de la subcategoría',
    example: 'Analgésicos',
  })
  @IsString()
  name: string;
}

export class UpdateCategoryDto {
  @ApiProperty({
    description: 'Nombre de la categoría',
    required: false,
    example: 'Medicamentos',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Lista de subcategorías',
    type: [SubcategoryDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubcategoryDto)
  subcategories?: SubcategoryDto[];
}
