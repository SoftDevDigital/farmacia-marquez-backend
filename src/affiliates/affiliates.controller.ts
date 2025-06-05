import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { AffiliatesService } from './affiliates.service';
import { CreateAffiliateDto } from './dtos/create-affiliate.dto';
import { UpdateAffiliateDto } from './dtos/update-affiliate.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Affiliates')
@Controller('affiliates')
export class AffiliatesController {
  private readonly logger = new Logger(AffiliatesController.name);

  constructor(private readonly affiliatesService: AffiliatesService) {}

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

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear un nuevo afiliado (solo ADMIN)' })
  @ApiBody({ type: CreateAffiliateDto })
  @ApiResponse({ status: 201, description: 'Afiliado creado', type: Object })
  @ApiResponse({ status: 400, description: 'Datos inválidos o DNI duplicado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado (solo ADMIN)' })
  @ApiResponse({ status: 500, description: 'Error al crear el afiliado' })
  async create(@Body() createAffiliateDto: CreateAffiliateDto) {
    // Validar que createAffiliateDto no sea nulo o vacío
    if (!createAffiliateDto || Object.keys(createAffiliateDto).length === 0) {
      throw new BadRequestException(
        'El cuerpo de la solicitud no puede estar vacío',
      );
    }

    try {
      return await this.affiliatesService.create(createAffiliateDto);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Error al crear el afiliado: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('Error al crear el afiliado');
    }
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener todos los afiliados (solo ADMIN)' })
  @ApiResponse({
    status: 200,
    description: 'Lista de afiliados',
    type: [Object],
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado (solo ADMIN)' })
  @ApiResponse({ status: 500, description: 'Error al obtener los afiliados' })
  async findAll() {
    try {
      return await this.affiliatesService.findAll();
    } catch (error) {
      this.logger.error(
        `Error al obtener los afiliados: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('Error al obtener los afiliados');
    }
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener un afiliado por ID (solo ADMIN)' })
  @ApiParam({ name: 'id', description: 'ID del afiliado (UUID)', type: String })
  @ApiResponse({
    status: 200,
    description: 'Afiliado encontrado',
    type: Object,
  })
  @ApiResponse({ status: 400, description: 'ID no válido' })
  @ApiResponse({ status: 404, description: 'Afiliado no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado (solo ADMIN)' })
  @ApiResponse({ status: 500, description: 'Error al obtener el afiliado' })
  async findOne(@Param('id') id: string) {
    // Validar que id sea un UUID válido
    console.log('findOne - id recibido:', id);
    this.validateId(id);

    try {
      return await this.affiliatesService.findOne(id);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Error al obtener el afiliado: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('Error al obtener el afiliado');
    }
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Actualizar un afiliado por ID (solo ADMIN)' })
  @ApiParam({ name: 'id', description: 'ID del afiliado (UUID)', type: String })
  @ApiBody({ type: UpdateAffiliateDto })
  @ApiResponse({
    status: 200,
    description: 'Afiliado actualizado',
    type: Object,
  })
  @ApiResponse({
    status: 400,
    description: 'ID o datos inválidos, o DNI duplicado',
  })
  @ApiResponse({ status: 404, description: 'Afiliado no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado (solo ADMIN)' })
  @ApiResponse({ status: 500, description: 'Error al actualizar el afiliado' })
  async update(
    @Param('id') id: string,
    @Body() updateAffiliateDto: UpdateAffiliateDto,
  ) {
    // Validar que id sea un UUID válido
    console.log('update - id recibido:', id);
    this.validateId(id);

    // Validar que updateAffiliateDto no sea nulo o vacío
    if (!updateAffiliateDto || Object.keys(updateAffiliateDto).length === 0) {
      throw new BadRequestException(
        'El cuerpo de la solicitud no puede estar vacío',
      );
    }

    try {
      return await this.affiliatesService.update(id, updateAffiliateDto);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Error al actualizar el afiliado: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('Error al actualizar el afiliado');
    }
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Eliminar un afiliado por ID (solo ADMIN)' })
  @ApiParam({ name: 'id', description: 'ID del afiliado (UUID)', type: String })
  @ApiResponse({ status: 200, description: 'Afiliado eliminado', type: Object })
  @ApiResponse({ status: 400, description: 'ID no válido' })
  @ApiResponse({ status: 404, description: 'Afiliado no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado (solo ADMIN)' })
  @ApiResponse({ status: 500, description: 'Error al eliminar el afiliado' })
  async remove(@Param('id') id: string) {
    // Validar que id sea un UUID válido
    console.log('remove - id recibido:', id);
    this.validateId(id);

    try {
      await this.affiliatesService.remove(id);
      return { message: 'Afiliado eliminado exitosamente' };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Error al eliminar el afiliado: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('Error al eliminar el afiliado');
    }
  }
}
