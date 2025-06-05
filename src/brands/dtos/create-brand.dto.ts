import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBrandDto {
  @ApiProperty({ description: 'Nombre de la marca', example: 'Farmacia XYZ' })
  @IsString()
  name: string;
}
