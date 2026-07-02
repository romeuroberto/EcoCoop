import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma.service';
import { OccurrenceGeneratorService } from './occurrence-generator.service';

@Injectable()
export class OccurrenceGeneratorScheduler {
  private readonly logger = new Logger(OccurrenceGeneratorScheduler.name);

  constructor(
    private prisma: PrismaService,
    private generator: OccurrenceGeneratorService,
  ) {}

  @Cron('0 2 * * *')
  async generateDailyOccurrences() {
    this.logger.log('Iniciando geração diária de ocorrências...');
    const templates = await this.prisma.routeTemplate.findMany({
      where: { status: 'ATIVO' },
      select: { id: true },
    });

    let total = 0;
    for (const { id } of templates) {
      try {
        const count = await this.generator.generateForTemplate(id);
        total += count;
      } catch (err) {
        this.logger.error(`Erro ao gerar ocorrências para template ${id}`, err);
      }
    }
    this.logger.log(`Geração concluída: ${total} ocorrências criadas para ${templates.length} templates.`);
  }
}
