import { IsString, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddToCartDto {
  @ApiProperty({
    description: 'ID del producto (UUID)',
    example: '824b589f-3f10-4249-a1f9-7ba8a6ce4f6f',
  })
  @IsUUID()
  productId: string;

  @ApiProperty({
    description: 'Cantidad del producto a agregar',
    minimum: 1,
    example: 1,
  })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({
    description: 'Indica si se debe aplicar un descuento (opcional)',
    required: false,
    example: false,
  })
  @IsOptional()
  applyDiscount?: boolean;
}
