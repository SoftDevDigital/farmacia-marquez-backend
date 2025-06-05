import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateOrderDto {
  @ApiProperty({
    description: 'Estado del pedido',
    required: false,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    example: 'shipped',
  })
  @IsString()
  @IsOptional()
  status?: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
}
