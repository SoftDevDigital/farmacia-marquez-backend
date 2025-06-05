import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto } from './dtos/create-promotion.dto';
import { UpdatePromotionDto } from './dtos/update-promotion.dto';
import { PromotionFilterDto } from './dtos/promotion-filter.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('Promotions')
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

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

  @Get()
  @ApiOperation({
    summary: 'Listar todas las promociones con filtros opcionales',
  })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'productId', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'minDiscountPercentage', required: false, type: Number })
  @ApiQuery({ name: 'maxDiscountPercentage', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Lista de promociones con información de productos asociados',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            example: '63e6663b-0cb1-4715-86e7-b653dfced87c',
          },
          title: { type: 'string', example: 'test nxn' },
          description: { type: 'string', example: 'compra 1 lleva 2' },
          type: { type: 'string', example: 'NXN' },
          buyQuantity: { type: 'number', example: 1 },
          getQuantity: { type: 'number', example: 2 },
          discountPercentage: { type: 'number', example: 0 },
          discountAmount: { type: 'number', example: 0 },
          startDate: { type: 'string', example: '2025-04-01T00:00:00.000Z' },
          endDate: { type: 'string', example: '2025-06-01T00:00:00.000Z' },
          isActive: { type: 'boolean', example: true },
          createdAt: { type: 'string', example: '2025-04-18T02:23:53.042Z' },
          updatedAt: { type: 'string', example: '2025-04-18T02:23:53.042Z' },
          products: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  example: '194cc2f3-4769-44a8-ade6-10d0567eb88f',
                },
                name: { type: 'string', example: 'Producto Ejemplo' },
              },
            },
          },
        },
      },
    },
  })
  async findAll(@Query() filterDto: PromotionFilterDto) {
    // Validar productId si está presente
    if (filterDto.productId) {
      this.validateId(filterDto.productId, 'productId');
    }
    return this.promotionsService.findAll(filterDto);
  }

  @Get('types')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Obtener los tipos de promociones disponibles (ADMIN)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de tipos de promociones',
    type: Array,
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido (requiere rol ADMIN)' })
  getPromotionTypes() {
    return this.promotionsService.getPromotionTypes();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una promoción por ID' })
  @ApiParam({
    name: 'id',
    description: 'ID de la promoción (UUID)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Promoción encontrada con información de productos asociados',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '63e6663b-0cb1-4715-86e7-b653dfced87c' },
        title: { type: 'string', example: 'test nxn' },
        description: { type: 'string', example: 'compra 1 lleva 2' },
        type: { type: 'string', example: 'NXN' },
        buyQuantity: { type: 'number', example: 1 },
        getQuantity: { type: 'number', example: 2 },
        discountPercentage: { type: 'number', example: 0 },
        discountAmount: { type: 'number', example: 0 },
        startDate: { type: 'string', example: '2025-04-01T00:00:00.000Z' },
        endDate: { type: 'string', example: '2025-06-01T00:00:00.000Z' },
        isActive: { type: 'boolean', example: true },
        createdAt: { type: 'string', example: '2025-04-18T02:23:53.042Z' },
        updatedAt: { type: 'string', example: '2025-04-18T02:23:53.042Z' },
        products: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                example: '194cc2f3-4769-44a8-ade6-10d0567eb88f',
              },
              name: { type: 'string', example: 'Producto Ejemplo' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Promoción no encontrada' })
  async findOne(@Param('id') id: string) {
    // Validar el ID
    this.validateId(id);
    return this.promotionsService.findOne(id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear una nueva promoción (ADMIN)' })
  @ApiBody({ type: CreatePromotionDto })
  @ApiResponse({ status: 201, description: 'Promoción creada', type: Object })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido (requiere rol ADMIN)' })
  async create(@Body() createPromotionDto: CreatePromotionDto) {
    return this.promotionsService.create(createPromotionDto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar una promoción existente (ADMIN)' })
  @ApiParam({
    name: 'id',
    description: 'ID de la promoción (UUID)',
    type: String,
  })
  @ApiBody({ type: UpdatePromotionDto })
  @ApiResponse({
    status: 200,
    description: 'Promoción actualizada',
    type: Object,
  })
  @ApiResponse({ status: 404, description: 'Promoción no encontrada' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido (requiere rol ADMIN)' })
  async update(
    @Param('id') id: string,
    @Body() updatePromotionDto: UpdatePromotionDto,
  ) {
    // Validar el ID
    this.validateId(id);
    return this.promotionsService.update(id, updatePromotionDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Eliminar una promoción (ADMIN)' })
  @ApiParam({
    name: 'id',
    description: 'ID de la promoción (UUID)',
    type: String,
  })
  @ApiResponse({ status: 200, description: 'Promoción eliminada' })
  @ApiResponse({ status: 404, description: 'Promoción no encontrada' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido (requiere rol ADMIN)' })
  async remove(@Param('id') id: string) {
    // Validar el ID
    this.validateId(id);
    await this.promotionsService.remove(id);
    return { message: 'Promoción eliminada exitosamente' };
  }

  @Get(':id/calculate-discount')
  @ApiOperation({ summary: 'Calcular el descuento de una promoción' })
  @ApiParam({
    name: 'id',
    description: 'ID de la promoción (UUID)',
    type: String,
  })
  @ApiQuery({ name: 'quantity', required: true, type: Number })
  @ApiQuery({ name: 'productPrice', required: true, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Descuento calculado',
    type: Number,
  })
  @ApiResponse({ status: 404, description: 'Promoción no encontrada' })
  async calculateDiscount(
    @Param('id') id: string,
    @Query('quantity') quantity: number,
    @Query('productPrice') productPrice: number,
  ) {
    // Validar el ID
    this.validateId(id);
    const promotion = await this.promotionsService.findOne(id);
    return this.promotionsService.calculateDiscount(
      promotion,
      quantity,
      productPrice,
    );
  }
}
