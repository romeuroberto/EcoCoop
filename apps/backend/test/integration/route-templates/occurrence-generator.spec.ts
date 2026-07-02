import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { GEOCODING_PROVIDER } from '../../../src/common/providers/geocoding/geocoding.provider';
import { PrismaService } from '../../../src/common/prisma.service';
import { OccurrenceGeneratorService } from '../../../src/modules/route-templates/occurrence-generator.service';

describe('OccurrenceGeneratorService (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let generator: OccurrenceGeneratorService;
  let managerToken: string;
  let driverUserId: string;
  let vehicleId: string;
  let pointId: string;
  const createdTemplateIds: string[] = [];

  const mockGeocodingProvider = { geocode: jest.fn().mockResolvedValue(null) };

  const login = async (email: string, password: string) => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password });
    return (res.body as { accessToken: string }).accessToken;
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(GEOCODING_PROVIDER)
      .useValue(mockGeocodingProvider)
      .compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    generator = app.get(OccurrenceGeneratorService);
    managerToken = await login('gestor@ecocoop.local', 'gestor123');

    const hash = await bcrypt.hash('driver123', 10);
    const driverProfile = await prisma.profile.findFirst({ where: { type: 'DRIVER', isCustom: false } });
    const driverUser = await prisma.user.upsert({
      where: { email: 'driver-gen-test@ecocoop.local' },
      create: { email: 'driver-gen-test@ecocoop.local', passwordHash: hash, profileId: driverProfile!.id },
      update: {},
    });
    driverUserId = driverUser.id;

    const vehicle = await prisma.vehicle.create({
      data: { plate: `GEN-${Math.random().toString(36).slice(2, 8)}`.toUpperCase(), type: 'VAN', model: 'Test Van', isActive: true },
    });
    vehicleId = vehicle.id;

    const cp = await prisma.collectionPoint.create({
      data: { name: 'Ponto Gen', address: 'Rua Gen, 1', isActive: true },
    });
    pointId = cp.id;
  });

  afterAll(async () => {
    await prisma.collectionRoute.deleteMany({ where: { templateId: { in: createdTemplateIds } } });
    await prisma.routeTemplate.deleteMany({ where: { id: { in: createdTemplateIds } } });
    await prisma.collectionPoint.deleteMany({ where: { id: pointId } });
    await prisma.vehicle.deleteMany({ where: { id: vehicleId } });
    await prisma.user.deleteMany({ where: { email: 'driver-gen-test@ecocoop.local' } });
    await app.close();
  });

  it('generates occurrences only on matching recurrenceDays', async () => {
    // Create template with recurrenceDays=[2] (Tuesday only)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = today.toISOString().split('T')[0];

    const res = await request(app.getHttpServer())
      .post('/api/v1/route-templates')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Terças Geração',
        recurrenceDays: [2],
        startDate,
        driverId: driverUserId,
        vehicleId,
        points: [{ collectionPointId: pointId, sequence: 1 }],
      });

    expect(res.status).toBe(201);
    const { template, generatedOccurrences } = res.body as { template: { id: string }; generatedOccurrences: number };
    createdTemplateIds.push(template.id);

    expect(generatedOccurrences).toBeGreaterThan(0);

    // All occurrences must fall on Tuesday (dayOfWeek = 2)
    const occurrences = await prisma.collectionRoute.findMany({
      where: { templateId: template.id },
      select: { plannedDate: true },
    });
    for (const occ of occurrences) {
      expect(new Date(occ.plannedDate).getUTCDay()).toBe(2);
    }
  });

  it('respects endDate cutoff — no occurrences generated after endDate', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = today.toISOString().split('T')[0];
    // Set endDate to 3 days from now to limit occurrences
    const endDate = new Date(today);
    endDate.setUTCDate(endDate.getUTCDate() + 3);
    const endDateStr = endDate.toISOString().split('T')[0];

    const res = await request(app.getHttpServer())
      .post('/api/v1/route-templates')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Template EndDate Test',
        recurrenceDays: [0, 1, 2, 3, 4, 5, 6], // every day
        startDate,
        endDate: endDateStr,
        driverId: driverUserId,
        vehicleId,
        points: [{ collectionPointId: pointId, sequence: 1 }],
      });

    expect(res.status).toBe(201);
    const { template } = res.body as { template: { id: string } };
    createdTemplateIds.push(template.id);

    const occurrences = await prisma.collectionRoute.findMany({
      where: { templateId: template.id },
      select: { plannedDate: true },
    });

    for (const occ of occurrences) {
      const occDate = new Date(occ.plannedDate);
      occDate.setUTCHours(0, 0, 0, 0);
      expect(occDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
    }
    // At most 4 occurrences (today through today+3)
    expect(occurrences.length).toBeLessThanOrEqual(4);
  });

  it('is idempotent — re-running generate returns 0 when horizon is full', async () => {
    const templateId = createdTemplateIds[0];
    const generateRes = await request(app.getHttpServer())
      .post(`/api/v1/route-templates/${templateId}/generate`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send();

    expect(generateRes.status).toBe(200);
    expect((generateRes.body as { generatedOccurrences: number }).generatedOccurrences).toBe(0);
  });

  it('fills gaps when occurrences are missing', async () => {
    const templateId = createdTemplateIds[0];

    // Delete one occurrence to simulate a gap
    const occ = await prisma.collectionRoute.findFirst({
      where: { templateId, status: 'PLANEJADA' },
    });
    if (occ) {
      await prisma.collectionRoute.delete({ where: { id: occ.id } });
    }

    const generateRes = await request(app.getHttpServer())
      .post(`/api/v1/route-templates/${templateId}/generate`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send();

    expect(generateRes.status).toBe(200);
    // Should have regenerated the deleted occurrence
    if (occ) {
      expect((generateRes.body as { generatedOccurrences: number }).generatedOccurrences).toBeGreaterThanOrEqual(1);
    }
  });
});
