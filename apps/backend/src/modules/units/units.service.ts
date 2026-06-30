import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';

export interface ListUnitsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive' | 'all';
}

@Injectable()
export class UnitsService {
  constructor(private prisma: PrismaService) {}

  async list(query: ListUnitsQuery) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.status !== 'all') {
      where['isActive'] = query.status !== 'inactive';
    }
    if (query.search?.trim()) {
      const s = query.search.trim();
      where['OR'] = [
        { name: { contains: s, mode: 'insensitive' } },
        { symbol: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.unitOfMeasure.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: { baseUnit: { select: { id: true, name: true, symbol: true } } },
      }),
      this.prisma.unitOfMeasure.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  private async validatePair(dto: { baseUnitId?: string; conversionFactor?: number }, currentId?: string) {
    const hasBU = dto.baseUnitId !== undefined && dto.baseUnitId !== null;
    const hasCF = dto.conversionFactor !== undefined && dto.conversionFactor !== null;

    if (hasBU !== hasCF) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'baseUnitId e conversionFactor devem ser preenchidos juntos ou ambos omitidos',
        code: 'UNIT_CONVERSION_PAIR_INCOMPLETE',
      });
    }

    if (hasBU) {
      if (currentId && dto.baseUnitId === currentId) {
        throw new BadRequestException({ statusCode: 400, message: 'Uma unidade não pode referenciar a si mesma', code: 'UNIT_SELF_REFERENCE' });
      }
      const base = await this.prisma.unitOfMeasure.findUnique({ where: { id: dto.baseUnitId } });
      if (!base) throw new NotFoundException({ statusCode: 404, message: 'Unidade base não encontrada', code: 'BASE_UNIT_NOT_FOUND' });
    }
  }

  async create(dto: CreateUnitDto) {
    await this.validatePair(dto);

    const nameConflict = await this.prisma.unitOfMeasure.findUnique({ where: { name: dto.name } });
    if (nameConflict) throw new ConflictException({ statusCode: 409, message: 'Nome já existe', code: 'UNIT_NAME_CONFLICT' });

    const symbolConflict = await this.prisma.unitOfMeasure.findUnique({ where: { symbol: dto.symbol } });
    if (symbolConflict) throw new ConflictException({ statusCode: 409, message: 'Símbolo já existe', code: 'UNIT_SYMBOL_CONFLICT' });

    return this.prisma.unitOfMeasure.create({
      data: {
        name: dto.name,
        symbol: dto.symbol,
        baseUnitId: dto.baseUnitId ?? null,
        conversionFactor: dto.conversionFactor ?? null,
      },
      include: { baseUnit: { select: { id: true, name: true, symbol: true } } },
    });
  }

  async update(id: string, dto: UpdateUnitDto) {
    const unit = await this.prisma.unitOfMeasure.findUnique({ where: { id } });
    if (!unit) throw new NotFoundException({ statusCode: 404, message: 'Unidade não encontrada', code: 'UNIT_NOT_FOUND' });

    if (dto.baseUnitId === id) {
      throw new BadRequestException({ statusCode: 400, message: 'Uma unidade não pode referenciar a si mesma', code: 'UNIT_SELF_REFERENCE' });
    }

    await this.validatePair(
      {
        baseUnitId: dto.baseUnitId !== undefined ? dto.baseUnitId : (unit.baseUnitId ?? undefined),
        conversionFactor: dto.conversionFactor !== undefined ? dto.conversionFactor : (unit.conversionFactor ? Number(unit.conversionFactor) : undefined),
      },
      id,
    );

    if (dto.name && dto.name !== unit.name) {
      const conflict = await this.prisma.unitOfMeasure.findFirst({ where: { name: dto.name, NOT: { id } } });
      if (conflict) throw new ConflictException({ statusCode: 409, message: 'Nome já existe', code: 'UNIT_NAME_CONFLICT' });
    }

    if (dto.symbol && dto.symbol !== unit.symbol) {
      const conflict = await this.prisma.unitOfMeasure.findFirst({ where: { symbol: dto.symbol, NOT: { id } } });
      if (conflict) throw new ConflictException({ statusCode: 409, message: 'Símbolo já existe', code: 'UNIT_SYMBOL_CONFLICT' });
    }

    return this.prisma.unitOfMeasure.update({
      where: { id },
      data: {
        name: dto.name,
        symbol: dto.symbol,
        baseUnitId: dto.baseUnitId,
        conversionFactor: dto.conversionFactor,
        isActive: dto.isActive,
      },
      include: { baseUnit: { select: { id: true, name: true, symbol: true } } },
    });
  }
}
