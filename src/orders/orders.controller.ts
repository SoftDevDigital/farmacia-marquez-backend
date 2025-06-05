import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dtos/create-order.dto';
import { UpdateOrderDto } from './dtos/update-order.dto';
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

@ApiTags('Orders') // Agrupa los endpoints bajo la categoría "Orders"
@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

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
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth') // Requiere autenticación JWT
  @ApiOperation({ summary: 'Listar todos los pedidos del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Lista de pedidos', type: [Object] })
  @ApiResponse({ status: 400, description: 'ID de usuario no válido' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 500, description: 'Error al obtener los pedidos' })
  async findAll(@Request() req: any) {
    // Validar que req.user._id esté presente y sea un UUID válido
    console.log('findAll - userId recibido:', req.user._id);
    this.validateId(req.user._id, 'userId');

    try {
      return await this.ordersService.findAll(req.user._id);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al obtener los pedidos');
    }
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener un pedido por ID del usuario autenticado' })
  @ApiParam({ name: 'id', description: 'ID del pedido (UUID)', type: String })
  @ApiResponse({ status: 200, description: 'Detalle del pedido', type: Object })
  @ApiResponse({ status: 400, description: 'ID no válido' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Pedido no encontrado' })
  @ApiResponse({ status: 500, description: 'Error al obtener el pedido' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    // Validar que id y req.user._id estén presentes y sean UUIDs válidos
    console.log('findOne - id recibido:', id);
    this.validateId(id, 'id');
    console.log('findOne - userId recibido:', req.user._id);
    this.validateId(req.user._id, 'userId');

    try {
      return await this.ordersService.findOne(id, req.user._id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Error al obtener el pedido');
    }
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Crear un nuevo pedido para el usuario autenticado',
  })
  @ApiBody({ type: CreateOrderDto })
  @ApiResponse({ status: 201, description: 'Pedido creado', type: Object })
  @ApiResponse({ status: 400, description: 'Datos inválidos o ID no válido' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({ status: 500, description: 'Error al crear el pedido' })
  async create(@Request() req: any, @Body() createOrderDto: CreateOrderDto) {
    // Validar que req.user._id esté presente y sea un UUID válido
    console.log('create - userId recibido:', req.user._id);
    this.validateId(req.user._id, 'userId');

    // Validar que createOrderDto no sea nulo o vacío
    if (!createOrderDto || Object.keys(createOrderDto).length === 0) {
      throw new BadRequestException(
        'El cuerpo de la solicitud no puede estar vacío',
      );
    }

    try {
      return await this.ordersService.create(req.user._id, createOrderDto);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Error al crear el pedido');
    }
  }

  @Post('from-cart')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Crear un pedido a partir del carrito del usuario autenticado',
  })
  @ApiResponse({
    status: 201,
    description: 'Pedido creado desde el carrito',
    type: Object,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            order: { type: 'object' },
            removedItems: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'ID no válido' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Carrito o usuario no encontrado' })
  @ApiResponse({
    status: 500,
    description: 'Error al crear el pedido desde el carrito',
  })
  async createFromCart(@Request() req: any) {
    // Validar que req.user._id esté presente y sea un UUID válido
    console.log('createFromCart - userId recibido:', req.user._id);
    this.validateId(req.user._id, 'userId');

    try {
      const result = await this.ordersService.createFromCart(req.user._id);
      return result; // Devuelve { order, removedItems? }
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error al crear el pedido desde el carrito',
      );
    }
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Actualizar un pedido (solo ADMIN)' })
  @ApiParam({ name: 'id', description: 'ID del pedido (UUID)', type: String })
  @ApiBody({ type: UpdateOrderDto })
  @ApiResponse({ status: 200, description: 'Pedido actualizado', type: Object })
  @ApiResponse({ status: 400, description: 'Datos inválidos o ID no válido' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Rol insuficiente' })
  @ApiResponse({ status: 404, description: 'Pedido no encontrado' })
  @ApiResponse({ status: 500, description: 'Error al actualizar el pedido' })
  async update(
    @Param('id') id: string,
    @Request() req: any,
    @Body() updateOrderDto: UpdateOrderDto,
  ) {
    // Validar que id y req.user._id estén presentes y sean UUIDs válidos
    console.log('update - id recibido:', id);
    this.validateId(id, 'id');
    console.log('update - userId recibido:', req.user._id);
    this.validateId(req.user._id, 'userId');

    // Validar que updateOrderDto no sea nulo o vacío
    if (!updateOrderDto || Object.keys(updateOrderDto).length === 0) {
      throw new BadRequestException(
        'El cuerpo de la solicitud no puede estar vacío',
      );
    }

    try {
      return await this.ordersService.update(id, req.user._id, updateOrderDto);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Error al actualizar el pedido');
    }
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Eliminar un pedido del usuario autenticado' })
  @ApiParam({ name: 'id', description: 'ID del pedido (UUID)', type: String })
  @ApiResponse({
    status: 200,
    description: 'Pedido eliminado',
    type: Object,
    example: { message: 'Pedido eliminado exitosamente' },
  })
  @ApiResponse({ status: 400, description: 'ID no válido' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Pedido no encontrado' })
  @ApiResponse({ status: 500, description: 'Error al eliminar el pedido' })
  async remove(@Param('id') id: string, @Request() req: any) {
    // Validar que id y req.user._id estén presentes y sean UUIDs válidos
    console.log('remove - id recibido:', id);
    this.validateId(id, 'id');
    console.log('remove - userId recibido:', req.user._id);
    this.validateId(req.user._id, 'userId');

    try {
      await this.ordersService.remove(id, req.user._id);
      return { message: 'Pedido eliminado exitosamente' };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Error al eliminar el pedido');
    }
  }
}
