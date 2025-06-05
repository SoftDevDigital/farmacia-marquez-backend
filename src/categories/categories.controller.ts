import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dtos/create-category.dto';
import { UpdateCategoryDto } from './dtos/update-category.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('Categories') // Agrupa los endpoints bajo la categoría "Categories"
@Controller('categories')
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

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
  @ApiOperation({ summary: 'Listar todas las categorías' })
  @ApiResponse({
    status: 200,
    description: 'Lista de categorías',
    type: [Object],
  })
  @ApiResponse({ status: 500, description: 'Error al obtener las categorías' })
  async findAll() {
    try {
      return await this.categoriesService.findAll();
    } catch (error) {
      throw new InternalServerErrorException('Error al obtener las categorías');
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una categoría por ID' })
  @ApiParam({
    name: 'id',
    description: 'ID de la categoría (UUID)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Detalle de la categoría',
    type: Object,
  })
  @ApiResponse({ status: 400, description: 'ID no válido' })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  @ApiResponse({ status: 500, description: 'Error al obtener la categoría' })
  async findOne(@Param('id') id: string) {
    // Validar que id sea un UUID válido
    console.log('findOne - id recibido:', id);
    this.validateId(id);

    try {
      return await this.categoriesService.findOne(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al obtener la categoría');
    }
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth') // Requiere autenticación JWT
  @ApiOperation({ summary: 'Crear una nueva categoría (solo ADMIN)' })
  @ApiBody({ type: CreateCategoryDto })
  @ApiResponse({ status: 201, description: 'Categoría creada', type: Object })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Rol insuficiente' })
  @ApiResponse({ status: 500, description: 'Error al crear la categoría' })
  async create(@Body() createCategoryDto: CreateCategoryDto) {
    // Validar que createCategoryDto no sea nulo o vacío
    if (!createCategoryDto || Object.keys(createCategoryDto).length === 0) {
      throw new BadRequestException(
        'El cuerpo de la solicitud no puede estar vacío',
      );
    }

    try {
      return await this.categoriesService.create(createCategoryDto);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al crear la categoría');
    }
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Actualizar una categoría (solo ADMIN)' })
  @ApiParam({
    name: 'id',
    description: 'ID de la categoría (UUID)',
    type: String,
  })
  @ApiBody({ type: UpdateCategoryDto })
  @ApiResponse({
    status: 200,
    description: 'Categoría actualizada',
    type: Object,
  })
  @ApiResponse({ status: 400, description: 'ID o datos inválidos' })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Rol insuficiente' })
  @ApiResponse({ status: 500, description: 'Error al actualizar la categoría' })
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    // Validar que id sea un UUID válido
    console.log('update - id recibido:', id);
    this.validateId(id);

    // Validar que updateCategoryDto no sea nulo o vacío
    if (!updateCategoryDto || Object.keys(updateCategoryDto).length === 0) {
      throw new BadRequestException(
        'El cuerpo de la solicitud no puede estar vacío',
      );
    }

    try {
      return await this.categoriesService.update(id, updateCategoryDto);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error al actualizar la categoría',
      );
    }
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Eliminar una categoría (solo ADMIN)' })
  @ApiParam({
    name: 'id',
    description: 'ID de la categoría (UUID)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Categoría eliminada',
    type: Object,
  })
  @ApiResponse({ status: 400, description: 'ID no válido' })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Rol insuficiente' })
  @ApiResponse({ status: 500, description: 'Error al eliminar la categoría' })
  async remove(@Param('id') id: string) {
    // Validar que id sea un UUID válido
    console.log('remove - id recibido:', id);
    this.validateId(id);

    try {
      return await this.categoriesService.remove(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al eliminar la categoría');
    }
  }
}
