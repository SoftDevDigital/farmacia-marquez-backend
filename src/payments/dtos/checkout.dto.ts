import { IsArray, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckoutDto {
  @ApiProperty({
    description:
      'Lista de IDs de productos seleccionados para checkout (UUIDs). Si está vacío, se incluyen todos los productos del carrito.',
    example: ['824b589f-3f10-4249-a1f9-7ba8a6ce4f6f'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  selectedProductIds?: string[];
}
