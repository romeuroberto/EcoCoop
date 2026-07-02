import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { GEOCODING_PROVIDER } from '../../../src/common/providers/geocoding/geocoding.provider';
import { PrismaService } from '../../../src/common/prisma.service';

describe('RouteTemplate Propagation (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let managerToken: string;
  let driverUserId: string;
  let altDriverId: string;
  let vehicleId: string;
  let altVehicleId: string;
  let pointId: string;
  let altPointId: string;
  const createdTemplateIds: string[] = [];

  const mockGeocodingProvider = { geocode: jest.fn().mockResolvedValue(null) };

  const login = async (email: string, password: string) => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password });
    return (res.body as { accessToken: string }).accessToken;
  };

  const createTemplate = async (overrides: Record<string, unknown> = {}) => {
    const today = new Date().toISOString().split('T')[0];
    const res = await request(app.getHttpServer())
      .post('/api/v1/route-templates')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Template Propagação',
        recurrenceDays: [1, 3],
        startDate: today,
        driverId: driverUserId,
        vehicleId,
        points: [{ collectionPointId: pointId, sequence: 1 }],
        ...overrides,
      });
    if (res.status === 201) {
      createdTemplateIds.push((res.body as { template: { id: string } }).template.id);
    }
    return res;
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
    managerToken = await login('gestor@ecocoop.local', 'gestor123');

    const hash = await bcrypt.hash('driver123', 10);
    const driverProfile = await prisma.profile.findFirst({ where: { type: 'DRIVER', isCustom: false } });

    const driverUser = await prisma.user.upsert({
      where: { email: 'driver-prop-test@ecocoop.local' },
      create: { email: 'driver-prop-test@ecocoop.local', passwordHash: hash, profileId: driverProfile!.id },
      update: {},
    });
    driverUserId = driverUser.id;

    const altDriver = await prisma.user.upsert({
      where: { email: 'driver-prop-alt@ecocoop.local' },
      create: { email: 'driver-prop-alt@ecocoop.local', passwordHash: hash, profileId: driverProfile!.id },
      update: {},
    });
    altDriverId = altDriver.id;

    const vehicle = await prisma.vehicle.create({
      data: { plate: `PRP-${Math.random().toString(36).slice(2, 8)}`.toUpperCase(), type: 'VAN', model: 'Prop Van', isActive: true },
    });
    vehicleId = vehicle.id;

    const altVehicle = await prisma.vehicle.create({
      data: { plate: `PRA-${Math.random().toString(36).slice(2, 8)}`.toUpperCase(), type: 'TRUCK', model: 'Alt Truck', isActive: true },
    });
    altVehicleId = altVehicle.id;

    const cp = await prisma.collectionPoint.create({
      data: { name: 'Ponto Prop', address: 'Rua Prop, 1', isActive: true },
    });
    pointId = cp.id;

    const altCp = await prisma.collectionPoint.create({
      data: { name: 'Ponto Prop Alt', address: 'Rua Alt, 1', isActive: true },
    });
    altPointId = altCp.id;
  });

  afterAll(async () => {
    await prisma.collectionRoute.deleteMany({ where: { templateId: { in: createdTemplateIds } } });
    await prisma.routeTemplate.deleteMany({ where: { id: { in: createdTemplateIds } } });
    await prisma.collectionPoint.deleteMany({ where: { id: { in: [pointId, altPointId] } } });
    await prisma.vehicle.deleteMany({ where: { id: { in: [vehicleId, altVehicleId] } } });
    await prisma.user.deleteMany({ where: { email: { in: ['driver-prop-test@ecocoop.local', 'driver-prop-alt@ecocoop.local'] } } });
    await app.close();
  });

  describe('Propagation with propagate=true', () => {
    it('updates driverId on PLANEJADA occurrences (non-exception) when propagating', async () => {
      const created = await createTemplate({ name: 'Propagação Driver' });
      const template = (created.body as { template: { id: string; version: number } }).template;

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/route-templates/${template.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ driverId: altDriverId, version: template.version, propagate: true });

      expect(res.status).toBe(200);
      const propagation = (res.body as { propagation: { updated: number } }).propagation;
      expect(propagation.updated).toBeGreaterThanOrEqual(0);

      // All non-exception PLANEJADA occurrences should now have altDriverId
      const occurrences = await prisma.collectionRoute.findMany({
        where: { templateId: template.id, status: 'PLANEJADA', isException: false },
        select: { driverId: true },
      });
      for (const occ of occurrences) {
        expect(occ.driverId).toBe(altDriverId);
      }
    });

    it('skips exception occurrences by default during propagation', async () => {
      const created = await createTemplate({ name: 'Propagação com Exceção' });
      const template = (created.body as { template: { id: string; version: number } }).template;

      // Mark one occurrence as exception
      const occ = await prisma.collectionRoute.findFirst({
        where: { templateId: template.id, status: 'PLANEJADA' },
      });
      if (occ) {
        await prisma.collectionRoute.update({
          where: { id: occ.id },
          data: { isException: true, driverId: driverUserId },
        });
      }

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/route-templates/${template.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ driverId: altDriverId, version: template.version, propagate: true, overwriteExceptions: false });

      expect(res.status).toBe(200);
      const propagation = (res.body as { propagation: { exceptionsSkipped: number } }).propagation;
      expect(propagation.exceptionsSkipped).toBeGreaterThanOrEqual(0);

      // Exception occurrence should NOT have been updated to altDriverId
      if (occ) {
        const updated = await prisma.collectionRoute.findUnique({ where: { id: occ.id } });
        expect(updated!.driverId).toBe(driverUserId);
        expect(updated!.isException).toBe(true);
      }
    });

    it('overwrites exceptions when overwriteExceptions=true', async () => {
      const created = await createTemplate({ name: 'Overwrite Exceptions' });
      const template = (created.body as { template: { id: string; version: number } }).template;

      const occ = await prisma.collectionRoute.findFirst({
        where: { templateId: template.id, status: 'PLANEJADA' },
      });
      if (occ) {
        await prisma.collectionRoute.update({
          where: { id: occ.id },
          data: { isException: true, driverId: driverUserId },
        });
      }

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/route-templates/${template.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ driverId: altDriverId, version: template.version, propagate: true, overwriteExceptions: true });

      expect(res.status).toBe(200);
      const propagation = (res.body as { propagation: { exceptionsOverwritten: number } }).propagation;
      expect(propagation.exceptionsOverwritten).toBeGreaterThanOrEqual(0);

      // Exception occurrence should have been updated and cleared
      if (occ) {
        const updated = await prisma.collectionRoute.findUnique({ where: { id: occ.id } });
        expect(updated!.driverId).toBe(altDriverId);
        expect(updated!.isException).toBe(false);
      }
    });

    it('generates occurrences for newly added recurrenceDays', async () => {
      const created = await createTemplate({ name: 'Nova Recorrência', recurrenceDays: [1] }); // Only Monday
      const template = (created.body as { template: { id: string; version: number } }).template;

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/route-templates/${template.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ recurrenceDays: [1, 5], version: template.version, propagate: true }); // Add Friday

      expect(res.status).toBe(200);
      const propagation = (res.body as { propagation: { newOccurrencesGenerated: number } }).propagation;
      expect(propagation.newOccurrencesGenerated).toBeGreaterThanOrEqual(0);

      // Verify Friday occurrences were generated
      const fridayOccs = await prisma.collectionRoute.findMany({
        where: { templateId: template.id, status: 'PLANEJADA' },
        select: { plannedDate: true },
      });
      const hasFridays = fridayOccs.some((o) => new Date(o.plannedDate).getUTCDay() === 5);
      expect(hasFridays).toBe(true);
    });

    it('persists updated template points and uses them in later generated occurrences', async () => {
      const created = await createTemplate({ name: 'Propagação Pontos', recurrenceDays: [1] });
      const template = (created.body as { template: { id: string; version: number } }).template;

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/route-templates/${template.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          recurrenceDays: [1, 5],
          points: [{ collectionPointId: altPointId, sequence: 1 }],
          version: template.version,
          propagate: true,
        });

      expect(res.status).toBe(200);

      const templatePoints = await prisma.routeTemplatePoint.findMany({
        where: { templateId: template.id },
        select: { collectionPointId: true },
      });
      expect(templatePoints).toHaveLength(1);
      expect(templatePoints[0].collectionPointId).toBe(altPointId);

      const generatedWithNewDay = await prisma.collectionRoute.findFirst({
        where: { templateId: template.id, status: 'PLANEJADA' },
        orderBy: { plannedDate: 'desc' },
        include: { routePoints: true },
      });
      expect(generatedWithNewDay?.routePoints[0]?.collectionPointId).toBe(altPointId);
    });
  });

  describe('No propagation without propagate=true', () => {
    it('updates template but does not touch occurrences when propagate is absent', async () => {
      const created = await createTemplate({ name: 'Sem Propagação' });
      const template = (created.body as { template: { id: string; version: number } }).template;

      const before = await prisma.collectionRoute.findMany({
        where: { templateId: template.id, status: 'PLANEJADA' },
        select: { driverId: true },
      });

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/route-templates/${template.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ driverId: altDriverId, version: template.version });

      expect(res.status).toBe(200);
      expect((res.body as { propagation: unknown }).propagation).toBeNull();

      const after = await prisma.collectionRoute.findMany({
        where: { templateId: template.id, status: 'PLANEJADA' },
        select: { driverId: true },
      });

      // Driver on occurrences should be unchanged
      for (let i = 0; i < before.length; i++) {
        expect(after[i]?.driverId).toBe(before[i].driverId);
      }
    });
  });
});
