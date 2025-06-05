import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';
import { ProductFilterDto } from './dtos/product-filter.dto';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PromotionsService } from '../promotions/promotions.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { Promotion } from '../promotions/schemas/promotions.schema';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  private readonly logger = new Logger(ProductsController.name);

  constructor(
    private readonly productsService: ProductsService,
    private readonly promotionsService: PromotionsService,
  ) {}

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

  @Get()
  @ApiOperation({
    summary: 'Listar todos los productos con filtros opcionales',
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    type: String,
    description: 'Filtrar por ID de categoría (UUID)',
  })
  @ApiQuery({
    name: 'subcategoryId',
    required: false,
    type: String,
    description: 'Filtrar por ID de subcategoría (UUID)',
  })
  @ApiQuery({
    name: 'brandId',
    required: false,
    type: String,
    description: 'Filtrar por ID de marca (UUID)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Buscar por nombre del producto',
  })
  @ApiQuery({
    name: 'isFeatured',
    required: false,
    type: Boolean,
    description: 'Filtrar por productos destacados',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de productos con precios ajustados por promociones',
    type: [Object],
  })
  @ApiResponse({ status: 400, description: 'Parámetros de consulta inválidos' })
  @ApiResponse({ status: 500, description: 'Error al obtener los productos' })
  async findAll(@Query() filter: ProductFilterDto) {
    if (!filter || typeof filter !== 'object') {
      throw new BadRequestException('Los filtros deben ser un objeto válido');
    }

    if (filter.categoryId) {
      console.log('findAll - categoryId recibido:', filter.categoryId);
      this.validateId(filter.categoryId, 'categoryId');
    }
    if (filter.subcategoryId) {
      console.log('findAll - subcategoryId recibido:', filter.subcategoryId);
      this.validateId(filter.subcategoryId, 'subcategoryId');
    }
    if (filter.brandId) {
      console.log('findAll - brandId recibido:', filter.brandId);
      this.validateId(filter.brandId, 'brandId');
    }

    try {
      const products = await this.productsService.findAll(filter);
      const productsWithPromotions = await Promise.all(
        products.map(async (product) => {
          try {
            const promotions: Promotion[] =
              await this.promotionsService.getActivePromotionsForProduct(
                product._id.toString(),
              );
            let discount = 0;
            let appliedPromotion: string | null = null;

            for (const promotion of promotions) {
              const productDiscount =
                await this.promotionsService.calculateDiscount(
                  promotion,
                  1,
                  product.price,
                );
              if (productDiscount > discount) {
                discount = productDiscount;
              }

              appliedPromotion = promotion._id as string;
            }

            const discountedPrice = product.price - discount;

            return {
              ...product.toJSON(),
              originalPrice: product.price,
              discountedPrice: discountedPrice > 0 ? discountedPrice : 0,
              discount: discount > 0 ? discount : undefined,
              appliedPromotion: appliedPromotion,
            };
          } catch (error) {
            return {
              ...product.toJSON(),
              originalPrice: product.price,
              discountedPrice: product.price,
              discount: undefined,
              appliedPromotion: null,
            };
          }
        }),
      );

      return productsWithPromotions;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Error al obtener los productos: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('Error al obtener los productos');
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un producto por ID' })
  @ApiParam({
    name: 'id',
    description: 'ID del producto (UUID)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Producto encontrado con precio ajustado por promociones',
    type: Object,
  })
  @ApiResponse({ status: 400, description: 'ID no válido' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  @ApiResponse({ status: 500, description: 'Error al obtener el producto' })
  async findOne(@Param('id') id: string) {
    console.log('findOne - id recibido:', id);
    this.validateId(id);

    try {
      const product = await this.productsService.findOne(id);
      try {
        const promotions: Promotion[] =
          await this.promotionsService.getActivePromotionsForProduct(id);
        let discount = 0;
        let appliedPromotion: string | null = null;

        for (const promotion of promotions) {
          const productDiscount =
            await this.promotionsService.calculateDiscount(
              promotion,
              1,
              product.price,
            );
          if (productDiscount > discount) {
            discount = productDiscount;
            appliedPromotion = promotion._id as string;
          }
        }

        const discountedPrice = product.price - discount;

        return {
          ...product.toJSON(),
          originalPrice: product.price,
          discountedPrice: discountedPrice > 0 ? discountedPrice : 0,
          discount: discount > 0 ? discount : undefined,
          appliedPromotion: appliedPromotion,
        };
      } catch (error) {
        return {
          ...product.toJSON(),
          originalPrice: product.price,
          discountedPrice: product.price,
          discount: undefined,
          appliedPromotion: null,
        };
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message);
      }
      this.logger.error(
        `Error al obtener el producto: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('Error al obtener el producto');
    }
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear un nuevo producto (ADMIN)' })
  @ApiBody({ type: CreateProductDto })
  @ApiResponse({ status: 201, description: 'Producto creado', type: Object })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Rol insuficiente' })
  @ApiResponse({ status: 500, description: 'Error al crear el producto' })
  async create(@Body() createProductDto: CreateProductDto) {
    if (!createProductDto || Object.keys(createProductDto).length === 0) {
      throw new BadRequestException(
        'El cuerpo de la solicitud no puede estar vacío',
      );
    }

    try {
      return await this.productsService.create(createProductDto);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message);
      }
      this.logger.error(
        `Error al crear el producto: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('Error al crear el producto');
    }
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Actualizar un producto existente (ADMIN)' })
  @ApiParam({
    name: 'id',
    description: 'ID del producto (UUID)',
    type: String,
  })
  @ApiBody({ type: UpdateProductDto })
  @ApiResponse({
    status: 200,
    description: 'Producto actualizado',
    type: Object,
  })
  @ApiResponse({ status: 400, description: 'ID o datos inválidos' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Rol insuficiente' })
  @ApiResponse({ status: 500, description: 'Error al actualizar el producto' })
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    console.log('update - id recibido:', id);
    this.validateId(id);

    if (!updateProductDto || Object.keys(updateProductDto).length === 0) {
      throw new BadRequestException(
        'El cuerpo de la solicitud no puede estar vacío',
      );
    }

    try {
      return await this.productsService.update(id, updateProductDto);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message);
      }
      this.logger.error(
        `Error al actualizar el producto: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('Error al actualizar el producto');
    }
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Eliminar un producto (ADMIN)' })
  @ApiParam({
    name: 'id',
    description: 'ID del producto (UUID)',
    type: String,
  })
  @ApiResponse({ status: 200, description: 'Producto eliminado' })
  @ApiResponse({ status: 400, description: 'ID inválido' })
  @ApiResponse({
    status: 409,
    description:
      'Producto no puede ser eliminado porque tiene promociones activas asociadas',
  })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Rol insuficiente' })
  @ApiResponse({ status: 500, description: 'Error al eliminar el producto' })
  async remove(@Param('id') id: string) {
    console.log('remove - id recibido:', id);
    this.validateId(id);

    try {
      await this.productsService.remove(id);
      return { message: 'Producto eliminado exitosamente' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message);
      }
      this.logger.error(
        `Error al eliminar el producto: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('Error al eliminar el producto');
    }
  }
}
