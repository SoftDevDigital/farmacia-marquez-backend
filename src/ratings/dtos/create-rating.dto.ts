import {
  IsUUID,
  IsNumber,
  Min,
  Max,
  IsString,
  IsOptional,
} from 'class-validator';

export class CreateRatingDto {
  @IsUUID()
  productId: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @IsOptional()
  comment?: string;
}
