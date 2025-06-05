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
import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dtos/create-brand.dto';
import { UpdateBrandDto } from './dtos/update-brand.dto';
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

@ApiTags('Brands') // Agrupa los endpoints bajo la categoría "Brands"
@Controller('brands')
export class BrandsController {
  constructor(private brandsService: BrandsService) {}

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
  @ApiOperation({ summary: 'Listar todas las marcas' })
  @ApiResponse({ status: 200, description: 'Lista de marcas', type: [Object] })
  @ApiResponse({ status: 500, description: 'Error al obtener las marcas' })
  async findAll() {
    try {
      return await this.brandsService.findAll();
    } catch (error) {
      throw new InternalServerErrorException('Error al obtener las marcas');
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una marca por ID' })
  @ApiParam({ name: 'id', description: 'ID de la marca (UUID)', type: String })
  @ApiResponse({
    status: 200,
    description: 'Detalle de la marca',
    type: Object,
  })
  @ApiResponse({ status: 400, description: 'ID no válido' })
  @ApiResponse({ status: 404, description: 'Marca no encontrada' })
  @ApiResponse({ status: 500, description: 'Error al obtener la marca' })
  async findOne(@Param('id') id: string) {
    // Validar que id sea un UUID válido
    console.log('findOne - id recibido:', id);
    this.validateId(id);

    try {
      return await this.brandsService.findOne(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al obtener la marca');
    }
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth') // Requiere autenticación JWT
  @ApiOperation({ summary: 'Crear una nueva marca (solo ADMIN)' })
  @ApiBody({ type: CreateBrandDto })
  @ApiResponse({ status: 201, description: 'Marca creada', type: Object })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Rol insuficiente' })
  @ApiResponse({ status: 500, description: 'Error al crear la marca' })
  async create(@Body() createBrandDto: CreateBrandDto) {
    // Validar que createBrandDto no sea nulo o vacío
    if (!createBrandDto || Object.keys(createBrandDto).length === 0) {
      throw new BadRequestException(
        'El cuerpo de la solicitud no puede estar vacío',
      );
    }

    try {
      return await this.brandsService.create(createBrandDto);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al crear la marca');
    }
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Actualizar una marca (solo ADMIN)' })
  @ApiParam({ name: 'id', description: 'ID de la marca (UUID)', type: String })
  @ApiBody({ type: UpdateBrandDto })
  @ApiResponse({ status: 200, description: 'Marca actualizada', type: Object })
  @ApiResponse({ status: 400, description: 'ID o datos inválidos' })
  @ApiResponse({ status: 404, description: 'Marca no encontrada' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Rol insuficiente' })
  @ApiResponse({ status: 500, description: 'Error al actualizar la marca' })
  async update(
    @Param('id') id: string,
    @Body() updateBrandDto: UpdateBrandDto,
  ) {
    // Validar que id sea un UUID válido
    console.log('update - id recibido:', id);
    this.validateId(id);

    // Validar que updateBrandDto no sea nulo o vacío
    if (!updateBrandDto || Object.keys(updateBrandDto).length === 0) {
      throw new BadRequestException(
        'El cuerpo de la solicitud no puede estar vacío',
      );
    }

    try {
      return await this.brandsService.update(id, updateBrandDto);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al actualizar la marca');
    }
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Eliminar una marca (solo ADMIN)' })
  @ApiParam({ name: 'id', description: 'ID de la marca (UUID)', type: String })
  @ApiResponse({ status: 200, description: 'Marca eliminada', type: Object })
  @ApiResponse({ status: 400, description: 'ID no válido' })
  @ApiResponse({ status: 404, description: 'Marca no encontrada' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Rol insuficiente' })
  @ApiResponse({ status: 500, description: 'Error al eliminar la marca' })
  async remove(@Param('id') id: string) {
    // Validar que id sea un UUID válido
    console.log('remove - id recibido:', id);
    this.validateId(id);

    try {
      return await this.brandsService.remove(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al eliminar la marca');
    }
  }
}
