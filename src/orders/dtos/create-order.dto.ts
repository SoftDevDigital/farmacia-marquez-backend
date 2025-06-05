import { IsArray, IsNumber, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class OrderItemDto {
  @ApiProperty({
    description: 'ID del producto',
    example: 'prod001',
  })
  @IsString()
  productId: string;

  @ApiProperty({
    description: 'Nombre del producto',
    example: 'Producto Ejemplo',
  })
  @IsString()
  name: string; // Nuevo campo para el nombre del producto

  @ApiProperty({
    description: 'Cantidad del producto',
    example: 2,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({
    description: 'Precio unitario del producto',
    example: 15.99,
  })
  @IsNumber()
  price: number;
}

export class CreateOrderDto {
  @ApiProperty({
    description: 'Lista de ítems de la orden',
    type: [OrderItemDto],
  })
  @IsArray()
  items: OrderItemDto[];

  @ApiProperty({
    description: 'Precio total de la orden',
    example: 47.97,
  })
  @IsNumber()
  total: number;

  @ApiProperty({
    description: 'Estado de la orden',
    example: 'pending',
    required: false,
  })
  @IsString()
  status?: string;
}
