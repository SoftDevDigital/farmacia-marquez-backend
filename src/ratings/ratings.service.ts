import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Rating } from './schemas/ratings.schema';
import { CreateRatingDto } from './dtos/create-rating.dto';
import { UpdateRatingDto } from './dtos/update-rating.dto';
import { ProductsService } from '../products/products.service';

@Injectable()
export class RatingsService {
  constructor(
    @InjectModel(Rating.name) private ratingModel: Model<Rating>,
    private productsService: ProductsService,
  ) {}

  async findByProduct(productId: string): Promise<Rating[]> {
    return this.ratingModel.find({ productId }).exec();
  }

  async findOne(id: string): Promise<Rating> {
    const rating = await this.ratingModel.findById(id).exec();
    if (!rating) {
      throw new NotFoundException('Calificación no encontrada');
    }
    return rating;
  }

  async create(
    userId: string,
    createRatingDto: CreateRatingDto,
  ): Promise<Rating> {
    // Verificar que el producto exista
    await this.productsService.findOne(createRatingDto.productId);

    // Verificar si el usuario ya ha calificado este producto
    const existingRating = await this.ratingModel
      .findOne({
        userId,
        productId: createRatingDto.productId,
      })
      .exec();
    if (existingRating) {
      throw new ForbiddenException('Ya has calificado este producto');
    }

    const rating = new this.ratingModel({
      userId,
      ...createRatingDto,
    });
    return rating.save();
  }

  async update(
    id: string,
    userId: string,
    updateRatingDto: UpdateRatingDto,
  ): Promise<Rating> {
    const rating = await this.findOne(id);
    if (rating.userId !== userId) {
      throw new ForbiddenException(
        'No tienes permiso para modificar esta calificación',
      );
    }
    const updatedRating = await this.ratingModel
      .findByIdAndUpdate(id, { $set: updateRatingDto }, { new: true })
      .exec();
    if (!updatedRating) {
      throw new NotFoundException('Calificación no encontrada');
    }
    return updatedRating;
  }

  async remove(id: string, userId: string): Promise<void> {
    const rating = await this.findOne(id);
    if (rating.userId !== userId) {
      throw new ForbiddenException(
        'No tienes permiso para eliminar esta calificación',
      );
    }
    await this.ratingModel.findByIdAndDelete(id).exec();
  }
}
