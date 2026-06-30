import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateMemberRoleDto } from './dto/create-member-role.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';

export interface ListMemberRolesQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive' | 'all';
}

@Injectable()
export class MemberRolesService {
  constructor(private prisma: PrismaService) {}

  async list(query: ListMemberRolesQuery) {
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
      this.prisma.memberRole.findMany({ where, skip, take: limit, orderBy: { name: 'asc' } }),
      this.prisma.memberRole.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async create(dto: CreateMemberRoleDto) {
    const existing = await this.prisma.memberRole.findUnique({ where: { name: dto.name } });
    if (existing) {
      throw new ConflictException({ statusCode: 409, message: 'Nome já existe', code: 'MEMBER_ROLE_NAME_CONFLICT' });
    }
    return this.prisma.memberRole.create({ data: { name: dto.name } });
  }

  async update(id: string, dto: UpdateMemberRoleDto) {
    const role = await this.prisma.memberRole.findUnique({ where: { id } });
    if (!role) throw new NotFoundException({ statusCode: 404, message: 'Função não encontrada', code: 'MEMBER_ROLE_NOT_FOUND' });

    if (dto.name && dto.name !== role.name) {
      if (role.isDefault) {
        throw new UnprocessableEntityException({
          statusCode: 422,
          message: 'Funções padrão não podem ser renomeadas',
          code: 'MEMBER_ROLE_DEFAULT_RENAME_BLOCKED',
        });
      }
      const conflict = await this.prisma.memberRole.findFirst({
        where: { name: dto.name, NOT: { id } },
      });
      if (conflict) {
        throw new ConflictException({ statusCode: 409, message: 'Nome já existe', code: 'MEMBER_ROLE_NAME_CONFLICT' });
      }
    }

    return this.prisma.memberRole.update({ where: { id }, data: dto });
  }
}
