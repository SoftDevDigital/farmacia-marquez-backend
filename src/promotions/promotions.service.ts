import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Promotion } from './schemas/promotions.schema';
import { Product } from '../products/schemas/products.schema';
import { PromotionType } from './enums/promotion-type.enum';
import { CreatePromotionDto } from './dtos/create-promotion.dto';
import { UpdatePromotionDto } from './dtos/update-promotion.dto';
import { PromotionFilterDto } from './dtos/promotion-filter.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PromotionsService {
  constructor(
    @InjectModel(Promotion.name) private promotionModel: Model<Promotion>,
    @InjectModel(Product.name) private productModel: Model<Product>, // Inyectar el modelo Product
  ) {}

  // Función auxiliar para validar UUIDs
  private validateUUID(id: string, fieldName: string = 'ID'): void {
    const uuidRegex =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!id || id.trim() === '') {
      throw new BadRequestException(`El ${fieldName} no puede estar vacío`);
    }
    if (!uuidRegex.test(id)) {
      throw new BadRequestException(
        `El ${fieldName} no tiene el formato correcto de un UUID`,
      );
    }
  }

  // Función auxiliar para validar cantidades y porcentajes
  private validateNumber(
    value: number,
    fieldName: string,
    allowZero: boolean = false,
  ): void {
    if (typeof value !== 'number' || (allowZero ? value < 0 : value <= 0)) {
      throw new BadRequestException(
        `El ${fieldName} debe ser un número ${allowZero ? 'no negativo' : 'positivo'}`,
      );
    }
  }

  // Función auxiliar para validar fechas
  private validateDates(
    startDate: Date,
    endDate: Date,
    startField: string = 'startDate',
    endField: string = 'endDate',
  ): void {
    if (isNaN(startDate.getTime())) {
      throw new BadRequestException(`El ${startField} no es una fecha válida`);
    }
    if (isNaN(endDate.getTime())) {
      throw new BadRequestException(`El ${endField} no es una fecha válida`);
    }
    if (startDate >= endDate) {
      throw new BadRequestException(
        `${startField} debe ser anterior a ${endField}`,
      );
    }
  }

  // Función auxiliar para obtener información de los productos asociados
  private async getProductsInfo(
    productIds: string[],
  ): Promise<{ id: string; name: string }[]> {
    const productsInfo: { id: string; name: string }[] = [];
    for (const productId of productIds) {
      try {
        const product = await this.productModel
          .findOne({ _id: productId })
          .exec();
        if (product) {
          productsInfo.push({
            id: productId,
            name: product.name,
          });
        } else {
          productsInfo.push({
            id: productId,
            name: 'Producto no encontrado',
          });
        }
      } catch (error) {
        productsInfo.push({
          id: productId,
          name: 'Error al obtener el producto',
        });
      }
    }
    return productsInfo;
  }

  async create(createPromotionDto: CreatePromotionDto): Promise<Promotion> {
    // Validar que createPromotionDto no sea nulo o vacío
    if (!createPromotionDto || Object.keys(createPromotionDto).length === 0) {
      throw new BadRequestException(
        'El cuerpo de la solicitud no puede estar vacío',
      );
    }

    // Validar los campos de createPromotionDto
    if (
      !createPromotionDto.type ||
      !Object.values(PromotionType).includes(createPromotionDto.type)
    ) {
      throw new BadRequestException(
        `El tipo de promoción debe ser uno de: ${Object.values(PromotionType).join(', ')}`,
      );
    }
    if (
      !createPromotionDto.productIds ||
      !Array.isArray(createPromotionDto.productIds) ||
      createPromotionDto.productIds.length === 0
    ) {
      throw new BadRequestException(
        'Los productIds deben ser un arreglo no vacío',
      );
    }
    for (const productId of createPromotionDto.productIds) {
      this.validateUUID(productId, 'productId');
    }
    if (!createPromotionDto.startDate || !createPromotionDto.endDate) {
      throw new BadRequestException('startDate y endDate son requeridos');
    }
    const startDate = new Date(createPromotionDto.startDate);
    const endDate = new Date(createPromotionDto.endDate);
    this.validateDates(startDate, endDate);

    // Validar campos específicos según el tipo de promoción
    if (createPromotionDto.type === PromotionType.NXN) {
      if (
        createPromotionDto.buyQuantity === undefined ||
        createPromotionDto.getQuantity === undefined
      ) {
        throw new BadRequestException(
          'buyQuantity y getQuantity son requeridos para promociones NXN',
        );
      }
      this.validateNumber(createPromotionDto.buyQuantity, 'buyQuantity');
      this.validateNumber(createPromotionDto.getQuantity, 'getQuantity', true);
    } else if (
      createPromotionDto.type === PromotionType.PERCENTAGE ||
      createPromotionDto.type === PromotionType.PERCENT_SECOND
    ) {
      if (createPromotionDto.discountPercentage === undefined) {
        throw new BadRequestException(
          'discountPercentage es requerido para promociones PERCENTAGE y PERCENT_SECOND',
        );
      }
      if (
        createPromotionDto.discountPercentage < 0 ||
        createPromotionDto.discountPercentage > 100
      ) {
        throw new BadRequestException(
          'discountPercentage debe estar entre 0 y 100',
        );
      }
    } else if (createPromotionDto.type === PromotionType.FIXED) {
      if (createPromotionDto.discountAmount === undefined) {
        throw new BadRequestException(
          'discountAmount es requerido para promociones FIXED',
        );
      }
      this.validateNumber(
        createPromotionDto.discountAmount,
        'discountAmount',
        true,
      );
    }

    // Generar un UUID para el campo _id
    const promotionData = {
      ...createPromotionDto,
      _id: uuidv4(),
    };

    try {
      // Validar que no exista otra promoción del mismo tipo para los mismos productos
      const existingPromotions = await this.promotionModel
        .find({
          type: promotionData.type,
          productIds: { $in: promotionData.productIds },
          isActive: true,
          startDate: { $lte: new Date() },
          endDate: { $gte: new Date() },
        })
        .exec();

      if (existingPromotions.length > 0) {
        const conflictingProductIds = existingPromotions
          .flatMap((promo) => promo.productIds)
          .filter((productId) => promotionData.productIds.includes(productId));
        throw new BadRequestException(
          `Ya existe una promoción activa del tipo ${promotionData.type} para los productos: ${conflictingProductIds.join(', ')}`,
        );
      }

      const promotion = new this.promotionModel(promotionData);
      return await promotion.save();
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al crear la promoción');
    }
  }

  async findAll(filter: PromotionFilterDto): Promise<any[]> {
    const query: any = {};

    // Validar los filtros
    if (filter.startDate) {
      const startDate = new Date(filter.startDate);
      if (isNaN(startDate.getTime())) {
        throw new BadRequestException('startDate no es una fecha válida');
      }
      query.startDate = { $gte: startDate };
    }
    if (filter.endDate) {
      const endDate = new Date(filter.endDate);
      if (isNaN(endDate.getTime())) {
        throw new BadRequestException('endDate no es una fecha válida');
      }
      query.endDate = { $lte: endDate };
    }
    if (filter.productId) {
      this.validateUUID(filter.productId, 'productId');
      query.productIds = filter.productId;
    }
    if (filter.type) {
      if (!Object.values(PromotionType).includes(filter.type)) {
        throw new BadRequestException(
          `El tipo de promoción debe ser uno de: ${Object.values(PromotionType).join(', ')}`,
        );
      }
      query.type = filter.type;
    }
    if (filter.minDiscountPercentage !== undefined) {
      if (
        filter.minDiscountPercentage < 0 ||
        filter.minDiscountPercentage > 100
      ) {
        throw new BadRequestException(
          'minDiscountPercentage debe estar entre 0 y 100',
        );
      }
      query.discountPercentage = { $gte: filter.minDiscountPercentage };
    }
    if (filter.maxDiscountPercentage !== undefined) {
      if (
        filter.maxDiscountPercentage < 0 ||
        filter.maxDiscountPercentage > 100
      ) {
        throw new BadRequestException(
          'maxDiscountPercentage debe estar entre 0 y 100',
        );
      }
      query.discountPercentage = {
        ...query.discountPercentage,
        $lte: filter.maxDiscountPercentage,
      };
    }

    try {
      const promotions = await this.promotionModel.find(query).exec();
      // Enriquecer cada promoción con información de los productos
      const enrichedPromotions: {
        products: { id: string; name: string }[];
        [key: string]: any;
      }[] = [];
      for (const promotion of promotions) {
        const productsInfo = await this.getProductsInfo(promotion.productIds);
        const enrichedPromotion: {
          products: { id: string; name: string }[];
          productIds?: string[];
          [key: string]: any;
        } = {
          ...promotion.toObject(),
          products: productsInfo,
        };
        delete enrichedPromotion.productIds; // Eliminar el campo productIds
        enrichedPromotions.push(enrichedPromotion);
      }
      return enrichedPromotions;
    } catch (error) {
      throw new InternalServerErrorException(
        'Error al obtener las promociones',
      );
    }
  }

  async findOne(id: string): Promise<any> {
    // Validar que el ID tenga el formato de un UUID
    this.validateUUID(id);

    try {
      const promotion = await this.promotionModel.findOne({ _id: id }).exec();
      if (!promotion) {
        throw new NotFoundException('Promoción no encontrada');
      }
      // Enriquecer la promoción con información de los productos
      const productsInfo = await this.getProductsInfo(promotion.productIds);
      const enrichedPromotion: {
        products: { id: string; name: string }[];
        productIds?: string[];
        [key: string]: any;
      } = {
        ...promotion.toObject(),
        products: productsInfo,
      };
      delete enrichedPromotion.productIds; // Eliminar el campo productIds
      return enrichedPromotion;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Error al buscar la promoción');
    }
  }

  async update(
    id: string,
    updatePromotionDto: UpdatePromotionDto,
  ): Promise<Promotion> {
    // Validar que el ID tenga el formato de un UUID
    this.validateUUID(id);

    // Validar que updatePromotionDto no sea nulo o vacío
    if (!updatePromotionDto || Object.keys(updatePromotionDto).length === 0) {
      throw new BadRequestException(
        'El cuerpo de la solicitud no puede estar vacío',
      );
    }

    try {
      // Obtener la promoción existente
      const promotion = await this.promotionModel.findOne({ _id: id }).exec();
      if (!promotion) {
        throw new NotFoundException('Promoción no encontrada');
      }

      // Validar los campos de updatePromotionDto
      if (updatePromotionDto.productIds) {
        if (
          !Array.isArray(updatePromotionDto.productIds) ||
          updatePromotionDto.productIds.length === 0
        ) {
          throw new BadRequestException(
            'Los productIds deben ser un arreglo no vacío',
          );
        }
        for (const productId of updatePromotionDto.productIds) {
          this.validateUUID(productId, 'productId');
        }
      }
      if (updatePromotionDto.type) {
        if (!Object.values(PromotionType).includes(updatePromotionDto.type)) {
          throw new BadRequestException(
            `El tipo de promoción debe ser uno de: ${Object.values(PromotionType).join(', ')}`,
          );
        }
      }

      // Determinar el tipo de promoción después de la actualización
      const newType = updatePromotionDto.type || promotion.type;
      const newProductIds =
        updatePromotionDto.productIds || promotion.productIds;

      // Validar que no exista otra promoción del mismo tipo para los mismos productos
      const existingPromotions = await this.promotionModel
        .find({
          _id: { $ne: id }, // Excluir la promoción actual
          type: newType,
          productIds: { $in: newProductIds },
          isActive: true,
          startDate: { $lte: new Date() },
          endDate: { $gte: new Date() },
        })
        .exec();

      if (existingPromotions.length > 0) {
        const conflictingProductIds = existingPromotions
          .flatMap((promo) => promo.productIds)
          .filter((productId) => newProductIds.includes(productId));
        throw new BadRequestException(
          `Ya existe una promoción activa del tipo ${newType} para los productos: ${conflictingProductIds.join(', ')}`,
        );
      }

      // Validar los campos requeridos según el tipo de promoción
      if (newType === PromotionType.NXN) {
        const buyQuantity =
          updatePromotionDto.buyQuantity !== undefined
            ? updatePromotionDto.buyQuantity
            : promotion.buyQuantity;
        const getQuantity =
          updatePromotionDto.getQuantity !== undefined
            ? updatePromotionDto.getQuantity
            : promotion.getQuantity;
        if (buyQuantity <= 0 || getQuantity < 0) {
          throw new BadRequestException(
            'Para promociones NXN, buyQuantity debe ser mayor que 0 y getQuantity no puede ser negativo',
          );
        }
      } else if (
        newType === PromotionType.PERCENTAGE ||
        newType === PromotionType.PERCENT_SECOND
      ) {
        const discountPercentage =
          updatePromotionDto.discountPercentage !== undefined
            ? updatePromotionDto.discountPercentage
            : promotion.discountPercentage;
        if (discountPercentage < 0 || discountPercentage > 100) {
          throw new BadRequestException(
            'Para promociones PERCENTAGE y PERCENT_SECOND, discountPercentage debe estar entre 0 y 100',
          );
        }
      } else if (newType === PromotionType.FIXED) {
        const discountAmount =
          updatePromotionDto.discountAmount !== undefined
            ? updatePromotionDto.discountAmount
            : promotion.discountAmount;
        if (discountAmount < 0) {
          throw new BadRequestException(
            'Para promociones FIXED, discountAmount debe ser mayor o igual a 0',
          );
        }
      }

      // Validar que las fechas sean válidas si se proporcionan
      if (updatePromotionDto.startDate || updatePromotionDto.endDate) {
        const startDate = updatePromotionDto.startDate
          ? new Date(updatePromotionDto.startDate)
          : promotion.startDate;
        const endDate = updatePromotionDto.endDate
          ? new Date(updatePromotionDto.endDate)
          : promotion.endDate;
        this.validateDates(startDate, endDate);
      }

      // Actualizar la promoción
      const updatedPromotion = await this.promotionModel
        .findOneAndUpdate(
          { _id: id },
          { $set: updatePromotionDto },
          { new: true, overwrite: false },
        )
        .exec();

      if (!updatedPromotion) {
        throw new NotFoundException(
          'Promoción no encontrada después de la actualización',
        );
      }

      return updatedPromotion;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error al actualizar la promoción',
      );
    }
  }

  async remove(id: string): Promise<void> {
    // Validar que el ID tenga el formato de un UUID
    this.validateUUID(id);

    try {
      const result = await this.promotionModel.deleteOne({ _id: id }).exec();
      if (result.deletedCount === 0) {
        throw new NotFoundException('Promoción no encontrada');
      }
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Error al eliminar la promoción');
    }
  }

  async getActivePromotionsForProduct(productId: string): Promise<Promotion[]> {
    // Validar productId
    this.validateUUID(productId, 'productId');

    try {
      const now = new Date();
      return await this.promotionModel
        .find({
          productIds: productId,
          isActive: true,
          startDate: { $lte: now },
          endDate: { $gte: now },
        })
        .exec();
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error al obtener las promociones activas',
      );
    }
  }

  async calculateDiscount(
    promotion: Promotion,
    quantity: number,
    unitPrice: number,
  ): Promise<number> {
    // Validar quantity y unitPrice
    this.validateNumber(quantity, 'quantity');
    this.validateNumber(unitPrice, 'unitPrice', true);

    // Validar que promotion tenga los campos necesarios según su tipo
    if (promotion.type === PromotionType.NXN) {
      if (
        promotion.buyQuantity === undefined ||
        promotion.getQuantity === undefined
      ) {
        throw new BadRequestException(
          'buyQuantity y getQuantity son requeridos para promociones NXN',
        );
      }
    } else if (
      promotion.type === PromotionType.PERCENTAGE ||
      promotion.type === PromotionType.PERCENT_SECOND
    ) {
      if (promotion.discountPercentage === undefined) {
        throw new BadRequestException(
          'discountPercentage es requerido para promociones PERCENTAGE y PERCENT_SECOND',
        );
      }
    } else if (promotion.type === PromotionType.FIXED) {
      if (promotion.discountAmount === undefined) {
        throw new BadRequestException(
          'discountAmount es requerido para promociones FIXED',
        );
      }
    }

    let discount = 0;

    try {
      switch (promotion.type) {
        case PromotionType.PERCENTAGE:
          discount =
            (unitPrice * quantity * (promotion.discountPercentage || 0)) / 100;
          break;

        case PromotionType.NXN:
          if (
            (promotion.buyQuantity || 0) > 0 &&
            (promotion.getQuantity || 0) >= 0 &&
            quantity >= 2 // Requiere al menos 2 unidades para aplicar el descuento
          ) {
            const totalUnits = quantity;
            const unitsToPay = Math.ceil(totalUnits / 2); // Paga 1 por cada 2 unidades
            const freeUnits = totalUnits - unitsToPay; // Unidades gratis
            discount = freeUnits * unitPrice;
          }
          break;

        case PromotionType.PERCENT_SECOND:
          if (quantity >= 2) {
            const discountedUnits = Math.floor(quantity / 2); // Número de segundas unidades con descuento
            const discountPerUnit =
              (unitPrice * (promotion.discountPercentage || 0)) / 100; // Descuento por unidad
            discount = discountedUnits * discountPerUnit; // Total del descuento
          }
          break;

        case PromotionType.FIXED:
          discount = (promotion.discountAmount || 0) * quantity;
          break;

        case PromotionType.BUNDLE:
          discount = 0; // No implementado aún
          break;

        default:
          discount = 0;
      }

      return discount;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al calcular el descuento');
    }
  }

  async calculateDiscountForCartItems(
    items: { productId: string; quantity: number; unitPrice: number }[],
  ): Promise<{ itemsWithDiscount: any[]; totalDiscount: number }> {
    // Validar que items sea un arreglo no vacío
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('Los ítems deben ser un arreglo no vacío');
    }

    // Validar cada ítem
    for (const item of items) {
      this.validateUUID(item.productId, 'productId');
      this.validateNumber(item.quantity, 'quantity');
      this.validateNumber(item.unitPrice, 'unitPrice', true);
    }

    const itemsWithDiscount: {
      productId: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
      discount: number;
      discountedSubtotal: number;
      appliedPromotion: string | null;
    }[] = [];
    let totalDiscount = 0;

    try {
      for (const item of items) {
        const promotions: Promotion[] =
          await this.getActivePromotionsForProduct(item.productId);
        let itemDiscount = 0;
        let appliedPromotion: Promotion | null = null;

        // Aplicar la mejor promoción disponible (la que ofrezca el mayor descuento)
        for (const promotion of promotions) {
          const discount = await this.calculateDiscount(
            promotion,
            item.quantity,
            item.unitPrice,
          );
          if (discount >= itemDiscount) {
            // Cambiado a >= para tomar la última promoción si hay empate
            itemDiscount = discount;
            appliedPromotion = promotion;
          }
        }

        const subtotal = item.quantity * item.unitPrice;
        const discountedSubtotal = subtotal - itemDiscount;
        totalDiscount += itemDiscount;

        itemsWithDiscount.push({
          ...item,
          subtotal,
          discount: itemDiscount,
          discountedSubtotal,
          appliedPromotion: appliedPromotion
            ? appliedPromotion._id.toString()
            : null,
        });
      }

      return { itemsWithDiscount, totalDiscount };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error al calcular los descuentos para los ítems del carrito',
      );
    }
  }

  getPromotionTypes(): string[] {
    return Object.values(PromotionType);
  }

  async findByType(
    type: PromotionType | 'ALL',
    isActive,
  ): Promise<Promotion[]> {
    if (type !== 'ALL' && !Object.values(PromotionType).includes(type)) {
      throw new BadRequestException(
        `El tipo de promoción debe ser uno de: ${Object.values(PromotionType).join(', ')} o 'ALL'`,
      );
    }

    const query: { isActive: boolean; type?: PromotionType } = { isActive };

    if (type !== 'ALL') query.type = type as PromotionType;

    try {
      const response = await this.promotionModel.find(query).exec();
      return response;
    } catch (error) {
      throw new InternalServerErrorException(
        'Error al buscar promociones por tipo',
      );
    }
  }

  async autoDeleteInactivePromotions(): Promise<boolean> {
    try {
      const date = new Date();
      date.setDate(date.getDate() - 1);
      const endDate = date.toISOString().slice(0, 10) + 'T23:59:59.000+0000';

      const result = await this.promotionModel
        .deleteMany({
          isActive: true,
          endDate: { $lte: endDate },
        })
        .exec();

      return result.deletedCount > 0;
    } catch (error) {
      throw new InternalServerErrorException(
        'Error al eliminar promociones inactivas',
      );
    }
  }
}
