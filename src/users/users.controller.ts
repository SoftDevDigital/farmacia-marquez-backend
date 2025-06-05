import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
  Request,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UpdateShippingInfoDto } from './dtos/update-shipping-info.dto';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('Users') // Agrupa los endpoints bajo la categoría "Users"
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  // Función auxiliar para validar el ID del usuario como UUID
  private validateUserId(userId: any): void {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new BadRequestException('El ID del usuario no es válido');
    }
    const uuidRegex =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(userId)) {
      throw new BadRequestException(
        'El ID del usuario no tiene un formato válido (debe ser un UUID)',
      );
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  @ApiBearerAuth('JWT-auth') // Requiere autenticación JWT
  @ApiOperation({ summary: 'Obtener el perfil del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil del usuario', type: Object })
  @ApiResponse({ status: 400, description: 'ID de usuario no válido' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({
    status: 500,
    description: 'Error al obtener el perfil del usuario',
  })
  async getProfile(@Request() req: any) {
    // Validar que req.user._id esté presente y sea un UUID válido
    console.log('getProfile - userId recibido:', req.user._id);
    this.validateUserId(req.user._id);

    try {
      return await this.usersService.findOne(req.user._id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException(
        'Error al obtener el perfil del usuario',
      );
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Actualizar el perfil del usuario autenticado' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, description: 'Perfil actualizado', type: Object })
  @ApiResponse({ status: 400, description: 'Datos inválidos o ID no válido' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({
    status: 500,
    description: 'Error al actualizar el perfil del usuario',
  })
  async updateProfile(
    @Request() req: any,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    // Validar que req.user._id esté presente y sea un UUID válido
    console.log('updateProfile - userId recibido:', req.user._id);
    this.validateUserId(req.user._id);

    // Validar que updateUserDto no sea nulo o vacío
    if (!updateUserDto || Object.keys(updateUserDto).length === 0) {
      throw new BadRequestException(
        'El cuerpo de la solicitud no puede estar vacío',
      );
    }

    try {
      return await this.usersService.update(req.user._id, updateUserDto);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException(
        'Error al actualizar el perfil del usuario',
      );
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('shipping-info')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Actualizar la información de envío del usuario autenticado',
  })
  @ApiBody({ type: UpdateShippingInfoDto })
  @ApiResponse({
    status: 200,
    description: 'Información de envío actualizada',
    type: Object,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos o ID no válido' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({
    status: 500,
    description: 'Error al actualizar la información de envío',
  })
  async updateShippingInfo(
    @Request() req: any,
    @Body() updateShippingInfoDto: UpdateShippingInfoDto,
  ) {
    // Validar que req.user._id esté presente y sea un UUID válido
    this.validateUserId(req.user._id);

    // Validar que updateShippingInfoDto no sea nulo o vacío
    if (
      !updateShippingInfoDto ||
      Object.keys(updateShippingInfoDto).length === 0
    ) {
      throw new BadRequestException(
        'El cuerpo de la solicitud no puede estar vacío',
      );
    }

    try {
      return await this.usersService.updateShippingInfo(
        req.user._id,
        updateShippingInfoDto,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException(
        'Error al actualizar la información de envío',
      );
    }
  }
}
