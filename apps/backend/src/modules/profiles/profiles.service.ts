import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdatePermissionsDto } from './dto/update-permissions.dto';

@Injectable()
export class ProfilesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.profile.findMany({
      include: { permissions: true },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateProfileDto) {
    return this.prisma.profile.create({
      data: { name: dto.name, type: dto.type, isCustom: true },
      include: { permissions: true },
    });
  }

  async updatePermissions(profileId: string, dto: UpdatePermissionsDto) {
    const profile = await this.prisma.profile.findUnique({ where: { id: profileId } });
    if (!profile) throw new BadRequestException(`Profile ${profileId} not found`);

    return this.prisma.$transaction(async (tx) => {
      await tx.profilePermission.deleteMany({ where: { profileId } });
      if (dto.permissions.length > 0) {
        await tx.profilePermission.createMany({
          data: dto.permissions.map((p) => ({ profileId, module: p.module, action: p.action })),
        });
      }
      return tx.profile.findUnique({
        where: { id: profileId },
        include: { permissions: true },
      });
    });
  }
}
