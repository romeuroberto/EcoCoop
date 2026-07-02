import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

const DEFAULT_HORIZON_WEEKS = 4;

@Injectable()
export class OccurrenceGeneratorService {
  constructor(private prisma: PrismaService) {}

  async generateForTemplate(
    templateId: string,
    options?: { onlyDays?: number[] },
    tx?: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
  ): Promise<number> {
    const client = tx ?? this.prisma;

    const template = await (client as PrismaService).routeTemplate.findUnique({
      where: { id: templateId },
      include: { templatePoints: { orderBy: { sequence: 'asc' } } },
    });
    if (!template || template.status === 'INATIVO') return 0;

    const settings = await (client as PrismaService).cooperativeSettings.findFirst();
    const horizonWeeks = settings?.occurrenceHorizonWeeks ?? DEFAULT_HORIZON_WEEKS;

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const horizonEnd = new Date(today);
    horizonEnd.setUTCDate(horizonEnd.getUTCDate() + horizonWeeks * 7);

    const startDate = new Date(template.startDate);
    startDate.setUTCHours(0, 0, 0, 0);
    const endDate = template.endDate ? new Date(template.endDate) : null;
    if (endDate) endDate.setUTCHours(0, 0, 0, 0);

    const targetDays = options?.onlyDays ?? template.recurrenceDays;

    let count = 0;
    const cursor = new Date(Math.max(today.getTime(), startDate.getTime()));

    while (cursor <= horizonEnd) {
      const dow = cursor.getUTCDay();
      if (
        targetDays.includes(dow) &&
        (!endDate || cursor <= endDate)
      ) {
        const plannedDate = new Date(cursor);
        try {
          await (client as PrismaService).collectionRoute.create({
            data: {
              name: template.name,
              plannedDate,
              driverId: template.driverId,
              vehicleId: template.vehicleId,
              notes: template.notes,
              templateId: template.id,
              isException: false,
              routePoints: {
                create: template.templatePoints.map((tp) => ({
                  collectionPointId: tp.collectionPointId,
                  sequence: tp.sequence,
                  notes: tp.notes,
                })),
              },
            },
          });
          count++;
        } catch (err: unknown) {
          // P2002 = unique constraint violation (templateId + plannedDate) — skip duplicate
          if ((err as { code?: string })?.code !== 'P2002') throw err;
        }
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return count;
  }
}
