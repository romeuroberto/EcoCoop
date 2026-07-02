import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { GEOCODING_PROVIDER } from '../../../src/common/providers/geocoding/geocoding.provider';
import { PrismaService } from '../../../src/common/prisma.service';

describe('Occurrence Exception Handling (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let managerToken: string;
  let driverUserId: string;
  let altDriverId: string;
  let vehicleId: string;
  let pointId: string;
  let altPointId: string;
  const createdTemplateIds: string[] = [];
  const createdRouteIds: string[] = [];

  const mockGeocodingProvider = { geocode: jest.fn().mockResolvedValue(null) };

  const login = async (email: string, password: string) => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password });
    return (res.body as { accessToken: string }).accessToken;
  };

  const createTemplateAndGetOccurrence = async () => {
    const today = new Date().toISOString().split('T')[0];
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/route-templates')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Template para Exceção',
        recurrenceDays: [0, 1, 2, 3, 4, 5, 6],
        startDate: today,
        driverId: driverUserId,
        vehicleId,
        points: [{ collectionPointId: pointId, sequence: 1 }],
      });
    expect(createRes.status).toBe(201);
    const templateId = (createRes.body as { template: { id: string } }).template.id;
    createdTemplateIds.push(templateId);

    const occurrence = await prisma.collectionRoute.findFirst({
      where: { templateId, status: 'PLANEJADA' },
    });
    return { templateId, occurrenceId: occurrence!.id };
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
      where: { email: 'driver-exc-test@ecocoop.local' },
      create: { email: 'driver-exc-test@ecocoop.local', passwordHash: hash, profileId: driverProfile!.id },
      update: {},
    });
    driverUserId = driverUser.id;

    const altDriver = await prisma.user.upsert({
      where: { email: 'driver-exc-alt@ecocoop.local' },
      create: { email: 'driver-exc-alt@ecocoop.local', passwordHash: hash, profileId: driverProfile!.id },
      update: {},
    });
    altDriverId = altDriver.id;

    const vehicle = await prisma.vehicle.create({
      data: { plate: `EXC-${Math.random().toString(36).slice(2, 8)}`.toUpperCase(), type: 'VAN', model: 'Exc Van', isActive: true },
    });
    vehicleId = vehicle.id;

    const cp = await prisma.collectionPoint.create({
      data: { name: 'Ponto Exc', address: 'Rua Exc, 1', isActive: true },
    });
    pointId = cp.id;

    const altCp = await prisma.collectionPoint.create({
      data: { name: 'Ponto Alt', address: 'Rua Alt, 1', isActive: true },
    });
    altPointId = altCp.id;
  });

  afterAll(async () => {
    await prisma.collectionRoute.deleteMany({ where: { templateId: { in: createdTemplateIds } } });
    await prisma.collectionRoute.deleteMany({ where: { id: { in: createdRouteIds } } });
    await prisma.routeTemplate.deleteMany({ where: { id: { in: createdTemplateIds } } });
    await prisma.collectionPoint.deleteMany({ where: { id: { in: [pointId, altPointId] } } });
    await prisma.vehicle.deleteMany({ where: { id: vehicleId } });
    await prisma.user.deleteMany({ where: { email: { in: ['driver-exc-test@ecocoop.local', 'driver-exc-alt@ecocoop.local'] } } });
    await app.close();
  });

  describe('Structural edit on template occurrence sets isException=true', () => {
    it('marks occurrence as exception when driver is changed', async () => {
      const { occurrenceId } = await createTemplateAndGetOccurrence();

      const patchRes = await request(app.getHttpServer())
        .patch(`/api/v1/collection-routes/${occurrenceId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ driverId: altDriverId });

      expect(patchRes.status).toBe(200);

      const updated = await prisma.collectionRoute.findUnique({ where: { id: occurrenceId } });
      expect(updated!.isException).toBe(true);
    });

    it('marks occurrence as exception when plannedDate is changed', async () => {
      const { occurrenceId } = await createTemplateAndGetOccurrence();

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 60);

      const patchRes = await request(app.getHttpServer())
        .patch(`/api/v1/collection-routes/${occurrenceId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ plannedDate: tomorrow.toISOString().split('T')[0] });

      expect(patchRes.status).toBe(200);

      const updated = await prisma.collectionRoute.findUnique({ where: { id: occurrenceId } });
      expect(updated!.isException).toBe(true);
    });

    it('marks occurrence as exception when points are added and reordered', async () => {
      const { occurrenceId } = await createTemplateAndGetOccurrence();

      const addRes = await request(app.getHttpServer())
        .post(`/api/v1/collection-routes/${occurrenceId}/points`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ collectionPointId: altPointId });

      expect(addRes.status).toBe(201);
      let updated = await prisma.collectionRoute.findUnique({ where: { id: occurrenceId } });
      expect(updated!.isException).toBe(true);

      const routePoints = await prisma.routePoint.findMany({
        where: { routeId: occurrenceId },
        orderBy: { sequence: 'asc' },
      });

      const reorderRes = await request(app.getHttpServer())
        .patch(`/api/v1/collection-routes/${occurrenceId}/points/reorder`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ orderedPointIds: routePoints.map((p) => p.collectionPointId).reverse() });

      expect(reorderRes.status).toBe(200);
      updated = await prisma.collectionRoute.findUnique({ where: { id: occurrenceId } });
      expect(updated!.isException).toBe(true);
    });
  });

  describe('Status-based edit restrictions on occurrences', () => {
    it('returns 422 when editing a CONCLUIDA occurrence', async () => {
      const { occurrenceId } = await createTemplateAndGetOccurrence();

      // Force status to CONCLUIDA in DB
      await prisma.collectionRoute.update({
        where: { id: occurrenceId },
        data: { status: 'CONCLUIDA' },
      });

      const patchRes = await request(app.getHttpServer())
        .patch(`/api/v1/collection-routes/${occurrenceId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ notes: 'edit' });

      expect(patchRes.status).toBe(422);
      expect((patchRes.body as { code: string }).code).toBe('ROUTE_NOT_EDITABLE');
    });

    it('returns 422 when editing a CANCELADA occurrence', async () => {
      const { occurrenceId } = await createTemplateAndGetOccurrence();

      await prisma.collectionRoute.update({
        where: { id: occurrenceId },
        data: { status: 'CANCELADA' },
      });

      const patchRes = await request(app.getHttpServer())
        .patch(`/api/v1/collection-routes/${occurrenceId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ notes: 'edit' });

      expect(patchRes.status).toBe(422);
      expect((patchRes.body as { code: string }).code).toBe('ROUTE_NOT_EDITABLE');
    });

    it('returns 422 for structural edit on EM_ANDAMENTO occurrence', async () => {
      const { occurrenceId } = await createTemplateAndGetOccurrence();

      await prisma.collectionRoute.update({
        where: { id: occurrenceId },
        data: { status: 'EM_ANDAMENTO' },
      });

      const patchRes = await request(app.getHttpServer())
        .patch(`/api/v1/collection-routes/${occurrenceId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ driverId: altDriverId });

      expect(patchRes.status).toBe(422);
    });

    it('allows non-structural edit on EM_ANDAMENTO occurrence', async () => {
      const { occurrenceId } = await createTemplateAndGetOccurrence();

      await prisma.collectionRoute.update({
        where: { id: occurrenceId },
        data: { status: 'EM_ANDAMENTO' },
      });

      const patchRes = await request(app.getHttpServer())
        .patch(`/api/v1/collection-routes/${occurrenceId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ notes: 'Observação atualizada' });

      expect(patchRes.status).toBe(200);
    });
  });

  describe('Cancel EM_ANDAMENTO requires confirmInProgress', () => {
    it('returns 422 when cancelling EM_ANDAMENTO without confirmInProgress', async () => {
      const { occurrenceId } = await createTemplateAndGetOccurrence();

      await prisma.collectionRoute.update({
        where: { id: occurrenceId },
        data: { status: 'EM_ANDAMENTO' },
      });

      const cancelRes = await request(app.getHttpServer())
        .post(`/api/v1/collection-routes/${occurrenceId}/cancel`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ reason: 'Cancelamento sem confirmação' });

      expect(cancelRes.status).toBe(422);
    });

    it('returns 422 when cancelling EM_ANDAMENTO with confirmInProgress=false', async () => {
      const { occurrenceId } = await createTemplateAndGetOccurrence();

      await prisma.collectionRoute.update({
        where: { id: occurrenceId },
        data: { status: 'EM_ANDAMENTO' },
      });

      const cancelRes = await request(app.getHttpServer())
        .post(`/api/v1/collection-routes/${occurrenceId}/cancel`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ reason: 'Cancelamento confirmado', confirmInProgress: false });

      expect(cancelRes.status).toBe(422);
    });

    it('cancels EM_ANDAMENTO when confirmInProgress=true', async () => {
      const { occurrenceId } = await createTemplateAndGetOccurrence();

      await prisma.collectionRoute.update({
        where: { id: occurrenceId },
        data: { status: 'EM_ANDAMENTO' },
      });

      const cancelRes = await request(app.getHttpServer())
        .post(`/api/v1/collection-routes/${occurrenceId}/cancel`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ reason: 'Cancelamento confirmado', confirmInProgress: true });

      expect(cancelRes.status).toBe(200);
      const updated = await prisma.collectionRoute.findUnique({ where: { id: occurrenceId } });
      expect(updated!.status).toBe('CANCELADA');
    });

    it('returns 422 when cancelling ad-hoc EM_ANDAMENTO without confirmInProgress', async () => {
      const route = await prisma.collectionRoute.create({
        data: {
          name: 'Rota Avulsa Em Andamento',
          plannedDate: new Date(),
          status: 'EM_ANDAMENTO',
          vehicleId,
          driverId: driverUserId,
        },
      });
      createdRouteIds.push(route.id);

      const cancelRes = await request(app.getHttpServer())
        .post(`/api/v1/collection-routes/${route.id}/cancel`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ reason: 'Cancelamento avulso sem confirmação' });

      expect(cancelRes.status).toBe(422);
      expect((cancelRes.body as { code: string }).code).toBe('CONFIRM_IN_PROGRESS_REQUIRED');
    });
  });

  describe('Filters on collection-routes for template occurrences', () => {
    it('filters by templateId', async () => {
      const { templateId } = await createTemplateAndGetOccurrence();

      const res = await request(app.getHttpServer())
        .get(`/api/v1/collection-routes?templateId=${templateId}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      const data = (res.body as { data: { templateId: string }[] }).data;
      for (const route of data) {
        expect(route.templateId).toBe(templateId);
      }
    });

    it('filters by hasTemplate=true', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/collection-routes?hasTemplate=true')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      const data = (res.body as { data: { templateId: unknown }[] }).data;
      for (const route of data) {
        expect(route.templateId).not.toBeNull();
      }
    });

    it('filters by hasTemplate=false (ad-hoc routes)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/collection-routes?hasTemplate=false')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      const data = (res.body as { data: { templateId: unknown }[] }).data;
      for (const route of data) {
        expect(route.templateId).toBeNull();
      }
    });
  });
});
