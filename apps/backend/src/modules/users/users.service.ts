import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  private async safeUser(user: { passwordHash: string; [key: string]: unknown }) {
    const { passwordHash: _pw, ...safe } = user;
    return safe;
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');

    const profile = await this.prisma.profile.findUnique({ where: { id: dto.profileId } });
    if (!profile) throw new BadRequestException('Profile not found');

    const rounds = this.config.get<number>('BCRYPT_ROUNDS') ?? 10;
    const passwordHash = await bcrypt.hash(dto.password, rounds);

    const user = await this.prisma.user.create({
      data: { email: dto.email, passwordHash, profileId: dto.profileId },
      include: { profile: true },
    });
    return this.safeUser(user as unknown as { passwordHash: string; [key: string]: unknown });
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      include: { profile: true },
      orderBy: { createdAt: 'desc' },
    });
    return users.map((u) => {
      const { passwordHash: _pw, ...safe } = u;
      return safe;
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { profile: { include: { permissions: true } } },
    });
    if (!user) throw new NotFoundException('User not found');
    const { passwordHash: _pw, ...safe } = user;
    return safe;
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const data: Record<string, unknown> = {};
    if (dto.email) {
      const conflict = await this.prisma.user.findFirst({
        where: { email: dto.email, NOT: { id } },
      });
      if (conflict) throw new ConflictException('Email already in use');
      data['email'] = dto.email;
    }
    if (dto.password) {
      const rounds = this.config.get<number>('BCRYPT_ROUNDS') ?? 10;
      data['passwordHash'] = await bcrypt.hash(dto.password, rounds);
    }
    if (dto.profileId) {
      const profile = await this.prisma.profile.findUnique({ where: { id: dto.profileId } });
      if (!profile) throw new BadRequestException('Profile not found');
      data['profileId'] = dto.profileId;
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data,
      include: { profile: true },
    });
    const { passwordHash: _pw, ...safe } = updated;
    return safe;
  }

  async setActive(id: string, isActive: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive },
      include: { profile: true },
    });
    const { passwordHash: _pw, ...safe } = updated;
    return safe;
  }
}
