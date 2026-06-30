import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateCostCenterDto } from './dto/create-cost-center.dto';
import { UpdateCostCenterDto } from './dto/update-cost-center.dto';

export interface ListCostCentersQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive' | 'all';
}

@Injectable()
export class CostCentersService {
  constructor(private prisma: PrismaService) {}

  async list(query: ListCostCentersQuery) {
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
        { code: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.costCenter.findMany({ where, skip, take: limit, orderBy: { name: 'asc' } }),
      this.prisma.costCenter.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const cc = await this.prisma.costCenter.findUnique({ where: { id } });
    if (!cc) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Centro de custo não encontrado',
        code: 'COST_CENTER_NOT_FOUND',
      });
    }
    return cc;
  }

  async create(dto: CreateCostCenterDto) {
    const nameConflict = await this.prisma.costCenter.findFirst({
      where: { name: { equals: dto.name, mode: 'insensitive' } },
    });
    if (nameConflict) {
      throw new ConflictException({
        statusCode: 409,
        message: 'Já existe um centro de custo com este nome',
        code: 'COST_CENTER_NAME_CONFLICT',
      });
    }

    if (dto.code) {
      await this.checkCodeConflict(dto.code);
    }

    return this.prisma.costCenter.create({
      data: { name: dto.name, code: dto.code ?? null, description: dto.description },
    });
  }

  async update(id: string, dto: UpdateCostCenterDto) {
    const existing = await this.findOne(id);

    if (dto.name !== undefined) {
      const conflict = await this.prisma.costCenter.findFirst({
        where: { name: { equals: dto.name, mode: 'insensitive' }, NOT: { id } },
      });
      if (conflict) {
        throw new ConflictException({
          statusCode: 409,
          message: 'Já existe um centro de custo com este nome',
          code: 'COST_CENTER_NAME_CONFLICT',
        });
      }
    }

    if (dto.code !== undefined && dto.code !== null && dto.code !== existing.code) {
      await this.checkCodeConflict(dto.code, id);
    }

    return this.prisma.costCenter.update({ where: { id }, data: { ...dto } });
  }

  private async checkCodeConflict(code: string, excludeId?: string) {
    const conflict = await this.prisma.costCenter.findFirst({
      where: {
        code: { equals: code, mode: 'insensitive' },
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });
    if (conflict) {
      throw new ConflictException({
        statusCode: 409,
        message: 'Já existe um centro de custo com este código',
        code: 'COST_CENTER_CODE_CONFLICT',
      });
    }
  }
}
