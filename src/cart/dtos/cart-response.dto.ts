import { ApiProperty } from '@nestjs/swagger';

export class CartItemResponseDto {
  @ApiProperty({
    description: 'ID del producto (UUID)',
    example: '824b589f-3f10-4249-a1f9-7ba8a6ce4f6f',
  })
  productId: string;

  @ApiProperty({ description: 'Nombre del producto', example: 'Paracetamol' })
  name: string;

  @ApiProperty({ description: 'Cantidad del producto', example: 2 })
  quantity: number;

  @ApiProperty({ description: 'Precio unitario del producto', example: 2001 })
  unitPrice: number;

  @ApiProperty({ description: 'Subtotal sin descuento', example: 4002 })
  subtotal: number;

  @ApiProperty({
    description: 'Descuento aplicado al ítem',
    example: 1000,
    required: false,
  })
  discount?: number;

  @ApiProperty({
    description: 'Subtotal con descuento aplicado',
    example: 3002,
    required: false,
  })
  discountedSubtotal?: number;

  @ApiProperty({
    description: 'ID de la promoción aplicada (si aplica)',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  appliedPromotion?: string;
}

export class CartResponseDto {
  @ApiProperty({
    description: 'ID del carrito (UUID)',
    example: '150cd2ad-518f-41a1-b981-6f74471be1b0',
  })
  cartId: string;

  @ApiProperty({
    description: 'ID del usuario (UUID)',
    example: 'f23c0119-7509-47ed-9647-75fc39097284',
  })
  userId: string;

  @ApiProperty({
    description: 'Lista de ítems en el carrito',
    type: () => [CartItemResponseDto], // Usar una función para evitar problemas de referencia
  })
  items: CartItemResponseDto[];

  @ApiProperty({ description: 'Número total de ítems', example: 2 })
  totalItems: number;

  @ApiProperty({ description: 'Precio total sin descuentos', example: 4002 })
  totalPrice: number;

  @ApiProperty({
    description: 'Descuento total aplicado',
    example: 1000,
    required: false,
  })
  totalDiscount?: number;

  @ApiProperty({
    description: 'Precio total con descuentos',
    example: 3002,
    required: false,
  })
  discountedTotalPrice?: number;

  @ApiProperty({ description: 'Moneda del carrito', example: 'ARS' })
  currency: string;

  @ApiProperty({
    description: 'Fecha de creación',
    example: '2025-04-05T04:00:39.712Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Fecha de última actualización',
    example: '2025-04-05T18:05:05.674Z',
  })
  updatedAt: string;

  @ApiProperty({
    description: 'Lista de problemas de stock (ítems con stock insuficiente)',
    example: [
      {
        productId: '824b589f-3f10-4249-a1f9-7ba8a6ce4f6f',
        name: 'producto nuev',
        available: 3,
        requested: 9,
      },
    ],
    required: false,
  })
  stockIssues?: {
    productId: string;
    name: string;
    available: number;
    requested: number;
  }[];
}
