import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DocumentType, ProfileType } from '@prisma/client';
import { validateCNPJ } from '../../common/validators/cnpj.validator';
import { validateCPF } from '../../common/validators/cpf.validator';
import { PrismaService } from '../../common/prisma.service';
import { CreateBuyerDto } from './dto/create-buyer.dto';
import { LinkUserDto } from './dto/link-user.dto';
import { UpdateBuyerDto } from './dto/update-buyer.dto';

export interface ListBuyersQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive' | 'all';
}

@Injectable()
export class BuyersService {
  constructor(private prisma: PrismaService) {}

  async list(query: ListBuyersQuery) {
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
        { legalName: { contains: s, mode: 'insensitive' } },
        { documentNumber: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.buyer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { legalName: 'asc' },
      }),
      this.prisma.buyer.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const buyer = await this.prisma.buyer.findUnique({ where: { id } });
    if (!buyer) {
      throw new NotFoundException({ statusCode: 404, message: 'Comprador não encontrado', code: 'BUYER_NOT_FOUND' });
    }
    return buyer;
  }

  async create(dto: CreateBuyerDto) {
    this.validateDocumentFormat(dto.documentType, dto.documentNumber);

    const conflict = await this.prisma.buyer.findUnique({ where: { documentNumber: dto.documentNumber } });
    if (conflict) {
      throw new ConflictException({ statusCode: 409, message: 'Documento já cadastrado', code: 'BUYER_DOCUMENT_CONFLICT' });
    }

    return this.prisma.buyer.create({ data: { ...dto } });
  }

  async update(id: string, dto: UpdateBuyerDto) {
    const buyer = await this.prisma.buyer.findUnique({ where: { id } });
    if (!buyer) {
      throw new NotFoundException({ statusCode: 404, message: 'Comprador não encontrado', code: 'BUYER_NOT_FOUND' });
    }

    if (dto.documentNumber !== undefined) {
      const docType = dto.documentType ?? buyer.documentType;
      this.validateDocumentFormat(docType, dto.documentNumber);

      if (dto.documentNumber !== buyer.documentNumber) {
        const conflict = await this.prisma.buyer.findFirst({
          where: { documentNumber: dto.documentNumber, NOT: { id } },
        });
        if (conflict) {
          throw new ConflictException({ statusCode: 409, message: 'Documento já cadastrado', code: 'BUYER_DOCUMENT_CONFLICT' });
        }
      }
    }

    const data: Record<string, unknown> = {};
    if (dto.legalName !== undefined) data['legalName'] = dto.legalName;
    if (dto.documentType !== undefined) data['documentType'] = dto.documentType;
    if (dto.documentNumber !== undefined) data['documentNumber'] = dto.documentNumber;
    if (dto.phone !== undefined) data['phone'] = dto.phone;
    if (dto.email !== undefined) data['email'] = dto.email;
    if (dto.addressStreet !== undefined) data['addressStreet'] = dto.addressStreet;
    if (dto.addressNumber !== undefined) data['addressNumber'] = dto.addressNumber;
    if (dto.addressComplement !== undefined) data['addressComplement'] = dto.addressComplement;
    if (dto.addressCity !== undefined) data['addressCity'] = dto.addressCity;
    if (dto.addressState !== undefined) data['addressState'] = dto.addressState;
    if (dto.addressZip !== undefined) data['addressZip'] = dto.addressZip;
    if (dto.notes !== undefined) data['notes'] = dto.notes;
    if (dto.isActive !== undefined) data['isActive'] = dto.isActive;

    return this.prisma.buyer.update({ where: { id }, data });
  }

  async linkUser(id: string, dto: LinkUserDto) {
    const buyer = await this.prisma.buyer.findUnique({ where: { id } });
    if (!buyer) {
      throw new NotFoundException({ statusCode: 404, message: 'Comprador não encontrado', code: 'BUYER_NOT_FOUND' });
    }

    if (dto.userId === null) {
      return this.prisma.buyer.update({ where: { id }, data: { userId: null } });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      include: { profile: { select: { type: true } } },
    });
    if (!user) {
      throw new NotFoundException({ statusCode: 404, message: 'Usuário não encontrado', code: 'USER_NOT_FOUND' });
    }

    if (user.profile.type !== ProfileType.BUYER) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        message: 'Usuário não possui perfil BUYER',
        code: 'USER_NOT_BUYER_PROFILE',
      });
    }

    const buyerConflict = await this.prisma.buyer.findFirst({
      where: { userId: dto.userId, NOT: { id } },
    });
    if (buyerConflict) {
      throw new ConflictException({
        statusCode: 409,
        message: 'Usuário já vinculado a outro comprador',
        code: 'USER_ALREADY_LINKED',
      });
    }

    const memberConflict = await this.prisma.member.findFirst({ where: { userId: dto.userId } });
    if (memberConflict) {
      throw new ConflictException({
        statusCode: 409,
        message: 'Usuário já vinculado a um cooperado',
        code: 'USER_ALREADY_LINKED_TO_MEMBER',
      });
    }

    return this.prisma.buyer.update({ where: { id }, data: { userId: dto.userId } });
  }

  private validateDocumentFormat(type: DocumentType, number: string) {
    const isValid = type === DocumentType.CPF ? validateCPF(number) : validateCNPJ(number);
    if (!isValid) {
      throw new BadRequestException({
        statusCode: 400,
        message: `${type} inválido`,
        code: 'INVALID_DOCUMENT_FORMAT',
      });
    }
  }
}
