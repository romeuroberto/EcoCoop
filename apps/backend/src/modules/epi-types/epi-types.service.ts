import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateEpiTypeDto } from './dto/create-epi-type.dto';
import { UpdateEpiTypeDto } from './dto/update-epi-type.dto';

export interface ListEpiTypesQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive' | 'all';
}

@Injectable()
export class EpiTypesService {
  constructor(private prisma: PrismaService) {}

  async list(query: ListEpiTypesQuery) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.status !== 'all') {
      where['isActive'] = query.status !== 'inactive';
    }
    if (query.search?.trim()) {
      where['name'] = { contains: query.search.trim(), mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.epiType.findMany({ where, skip, take: limit, orderBy: { name: 'asc' } }),
      this.prisma.epiType.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const epiType = await this.prisma.epiType.findUnique({ where: { id } });
    if (!epiType) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Tipo de EPI não encontrado',
        code: 'EPI_TYPE_NOT_FOUND',
      });
    }
    return epiType;
  }

  async create(dto: CreateEpiTypeDto) {
    const conflict = await this.prisma.epiType.findFirst({
      where: { name: { equals: dto.name, mode: 'insensitive' } },
    });
    if (conflict) {
      throw new ConflictException({
        statusCode: 409,
        message: 'Já existe um tipo de EPI com este nome',
        code: 'EPI_TYPE_NAME_CONFLICT',
      });
    }

    return this.prisma.epiType.create({
      data: { name: dto.name, defaultValidityDays: dto.defaultValidityDays },
    });
  }

  async update(id: string, dto: UpdateEpiTypeDto) {
    await this.findOne(id);

    if (dto.name !== undefined) {
      const conflict = await this.prisma.epiType.findFirst({
        where: { name: { equals: dto.name, mode: 'insensitive' }, NOT: { id } },
      });
      if (conflict) {
        throw new ConflictException({
          statusCode: 409,
          message: 'Já existe um tipo de EPI com este nome',
          code: 'EPI_TYPE_NAME_CONFLICT',
        });
      }
    }

    return this.prisma.epiType.update({ where: { id }, data: { ...dto } });
  }
}
