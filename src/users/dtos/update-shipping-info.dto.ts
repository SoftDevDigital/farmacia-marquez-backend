import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateShippingInfoDto {
  @ApiProperty({
    description: 'Nombre completo del destinatario',
    example: 'Juan Pérez',
    required: false,
  })
  @IsOptional()
  @IsString()
  recipientName?: string;

  @ApiProperty({
    description: 'Número de teléfono del destinatario',
    example: '+541123456789',
    required: false,
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({
    description: 'Número de documento del destinatario (DNI, CUIT, etc.)',
    example: '12345678',
    required: false,
  })
  @IsOptional()
  @IsString()
  documentNumber?: string;

  @ApiProperty({
    description: 'Calle de la dirección de envío',
    example: 'Av. Siempre Viva',
    required: false,
  })
  @IsOptional()
  @IsString()
  street?: string;

  @ApiProperty({
    description: 'Número de la calle',
    example: '123',
    required: false,
  })
  @IsOptional()
  @IsString()
  streetNumber?: string;

  @ApiProperty({
    description: 'Departamento o piso (opcional)',
    example: '2B',
    required: false,
  })
  @IsOptional()
  @IsString()
  apartment?: string;

  @ApiProperty({
    description: 'Ciudad de la dirección de envío',
    example: 'Springfield',
    required: false,
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({
    description: 'Estado o provincia de la dirección de envío',
    example: 'Springfield',
    required: false,
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({
    description: 'Código postal de la dirección de envío',
    example: '12345',
    required: false,
  })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiProperty({
    description: 'País de la dirección de envío',
    example: 'Argentina',
    required: false,
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({
    description:
      'Notas adicionales para el envío (por ejemplo, "Dejar en portería")',
    example: 'Dejar en portería si no estoy',
    required: false,
  })
  @IsOptional()
  @IsString()
  additionalNotes?: string;
}
