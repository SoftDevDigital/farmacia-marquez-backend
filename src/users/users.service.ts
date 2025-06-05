import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../auth/schemas/users.schema';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UpdateShippingInfoDto } from './dtos/update-shipping-info.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  // Función auxiliar para validar IDs como UUIDs
  private validateId(id: string): void {
    if (!id || id.trim() === '') {
      throw new BadRequestException('El ID no puede estar vacío');
    }
    const uuidRegex =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(id)) {
      throw new BadRequestException(
        'El ID no tiene un formato válido (debe ser un UUID)',
      );
    }
  }

  async findOne(id: string): Promise<User> {
    // Validar el ID
    console.log('findOne - id recibido:', id);
    this.validateId(id);

    try {
      const user = await this.userModel.findById(id).exec();
      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }
      return user;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if ((error as Error).name === 'CastError') {
        throw new BadRequestException(
          'El ID no tiene un formato válido (debe ser un UUID)',
        );
      }
      throw new InternalServerErrorException('Error al buscar el usuario');
    }
  }

  async findEmailById(id: string): Promise<string> {
    // Validar el ID
    console.log('findEmailById - id recibido:', id);
    this.validateId(id);

    try {
      const user = await this.findOne(id);
      return user.email;
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error al obtener el correo del usuario',
      );
    }
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    // Validar el ID
    console.log('update - id recibido:', id);
    this.validateId(id);

    // Validar que updateUserDto no sea nulo o vacío
    if (!updateUserDto || Object.keys(updateUserDto).length === 0) {
      throw new BadRequestException(
        'El cuerpo de la solicitud no puede estar vacío',
      );
    }

    try {
      const user = await this.userModel
        .findByIdAndUpdate(id, { $set: updateUserDto }, { new: true })
        .exec();
      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }
      return user;
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
      throw new InternalServerErrorException('Error al actualizar el usuario');
    }
  }

  async updateShippingInfo(
    id: string,
    updateShippingInfoDto: UpdateShippingInfoDto,
  ): Promise<{ status: number; user: User }> {
    // Validar el ID
    console.log('updateShippingInfo - id recibido:', id);
    this.validateId(id);

    // Validar que updateShippingInfoDto no sea nulo o vacío
    if (
      !updateShippingInfoDto ||
      Object.keys(updateShippingInfoDto).length === 0
    ) {
      throw new BadRequestException(
        'El cuerpo de la solicitud no puede estar vacío',
      );
    }

    // Validar los campos requeridos si se proporcionan
    const requiredFields = [
      'recipientName',
      'phoneNumber',
      'documentNumber',
      'street',
      'streetNumber',
      'city',
      'state',
      'postalCode',
      'country',
    ];
    for (const field of requiredFields) {
      if (
        updateShippingInfoDto[field] &&
        typeof updateShippingInfoDto[field] !== 'string'
      ) {
        throw new BadRequestException(
          `El campo ${field} debe ser una cadena de texto válida`,
        );
      }
      if (updateShippingInfoDto[field] === '') {
        throw new BadRequestException(`El campo ${field} no puede estar vacío`);
      }
    }

    // Validar el formato del teléfono si se proporciona
    if (updateShippingInfoDto.phoneNumber) {
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(updateShippingInfoDto.phoneNumber)) {
        throw new BadRequestException(
          'El número de teléfono no tiene un formato válido',
        );
      }
    }

    try {
      const user = await this.userModel
        .findByIdAndUpdate(
          id,
          { $set: { shippingInfo: updateShippingInfoDto } },
          { new: true },
        )
        .exec();
      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }
      return {
        status: 2001,
        user,
      };
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
      throw new InternalServerErrorException(
        'Error al actualizar la información de envío',
      );
    }
  }
}
