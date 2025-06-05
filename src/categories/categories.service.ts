import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category } from './schemas/categories.schema';
import { CreateCategoryDto } from './dtos/create-category.dto';
import { UpdateCategoryDto } from './dtos/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<Category>,
  ) {}

  // Función auxiliar para validar IDs como UUIDs
  private validateId(id: string, fieldName: string = 'ID'): void {
    if (!id || id.trim() === '') {
      throw new BadRequestException(`El ${fieldName} no puede estar vacío`);
    }
    const uuidRegex =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(id)) {
      throw new BadRequestException(
        `El ${fieldName} no tiene un formato válido (debe ser un UUID)`,
      );
    }
  }

  async findAll(): Promise<Category[]> {
    try {
      return await this.categoryModel.find().exec();
    } catch (error) {
      throw new InternalServerErrorException('Error al obtener las categorías');
    }
  }

  async findOne(id: string): Promise<Category> {
    // Validar el ID
    console.log('findOne - id recibido:', id);
    this.validateId(id);

    try {
      const category = await this.categoryModel.findById(id).exec();
      if (!category) {
        throw new NotFoundException('Categoría no encontrada');
      }
      return category;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if ((error as Error).name === 'CastError') {
        throw new BadRequestException(
          'El ID no tiene un formato válido (debe ser un UUID)',
        );
      }
      throw new InternalServerErrorException('Error al buscar la categoría');
    }
  }

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    // Validar que createCategoryDto no sea nulo o vacío
    if (!createCategoryDto || Object.keys(createCategoryDto).length === 0) {
      throw new BadRequestException(
        'El cuerpo de la solicitud no puede estar vacío',
      );
    }

    // Validar los campos requeridos
    if (
      !createCategoryDto.name ||
      typeof createCategoryDto.name !== 'string' ||
      createCategoryDto.name.trim() === ''
    ) {
      throw new BadRequestException(
        'El nombre de la categoría debe ser una cadena de texto no vacía',
      );
    }

    try {
      const category = new this.categoryModel(createCategoryDto);
      return await category.save();
    } catch (error: unknown) {
      if ((error as { code?: number }).code === 11000) {
        // Error de duplicado en MongoDB
        throw new BadRequestException(
          'Ya existe una categoría con este nombre',
        );
      }
      throw new InternalServerErrorException('Error al crear la categoría');
    }
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    // Validar el ID
    console.log('update - id recibido:', id);
    this.validateId(id);

    // Validar que updateCategoryDto no sea nulo o vacío
    if (!updateCategoryDto || Object.keys(updateCategoryDto).length === 0) {
      throw new BadRequestException(
        'El cuerpo de la solicitud no puede estar vacío',
      );
    }

    // Validar los campos si se proporcionan
    if (
      updateCategoryDto.name &&
      (typeof updateCategoryDto.name !== 'string' ||
        updateCategoryDto.name.trim() === '')
    ) {
      throw new BadRequestException(
        'El nombre de la categoría debe ser una cadena de texto no vacía',
      );
    }

    try {
      const category = await this.categoryModel
        .findByIdAndUpdate(id, { $set: updateCategoryDto }, { new: true })
        .exec();
      if (!category) {
        throw new NotFoundException('Categoría no encontrada');
      }
      return category;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if ((error as Error).name === 'CastError') {
        throw new BadRequestException(
          'El ID no tiene un formato válido (debe ser un UUID)',
        );
      }
      if ((error as { code?: number }).code === 11000) {
        // Error de duplicado en MongoDB
        throw new BadRequestException(
          'Ya existe una categoría con este nombre',
        );
      }
      throw new InternalServerErrorException(
        'Error al actualizar la categoría',
      );
    }
  }

  async remove(id: string): Promise<void> {
    // Validar el ID
    console.log('remove - id recibido:', id);
    this.validateId(id);

    try {
      const result = await this.categoryModel.findByIdAndDelete(id).exec();
      if (!result) {
        throw new NotFoundException('Categoría no encontrada');
      }
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if ((error as Error).name === 'CastError') {
        throw new BadRequestException(
          'El ID no tiene un formato válido (debe ser un UUID)',
        );
      }
      throw new InternalServerErrorException('Error al eliminar la categoría');
    }
  }
}
