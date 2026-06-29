import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { UpdateCooperativeDto } from './dto/update-cooperative.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class CooperativeService {
  constructor(private prisma: PrismaService) {}

  async findOne() {
    const coop = await this.prisma.cooperative.findFirst({
      include: { settings: true },
    });
    if (!coop) throw new NotFoundException('Cooperative not configured');
    return coop;
  }

  async update(dto: UpdateCooperativeDto) {
    const existing = await this.prisma.cooperative.findFirst();
    if (!existing) throw new NotFoundException('Cooperative not found');
    return this.prisma.cooperative.update({
      where: { id: existing.id },
      data: dto,
      include: { settings: true },
    });
  }

  async getSettings() {
    const coop = await this.prisma.cooperative.findFirst({
      include: { settings: true },
    });
    if (!coop) throw new NotFoundException('Cooperative not found');
    if (!coop.settings) throw new NotFoundException('Cooperative settings not found');
    return coop.settings;
  }

  async updateSettings(dto: UpdateSettingsDto) {
    const coop = await this.prisma.cooperative.findFirst({
      include: { settings: true },
    });
    if (!coop) throw new NotFoundException('Cooperative not found');

    if (!coop.settings) {
      return this.prisma.cooperativeSettings.create({
        data: { cooperativeId: coop.id, ...dto },
      });
    }
    return this.prisma.cooperativeSettings.update({
      where: { id: coop.settings.id },
      data: dto,
    });
  }
}
