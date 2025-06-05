import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({
    description: 'Nombre del usuario',
    required: false,
    example: 'Juan',
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({
    description: 'Apellido del usuario',
    required: false,
    example: 'Pérez',
  })
  @IsString()
  @IsOptional()
  lastName?: string;
}
