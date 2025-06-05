import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateBrandDto {
  @ApiProperty({
    description: 'Nombre de la marca',
    required: false,
    example: 'Farmacia ABC',
  })
  @IsString()
  @IsOptional()
  name?: string;
}
