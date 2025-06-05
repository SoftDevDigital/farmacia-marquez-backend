import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class SubcategoryDto {
  @ApiProperty({
    description: 'Nombre de la subcategoría',
    example: 'Analgésicos',
  })
  @IsString()
  name: string;
}

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Nombre de la categoría',
    example: 'Medicamentos',
  })
  @IsString()
  name: string;

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
