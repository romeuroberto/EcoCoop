import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { LinkUserDto } from './dto/link-user.dto';
import { UpdateMemberDto } from './dto/update-member.dto';

export interface ListMembersQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive' | 'all';
}

@Injectable()
export class MembersService {
  constructor(private prisma: PrismaService) {}

  async list(query: ListMembersQuery) {
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
        { cpf: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.member.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: { role: { select: { id: true, name: true } } },
      }),
      this.prisma.member.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const member = await this.prisma.member.findUnique({
      where: { id },
      include: { role: { select: { id: true, name: true } } },
    });
    if (!member) throw new NotFoundException({ statusCode: 404, message: 'Cooperado não encontrado', code: 'MEMBER_NOT_FOUND' });
    return member;
  }

  async create(dto: CreateMemberDto) {
    const cpfConflict = await this.prisma.member.findUnique({ where: { cpf: dto.cpf } });
    if (cpfConflict) {
      throw new ConflictException({ statusCode: 409, message: 'CPF já cadastrado', code: 'MEMBER_CPF_CONFLICT' });
    }

    const role = await this.prisma.memberRole.findUnique({ where: { id: dto.roleId } });
    if (!role) throw new NotFoundException({ statusCode: 404, message: 'Função não encontrada', code: 'MEMBER_ROLE_NOT_FOUND' });
    if (!role.isActive) {
      throw new BadRequestException({ statusCode: 400, message: 'Função inativa. Selecione uma função ativa.', code: 'MEMBER_ROLE_INACTIVE' });
    }

    return this.prisma.member.create({
      data: {
        name: dto.name,
        cpf: dto.cpf,
        phone: dto.phone,
        email: dto.email,
        admittedAt: new Date(dto.admittedAt),
        roleId: dto.roleId,
        notes: dto.notes,
      },
      include: { role: { select: { id: true, name: true } } },
    });
  }

  async update(id: string, dto: UpdateMemberDto) {
    const member = await this.prisma.member.findUnique({ where: { id } });
    if (!member) throw new NotFoundException({ statusCode: 404, message: 'Cooperado não encontrado', code: 'MEMBER_NOT_FOUND' });

    if (dto.cpf && dto.cpf !== member.cpf) {
      const conflict = await this.prisma.member.findFirst({ where: { cpf: dto.cpf, NOT: { id } } });
      if (conflict) throw new ConflictException({ statusCode: 409, message: 'CPF já cadastrado', code: 'MEMBER_CPF_CONFLICT' });
    }

    if (dto.roleId && dto.roleId !== member.roleId) {
      const role = await this.prisma.memberRole.findUnique({ where: { id: dto.roleId } });
      if (!role) throw new NotFoundException({ statusCode: 404, message: 'Função não encontrada', code: 'MEMBER_ROLE_NOT_FOUND' });
      if (!role.isActive) {
        throw new BadRequestException({ statusCode: 400, message: 'Função inativa. Selecione uma função ativa.', code: 'MEMBER_ROLE_INACTIVE' });
      }
    }

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data['name'] = dto.name;
    if (dto.cpf !== undefined) data['cpf'] = dto.cpf;
    if (dto.phone !== undefined) data['phone'] = dto.phone;
    if (dto.email !== undefined) data['email'] = dto.email;
    if (dto.admittedAt !== undefined) data['admittedAt'] = new Date(dto.admittedAt);
    if (dto.roleId !== undefined) data['roleId'] = dto.roleId;
    if (dto.isActive !== undefined) data['isActive'] = dto.isActive;
    if (dto.notes !== undefined) data['notes'] = dto.notes;

    return this.prisma.member.update({
      where: { id },
      data,
      include: { role: { select: { id: true, name: true } } },
    });
  }

  async linkUser(id: string, dto: LinkUserDto) {
    const member = await this.prisma.member.findUnique({ where: { id } });
    if (!member) throw new NotFoundException({ statusCode: 404, message: 'Cooperado não encontrado', code: 'MEMBER_NOT_FOUND' });

    if (dto.userId === null) {
      return this.prisma.member.update({ where: { id }, data: { userId: null }, include: { role: true } });
    }

    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException({ statusCode: 404, message: 'Usuário não encontrado', code: 'USER_NOT_FOUND' });

    const memberConflict = await this.prisma.member.findFirst({
      where: { userId: dto.userId, NOT: { id } },
    });
    if (memberConflict) {
      throw new ConflictException({ statusCode: 409, message: 'Usuário já vinculado a outro cooperado', code: 'USER_ALREADY_LINKED' });
    }

    const buyerConflict = await this.prisma.buyer.findFirst({ where: { userId: dto.userId } });
    if (buyerConflict) {
      throw new UnprocessableEntityException({ statusCode: 422, message: 'Usuário já vinculado a um comprador', code: 'USER_NOT_MEMBER_PROFILE' });
    }

    return this.prisma.member.update({
      where: { id },
      data: { userId: dto.userId },
      include: { role: { select: { id: true, name: true } } },
    });
  }
}
