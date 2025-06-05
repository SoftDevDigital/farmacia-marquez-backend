import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Brand } from './schemas/brands.schema';
import { CreateBrandDto } from './dtos/create-brand.dto';
import { UpdateBrandDto } from './dtos/update-brand.dto';

@Injectable()
export class BrandsService {
  constructor(@InjectModel(Brand.name) private brandModel: Model<Brand>) {}

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

  async findAll(): Promise<Brand[]> {
    try {
      return await this.brandModel.find().exec();
    } catch (error) {
      throw new InternalServerErrorException('Error al obtener las marcas');
    }
  }

  async findOne(id: string): Promise<Brand> {
    // Validar el ID
    console.log('findOne - id recibido:', id);
    this.validateId(id);

    try {
      const brand = await this.brandModel.findById(id).exec();
      if (!brand) {
        throw new NotFoundException('Marca no encontrada');
      }
      return brand;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if ((error as Error).name === 'CastError') {
        throw new BadRequestException(
          'El ID no tiene un formato válido (debe ser un UUID)',
        );
      }
      throw new InternalServerErrorException('Error al buscar la marca');
    }
  }

  async create(createBrandDto: CreateBrandDto): Promise<Brand> {
    // Validar que createBrandDto no sea nulo o vacío
    if (!createBrandDto || Object.keys(createBrandDto).length === 0) {
      throw new BadRequestException(
        'El cuerpo de la solicitud no puede estar vacío',
      );
    }

    // Validar los campos requeridos
    if (!createBrandDto.name || typeof createBrandDto.name !== 'string') {
      throw new BadRequestException(
        'El nombre de la marca debe ser una cadena de texto no vacía',
      );
    }

    try {
      const brand = new this.brandModel(createBrandDto);
      return await brand.save();
    } catch (error: unknown) {
      if ((error as { code?: number }).code === 11000) {
        // Error de duplicado en MongoDB
        throw new BadRequestException('Ya existe una marca con este nombre');
      }
      throw new InternalServerErrorException('Error al crear la marca');
    }
  }

  async update(id: string, updateBrandDto: UpdateBrandDto): Promise<Brand> {
    // Validar el ID
    console.log('update - id recibido:', id);
    this.validateId(id);

    // Validar que updateBrandDto no sea nulo o vacío
    if (!updateBrandDto || Object.keys(updateBrandDto).length === 0) {
      throw new BadRequestException(
        'El cuerpo de la solicitud no puede estar vacío',
      );
    }

    // Validar los campos si se proporcionan
    if (
      updateBrandDto.name &&
      (typeof updateBrandDto.name !== 'string' ||
        updateBrandDto.name.trim() === '')
    ) {
      throw new BadRequestException(
        'El nombre de la marca debe ser una cadena de texto no vacía',
      );
    }

    try {
      const brand = await this.brandModel
        .findByIdAndUpdate(id, { $set: updateBrandDto }, { new: true })
        .exec();
      if (!brand) {
        throw new NotFoundException('Marca no encontrada');
      }
      return brand;
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
        throw new BadRequestException('Ya existe una marca con este nombre');
      }
      throw new InternalServerErrorException('Error al actualizar la marca');
    }
  }

  async remove(id: string): Promise<void> {
    // Validar el ID
    console.log('remove - id recibido:', id);
    this.validateId(id);

    try {
      const result = await this.brandModel.findByIdAndDelete(id).exec();
      if (!result) {
        throw new NotFoundException('Marca no encontrada');
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
      throw new InternalServerErrorException('Error al eliminar la marca');
    }
  }
}
