import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

export interface ListVehiclesQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive' | 'all';
}

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService) {}

  async list(query: ListVehiclesQuery) {
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
        { plate: { contains: s, mode: 'insensitive' } },
        { model: { contains: s, mode: 'insensitive' } },
        { type: { equals: s.toUpperCase() } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.vehicle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { plate: 'asc' },
        include: {
          capacityUnit: { select: { id: true, name: true, symbol: true } },
        },
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: {
        capacityUnit: { select: { id: true, name: true, symbol: true } },
      },
    });
    if (!vehicle) {
      throw new NotFoundException({ statusCode: 404, message: 'Veículo não encontrado', code: 'VEHICLE_NOT_FOUND' });
    }
    return vehicle;
  }

  async create(dto: CreateVehicleDto) {
    this.validateCapacityPair(dto.capacityValue, dto.capacityUnitId);

    const plateConflict = await this.prisma.vehicle.findUnique({ where: { plate: dto.plate } });
    if (plateConflict) {
      throw new ConflictException({ statusCode: 409, message: 'Placa já cadastrada', code: 'VEHICLE_PLATE_CONFLICT' });
    }

    if (dto.capacityUnitId) {
      await this.validateActiveUnit(dto.capacityUnitId);
    }

    return this.prisma.vehicle.create({
      data: {
        plate: dto.plate,
        type: dto.type,
        model: dto.model,
        capacityValue: dto.capacityValue,
        capacityUnitId: dto.capacityUnitId,
        capacityNotes: dto.capacityNotes,
        notes: dto.notes,
      },
      include: {
        capacityUnit: { select: { id: true, name: true, symbol: true } },
      },
    });
  }

  async update(id: string, dto: UpdateVehicleDto) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) {
      throw new NotFoundException({ statusCode: 404, message: 'Veículo não encontrado', code: 'VEHICLE_NOT_FOUND' });
    }

    // Determine effective capacity pair after merge
    const effectiveValue = dto.capacityValue !== undefined ? dto.capacityValue : vehicle.capacityValue;
    const effectiveUnitId = dto.capacityUnitId !== undefined ? dto.capacityUnitId : vehicle.capacityUnitId;
    this.validateCapacityPair(
      effectiveValue !== null ? Number(effectiveValue) : undefined,
      effectiveUnitId ?? undefined,
    );

    if (dto.plate && dto.plate !== vehicle.plate) {
      const conflict = await this.prisma.vehicle.findFirst({ where: { plate: dto.plate, NOT: { id } } });
      if (conflict) {
        throw new ConflictException({ statusCode: 409, message: 'Placa já cadastrada', code: 'VEHICLE_PLATE_CONFLICT' });
      }
    }

    // Only validate active unit when capacityUnitId is being changed
    if (dto.capacityUnitId !== undefined && dto.capacityUnitId !== vehicle.capacityUnitId && dto.capacityUnitId !== null) {
      await this.validateActiveUnit(dto.capacityUnitId);
    }

    const data: Record<string, unknown> = {};
    if (dto.plate !== undefined) data['plate'] = dto.plate;
    if (dto.type !== undefined) data['type'] = dto.type;
    if (dto.model !== undefined) data['model'] = dto.model;
    if (dto.capacityValue !== undefined) data['capacityValue'] = dto.capacityValue;
    if (dto.capacityUnitId !== undefined) data['capacityUnitId'] = dto.capacityUnitId;
    if (dto.capacityNotes !== undefined) data['capacityNotes'] = dto.capacityNotes;
    if (dto.notes !== undefined) data['notes'] = dto.notes;
    if (dto.isActive !== undefined) data['isActive'] = dto.isActive;

    return this.prisma.vehicle.update({
      where: { id },
      data,
      include: {
        capacityUnit: { select: { id: true, name: true, symbol: true } },
      },
    });
  }

  private validateCapacityPair(value?: number | null, unitId?: string | null) {
    const hasValue = value !== undefined && value !== null;
    const hasUnit = unitId !== undefined && unitId !== null;
    if (hasValue && !hasUnit) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'capacityUnitId é obrigatório quando capacityValue é informado',
        code: 'CAPACITY_UNIT_REQUIRED_WITH_VALUE',
      });
    }
    if (!hasValue && hasUnit) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'capacityValue é obrigatório quando capacityUnitId é informado',
        code: 'CAPACITY_UNIT_REQUIRED_WITH_VALUE',
      });
    }
  }

  private async validateActiveUnit(unitId: string) {
    const unit = await this.prisma.unitOfMeasure.findUnique({ where: { id: unitId } });
    if (!unit) {
      throw new NotFoundException({ statusCode: 404, message: 'Unidade de medida não encontrada', code: 'UNIT_NOT_FOUND' });
    }
    if (!unit.isActive) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Unidade de medida inativa. Selecione uma unidade ativa.',
        code: 'UNIT_INACTIVE',
      });
    }
  }
}
