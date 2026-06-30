import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateMaterialCategoryDto } from './dto/create-material-category.dto';
import { UpdateMaterialCategoryDto } from './dto/update-material-category.dto';

export interface ListCategoriesQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive' | 'all';
  includeSubcategories?: boolean;
}

@Injectable()
export class MaterialCategoriesService {
  constructor(private prisma: PrismaService) {}

  async list(query: ListCategoriesQuery) {
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
      query.includeSubcategories
        ? this.prisma.materialCategory.findMany({
            where, skip, take: limit, orderBy: { name: 'asc' },
            include: { subcategories: { orderBy: { name: 'asc' }, include: { defaultUnit: { select: { id: true, name: true, symbol: true } } } } },
          })
        : this.prisma.materialCategory.findMany({ where, skip, take: limit, orderBy: { name: 'asc' } }),
      this.prisma.materialCategory.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async create(dto: CreateMaterialCategoryDto) {
    const existing = await this.prisma.materialCategory.findUnique({ where: { name: dto.name } });
    if (existing) {
      throw new ConflictException({ statusCode: 409, message: 'Nome já existe', code: 'CATEGORY_NAME_CONFLICT' });
    }
    return this.prisma.materialCategory.create({ data: dto });
  }

  async update(id: string, dto: UpdateMaterialCategoryDto) {
    const category = await this.prisma.materialCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundException({ statusCode: 404, message: 'Categoria não encontrada', code: 'CATEGORY_NOT_FOUND' });

    if (dto.name && dto.name !== category.name) {
      const conflict = await this.prisma.materialCategory.findFirst({ where: { name: dto.name, NOT: { id } } });
      if (conflict) throw new ConflictException({ statusCode: 409, message: 'Nome já existe', code: 'CATEGORY_NAME_CONFLICT' });
    }

    if (dto.isActive === false && category.isActive) {
      const activeSubs = await this.prisma.materialSubcategory.findMany({
        where: { categoryId: id, isActive: true },
        select: { name: true },
      });
      if (activeSubs.length > 0) {
        throw new UnprocessableEntityException({
          statusCode: 422,
          message: `Não é possível inativar esta categoria: existem ${activeSubs.length} subcategorias ativas vinculadas.`,
          code: 'CANNOT_DEACTIVATE_CATEGORY_WITH_ACTIVE_SUBCATEGORIES',
          details: activeSubs.map((s) => s.name),
        });
      }
    }

    return this.prisma.materialCategory.update({ where: { id }, data: dto });
  }
}
