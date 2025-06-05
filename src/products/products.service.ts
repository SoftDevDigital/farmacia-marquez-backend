import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product } from './schemas/products.schema';
import { UpdateProductDto } from './dtos/update-product.dto';
import { ProductFilterDto } from './dtos/product-filter.dto';
import { PromotionsService } from '../promotions/promotions.service';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectModel(Product.name) private productModel: Model<Product>,
    private readonly promotionsService: PromotionsService, // Inyectar PromotionsService
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

  async findAll(filters: ProductFilterDto = {}): Promise<Product[]> {
    // Validar que filters sea un objeto válido
    if (!filters || typeof filters !== 'object') {
      throw new BadRequestException('Los filtros deben ser un objeto válido');
    }

    const query: any = {};

    // Validar filtros
    if (filters.categoryId) {
      this.logger.debug('findAll - categoryId recibido:', filters.categoryId);
      this.validateId(filters.categoryId, 'categoryId');
      query.categoryId = filters.categoryId;
    }
    if (filters.subcategoryId) {
      this.logger.debug(
        'findAll - subcategoryId recibido:',
        filters.subcategoryId,
      );
      this.validateId(filters.subcategoryId, 'subcategoryId');
      query.subcategoryId = filters.subcategoryId;
    }
    if (filters.brandId) {
      this.logger.debug('findAll - brandId recibido:', filters.brandId);
      this.validateId(filters.brandId, 'brandId');
      query.brandId = filters.brandId;
    }
    if (filters.isFeatured !== undefined) {
      if (typeof filters.isFeatured !== 'boolean') {
        throw new BadRequestException(
          'El campo isFeatured debe ser un booleano',
        );
      }
      query.isFeatured = filters.isFeatured;
    }
    if (filters.search) {
      if (typeof filters.search !== 'string' || filters.search.trim() === '') {
        throw new BadRequestException(
          'El campo search debe ser una cadena no vacía',
        );
      }
      query.name = { $regex: filters.search, $options: 'i' };
    }

    try {
      return await this.productModel.find(query).exec();
    } catch (error) {
      this.logger.error(
        `Error al obtener los productos: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('Error al obtener los productos');
    }
  }

  async findOne(id: string): Promise<Product> {
    this.logger.debug('findOne - id recibido:', id);
    this.validateId(id);

    try {
      const product = await this.productModel.findOne({ _id: id }).exec();
      if (!product) {
        throw new NotFoundException('Producto no encontrado');
      }
      return product;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if ((error as Error).name === 'CastError') {
        throw new BadRequestException(
          'El ID no tiene un formato válido (debe ser un UUID)',
        );
      }
      this.logger.error(
        `Error al buscar el producto: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('Error al buscar el producto');
    }
  }

  async create(createProductDto: any): Promise<Product> {
    if (!createProductDto || Object.keys(createProductDto).length === 0) {
      throw new BadRequestException(
        'El cuerpo de la solicitud no puede estar vacío',
      );
    }

    const requiredFields = ['name', 'price', 'stock', 'categoryId', 'brandId'];
    for (const field of requiredFields) {
      if (!(field in createProductDto)) {
        throw new BadRequestException(`El campo ${field} es requerido`);
      }
      if (
        typeof createProductDto[field] === 'string' &&
        createProductDto[field].trim() === ''
      ) {
        throw new BadRequestException(`El campo ${field} no puede estar vacío`);
      }
    }

    if (typeof createProductDto.name !== 'string') {
      throw new BadRequestException('El nombre debe ser una cadena de texto');
    }
    if (
      typeof createProductDto.price !== 'number' ||
      createProductDto.price < 0
    ) {
      throw new BadRequestException('El precio debe ser un número no negativo');
    }
    if (
      typeof createProductDto.stock !== 'number' ||
      createProductDto.stock < 0
    ) {
      throw new BadRequestException('El stock debe ser un número no negativo');
    }
    if (
      'discount' in createProductDto &&
      (typeof createProductDto.discount !== 'number' ||
        createProductDto.discount < 0 ||
        createProductDto.discount > 100)
    ) {
      throw new BadRequestException(
        'El descuento debe ser un número entre 0 y 100',
      );
    }
    if (
      'description' in createProductDto &&
      typeof createProductDto.description !== 'string'
    ) {
      throw new BadRequestException(
        'La descripción debe ser una cadena de texto',
      );
    }
    if (
      'images' in createProductDto &&
      (!Array.isArray(createProductDto.images) ||
        !createProductDto.images.every((img: any) => typeof img === 'string'))
    ) {
      throw new BadRequestException(
        'Las imágenes deben ser un arreglo de cadenas de texto',
      );
    }

    this.logger.debug(
      'create - categoryId recibido:',
      createProductDto.categoryId,
    );
    this.validateId(createProductDto.categoryId, 'categoryId');
    this.logger.debug('create - brandId recibido:', createProductDto.brandId);
    this.validateId(createProductDto.brandId, 'brandId');
    if (createProductDto.subcategoryId) {
      this.logger.debug(
        'create - subcategoryId recibido:',
        createProductDto.subcategoryId,
      );
      this.validateId(createProductDto.subcategoryId, 'subcategoryId');
    }

    try {
      const createdProduct = new this.productModel(createProductDto);
      return await createdProduct.save();
    } catch (error: unknown) {
      if ((error as { code?: number }).code === 11000) {
        throw new BadRequestException('El producto ya existe');
      }
      this.logger.error(
        `Error al crear el producto: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('Error al crear el producto');
    }
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    this.logger.debug('update - id recibido:', id);
    this.validateId(id);

    if (!updateProductDto || Object.keys(updateProductDto).length === 0) {
      throw new BadRequestException(
        'El cuerpo de la solicitud no puede estar vacío',
      );
    }

    if ('name' in updateProductDto) {
      if (
        typeof updateProductDto.name !== 'string' ||
        updateProductDto.name.trim() === ''
      ) {
        throw new BadRequestException('El nombre debe ser una cadena no vacía');
      }
    }
    if ('price' in updateProductDto) {
      if (
        typeof updateProductDto.price !== 'number' ||
        updateProductDto.price < 0
      ) {
        throw new BadRequestException(
          'El precio debe ser un número no negativo',
        );
      }
    }
    if ('stock' in updateProductDto) {
      if (
        typeof updateProductDto.stock !== 'number' ||
        updateProductDto.stock < 0
      ) {
        throw new BadRequestException(
          'El stock debe ser un número no negativo',
        );
      }
    }
    if ('discount' in updateProductDto) {
      if (
        typeof updateProductDto.discount !== 'number' ||
        updateProductDto.discount < 0 ||
        updateProductDto.discount > 100
      ) {
        throw new BadRequestException(
          'El descuento debe ser un número entre 0 y 100',
        );
      }
    }
    if ('description' in updateProductDto) {
      if (typeof updateProductDto.description !== 'string') {
        throw new BadRequestException(
          'La descripción debe ser una cadena de texto',
        );
      }
    }
    if ('images' in updateProductDto) {
      if (
        !Array.isArray(updateProductDto.images) ||
        !updateProductDto.images.every((img: any) => typeof img === 'string')
      ) {
        throw new BadRequestException(
          'Las imágenes deben ser un arreglo de cadenas de texto',
        );
      }
    }
    if (updateProductDto.categoryId) {
      this.logger.debug(
        'update - categoryId recibido:',
        updateProductDto.categoryId,
      );
      this.validateId(updateProductDto.categoryId, 'categoryId');
    }
    if (updateProductDto.brandId) {
      this.logger.debug('update - brandId recibido:', updateProductDto.brandId);
      this.validateId(updateProductDto.brandId, 'brandId');
    }
    if (updateProductDto.subcategoryId) {
      this.logger.debug(
        'update - subcategoryId recibido:',
        updateProductDto.subcategoryId,
      );
      this.validateId(updateProductDto.subcategoryId, 'subcategoryId');
    }

    try {
      this.logger.debug(
        `Actualizando producto ${id} con datos:`,
        updateProductDto,
      );

      const updatedProduct = await this.productModel
        .findOneAndUpdate(
          { _id: id },
          { $set: updateProductDto },
          { new: true },
        )
        .exec();

      if (!updatedProduct) {
        throw new NotFoundException('Producto no encontrado');
      }

      this.logger.debug(`Producto actualizado ${id}:`, updatedProduct);
      return updatedProduct;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      if ((error as Error).name === 'CastError') {
        throw new BadRequestException(
          'El ID no tiene un formato válido (debe ser un UUID)',
        );
      }
      this.logger.error(
        `Error al actualizar el producto: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('Error al actualizar el producto');
    }
  }

  async remove(id: string): Promise<void> {
    this.logger.debug('remove - id recibido:', id);
    this.validateId(id);

    try {
      // Verificar si el producto tiene promociones activas
      const activePromotions =
        await this.promotionsService.getActivePromotionsForProduct(id);
      if (activePromotions.length > 0) {
        throw new BadRequestException(
          'No se puede eliminar el producto porque tiene promociones activas asociadas',
        );
      }

      const result = await this.productModel.deleteOne({ _id: id }).exec();
      if (result.deletedCount === 0) {
        throw new NotFoundException('Producto no encontrado');
      }
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      if ((error as Error).name === 'CastError') {
        throw new BadRequestException(
          'El ID no tiene un formato válido (debe ser un UUID)',
        );
      }
      this.logger.error(
        `Error al eliminar el producto: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('Error al eliminar el producto');
    }
  }
}
