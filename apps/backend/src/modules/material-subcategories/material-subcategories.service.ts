import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateMaterialSubcategoryDto } from './dto/create-material-subcategory.dto';
import { UpdateMaterialSubcategoryDto } from './dto/update-material-subcategory.dto';

export interface ListSubcategoriesQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive' | 'all';
  categoryId?: string;
}

@Injectable()
export class MaterialSubcategoriesService {
  constructor(private prisma: PrismaService) {}

  async list(query: ListSubcategoriesQuery) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.status !== 'all') {
      where['isActive'] = query.status !== 'inactive';
    }
    if (query.categoryId) where['categoryId'] = query.categoryId;
    if (query.search?.trim()) {
      where['name'] = { contains: query.search.trim(), mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.materialSubcategory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          category: { select: { id: true, name: true } },
          defaultUnit: { select: { id: true, name: true, symbol: true } },
        },
      }),
      this.prisma.materialSubcategory.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  private async validateUnit(unitId: string, context: string) {
    const unit = await this.prisma.unitOfMeasure.findUnique({ where: { id: unitId } });
    if (!unit) throw new NotFoundException({ statusCode: 404, message: 'Unidade não encontrada', code: 'UNIT_NOT_FOUND' });
    if (!unit.isActive) {
      throw new BadRequestException({ statusCode: 400, message: `Unidade inativa. Selecione uma unidade ativa. (${context})`, code: 'UNIT_INACTIVE' });
    }
  }

  async create(dto: CreateMaterialSubcategoryDto) {
    const category = await this.prisma.materialCategory.findUnique({ where: { id: dto.categoryId } });
    if (!category) throw new NotFoundException({ statusCode: 404, message: 'Categoria não encontrada', code: 'CATEGORY_NOT_FOUND' });

    await this.validateUnit(dto.defaultUnitId, 'defaultUnitId');

    const conflict = await this.prisma.materialSubcategory.findFirst({
      where: { categoryId: dto.categoryId, name: dto.name },
    });
    if (conflict) {
      throw new ConflictException({ statusCode: 409, message: 'Nome já existe nesta categoria', code: 'SUBCATEGORY_NAME_CONFLICT_IN_CATEGORY' });
    }

    return this.prisma.materialSubcategory.create({
      data: dto,
      include: {
        category: { select: { id: true, name: true } },
        defaultUnit: { select: { id: true, name: true, symbol: true } },
      },
    });
  }

  async update(id: string, dto: UpdateMaterialSubcategoryDto) {
    const sub = await this.prisma.materialSubcategory.findUnique({ where: { id } });
    if (!sub) throw new NotFoundException({ statusCode: 404, message: 'Subcategoria não encontrada', code: 'SUBCATEGORY_NOT_FOUND' });

    if (dto.defaultUnitId && dto.defaultUnitId !== sub.defaultUnitId) {
      await this.validateUnit(dto.defaultUnitId, 'defaultUnitId');
    }

    if (dto.name && dto.name !== sub.name) {
      const conflict = await this.prisma.materialSubcategory.findFirst({
        where: { categoryId: sub.categoryId, name: dto.name, NOT: { id } },
      });
      if (conflict) {
        throw new ConflictException({ statusCode: 409, message: 'Nome já existe nesta categoria', code: 'SUBCATEGORY_NAME_CONFLICT_IN_CATEGORY' });
      }
    }

    return this.prisma.materialSubcategory.update({
      where: { id },
      data: dto,
      include: {
        category: { select: { id: true, name: true } },
        defaultUnit: { select: { id: true, name: true, symbol: true } },
      },
    });
  }
}
