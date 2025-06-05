import { IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckoutSelectedDto {
  @ApiProperty({
    description:
      'Lista de IDs de productos seleccionados para checkout (UUIDs)',
    example: ['824b589f-3f10-4249-a1f9-7ba8a6ce4f6f'],
  })
  @IsArray()
  @IsUUID('all', { each: true })
  selectedProductIds: string[];
}
