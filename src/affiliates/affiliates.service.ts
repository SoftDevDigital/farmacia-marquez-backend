import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Affiliate } from './schemas/affiliates.schema';
import { CreateAffiliateDto } from './dtos/create-affiliate.dto';
import { UpdateAffiliateDto } from './dtos/update-affiliate.dto';

@Injectable()
export class AffiliatesService {
  private readonly logger = new Logger(AffiliatesService.name);

  constructor(
    @InjectModel(Affiliate.name) private affiliateModel: Model<Affiliate>,
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

  // Función auxiliar para validar DNI
  private validateDni(dni: string): void {
    const dniRegex = /^\d{7,8}$/; // Ejemplo: DNI debe ser solo números y tener 7 u 8 dígitos
    if (!dni || !dniRegex.test(dni)) {
      throw new BadRequestException(
        'El DNI debe contener solo números y tener 7 u 8 dígitos',
      );
    }
  }

  // Función auxiliar para validar email
  private validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      throw new BadRequestException('El email no tiene un formato válido');
    }
  }

  // Función auxiliar para validar número de teléfono
  private validatePhoneNumber(phoneNumber: string): void {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneNumber || !phoneRegex.test(phoneNumber)) {
      throw new BadRequestException(
        'El número de teléfono no tiene un formato válido',
      );
    }
  }

  // Función auxiliar para validar fechas y edad mínima
  private validateBirthDate(birthDate: string): Date {
    const parsedDate = new Date(birthDate);
    if (isNaN(parsedDate.getTime())) {
      throw new BadRequestException('La fecha de nacimiento no es válida');
    }

    // Verificar que el afiliado sea mayor de 18 años
    const today = new Date();
    let age = today.getFullYear() - parsedDate.getFullYear();
    const monthDiff = today.getMonth() - parsedDate.getMonth();
    const dayDiff = today.getDate() - parsedDate.getDate();
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      age -= 1; // Corregir el cálculo de la edad
    }
    if (age < 18) {
      throw new BadRequestException('El afiliado debe ser mayor de 18 años');
    }

    return parsedDate;
  }

  // Función auxiliar para validar campos requeridos y subcampos
  private validateAffiliateFields(
    dto: CreateAffiliateDto | UpdateAffiliateDto,
    isUpdate: boolean = false,
  ): void {
    const requiredFields = [
      'firstName',
      'lastName',
      'dni',
      'birthDate',
      'gender',
      'phoneNumber',
      'email',
      'address',
      'healthInsurance',
    ];

    for (const field of requiredFields) {
      if (!isUpdate || (isUpdate && dto[field] !== undefined)) {
        if (!dto[field]) {
          throw new BadRequestException(`El campo ${field} es requerido`);
        }
      }
    }

    // Validar formatos
    if (dto.firstName && typeof dto.firstName !== 'string') {
      throw new BadRequestException('firstName debe ser una cadena de texto');
    }
    if (dto.lastName && typeof dto.lastName !== 'string') {
      throw new BadRequestException('lastName debe ser una cadena de texto');
    }
    if (dto.gender && typeof dto.gender !== 'string') {
      throw new BadRequestException('gender debe ser una cadena de texto');
    }
    if (dto.dni) this.validateDni(dto.dni);
    if (dto.birthDate) this.validateBirthDate(dto.birthDate);
    if (dto.phoneNumber) this.validatePhoneNumber(dto.phoneNumber);
    if (dto.email) this.validateEmail(dto.email);

    // Validar subcampos de address
    if (dto.address) {
      const requiredAddressFields = [
        'street',
        'streetNumber',
        'city',
        'state',
        'postalCode',
        'country',
      ];
      for (const field of requiredAddressFields) {
        if (!isUpdate || (isUpdate && dto.address[field] !== undefined)) {
          if (!dto.address[field] || typeof dto.address[field] !== 'string') {
            throw new BadRequestException(
              `address.${field} debe ser una cadena de texto no vacía`,
            );
          }
        }
      }
      if (dto.address.apartment && typeof dto.address.apartment !== 'string') {
        throw new BadRequestException(
          'address.apartment debe ser una cadena de texto',
        );
      }
    }

    // Validar subcampos de healthInsurance
    if (dto.healthInsurance) {
      const requiredHealthFields = ['name', 'affiliateNumber'];
      for (const field of requiredHealthFields) {
        if (
          !isUpdate ||
          (isUpdate && dto.healthInsurance[field] !== undefined)
        ) {
          if (
            !dto.healthInsurance[field] ||
            typeof dto.healthInsurance[field] !== 'string'
          ) {
            throw new BadRequestException(
              `healthInsurance.${field} debe ser una cadena de texto no vacía`,
            );
          }
        }
      }
      if (
        dto.healthInsurance.plan &&
        typeof dto.healthInsurance.plan !== 'string'
      ) {
        throw new BadRequestException(
          'healthInsurance.plan debe ser una cadena de texto',
        );
      }
    }
  }

  async create(createAffiliateDto: CreateAffiliateDto): Promise<Affiliate> {
    // Validar que createAffiliateDto no sea nulo o vacío
    if (!createAffiliateDto || Object.keys(createAffiliateDto).length === 0) {
      throw new BadRequestException(
        'El cuerpo de la solicitud no puede estar vacío',
      );
    }

    // Validar los campos de createAffiliateDto
    this.validateAffiliateFields(createAffiliateDto);

    try {
      // Verificar si ya existe un afiliado con el mismo DNI
      const existingAffiliate = await this.affiliateModel
        .findOne({ dni: createAffiliateDto.dni })
        .exec();
      if (existingAffiliate) {
        throw new BadRequestException('Ya existe un afiliado con este DNI');
      }

      const affiliate = new this.affiliateModel(createAffiliateDto);
      return await affiliate.save();
    } catch (error: unknown) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      if ((error as { code?: number }).code === 11000) {
        // Error de duplicado en MongoDB
        throw new BadRequestException('Ya existe un afiliado con este DNI');
      }
      this.logger.error(
        `Error al crear el afiliado: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException('Error al crear el afiliado');
    }
  }

  async findAll(): Promise<Affiliate[]> {
    try {
      return await this.affiliateModel.find().exec();
    } catch (error: unknown) {
      this.logger.error(
        `Error al obtener los afiliados: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException('Error al obtener los afiliados');
    }
  }

  async findOne(id: string): Promise<Affiliate> {
    // Validar el ID
    this.validateId(id);

    try {
      const affiliate = await this.affiliateModel.findById(id).exec();
      if (!affiliate) {
        throw new NotFoundException('Afiliado no encontrado');
      }
      return affiliate;
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
        `Error al buscar el afiliado: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException('Error al buscar el afiliado');
    }
  }

  async update(
    id: string,
    updateAffiliateDto: UpdateAffiliateDto,
  ): Promise<Affiliate> {
    // Validar el ID
    this.validateId(id);

    // Validar que updateAffiliateDto no sea nulo o vacío
    if (!updateAffiliateDto || Object.keys(updateAffiliateDto).length === 0) {
      throw new BadRequestException(
        'El cuerpo de la solicitud no puede estar vacío',
      );
    }

    // Validar los campos de updateAffiliateDto
    this.validateAffiliateFields(updateAffiliateDto, true);

    try {
      // Si se intenta actualizar el DNI, verificar que no exista otro afiliado con el mismo DNI
      if (updateAffiliateDto.dni) {
        const existingAffiliate = await this.affiliateModel
          .findOne({ dni: updateAffiliateDto.dni, _id: { $ne: id } })
          .exec();
        if (existingAffiliate) {
          throw new BadRequestException('Ya existe otro afiliado con este DNI');
        }
      }

      const affiliate = await this.affiliateModel
        .findByIdAndUpdate(id, { $set: updateAffiliateDto }, { new: true })
        .exec();
      if (!affiliate) {
        throw new NotFoundException('Afiliado no encontrado');
      }
      return affiliate;
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
      if ((error as { code?: number }).code === 11000) {
        // Error de duplicado en MongoDB
        throw new BadRequestException('Ya existe un afiliado con este DNI');
      }
      this.logger.error(
        `Error al actualizar el afiliado: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException('Error al actualizar el afiliado');
    }
  }

  async remove(id: string): Promise<void> {
    // Validar el ID
    this.validateId(id);

    try {
      const result = await this.affiliateModel.deleteOne({ _id: id }).exec();
      if (result.deletedCount === 0) {
        throw new NotFoundException('Afiliado no encontrado');
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
      this.logger.error(
        `Error al eliminar el afiliado: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException('Error al eliminar el afiliado');
    }
  }
}
