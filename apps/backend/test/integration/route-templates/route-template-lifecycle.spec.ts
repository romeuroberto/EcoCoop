import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { GEOCODING_PROVIDER } from '../../../src/common/providers/geocoding/geocoding.provider';
import { PrismaService } from '../../../src/common/prisma.service';

describe('RouteTemplates Lifecycle (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
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

  const createTemplate = async (overrides: Record<string, unknown> = {}) => {
    const today = new Date().toISOString().split('T')[0];
    const res = await request(app.getHttpServer())
      .post('/api/v1/route-templates')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Template Ciclo de Vida',
        recurrenceDays: [1, 3, 5],
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
      where: { email: 'driver-lifecycle-test@ecocoop.local' },
      create: { email: 'driver-lifecycle-test@ecocoop.local', passwordHash: hash, profileId: driverProfile!.id },
      update: {},
    });
    driverUserId = driverUser.id;

    const vehicle = await prisma.vehicle.create({
      data: { plate: `LCY-${Math.random().toString(36).slice(2, 8)}`.toUpperCase(), type: 'TRUCK', model: 'Test Truck', isActive: true },
    });
    vehicleId = vehicle.id;

    const cp = await prisma.collectionPoint.create({
      data: { name: 'Ponto Lifecycle', address: 'Rua LCY, 1', isActive: true },
    });
    pointId = cp.id;
  });

  afterAll(async () => {
    await prisma.collectionRoute.deleteMany({ where: { templateId: { in: createdTemplateIds } } });
    await prisma.routeTemplate.deleteMany({ where: { id: { in: createdTemplateIds } } });
    await prisma.collectionPoint.deleteMany({ where: { id: pointId } });
    await prisma.vehicle.deleteMany({ where: { id: vehicleId } });
    await prisma.user.deleteMany({ where: { email: 'driver-lifecycle-test@ecocoop.local' } });
    await app.close();
  });

  describe('POST /route-templates — create', () => {
    it('creates a template with status ATIVO and generates occurrences', async () => {
      const res = await createTemplate({ name: 'Criação Básica' });

      expect(res.status).toBe(201);
      const body = res.body as { template: { id: string; status: string; version: number }; generatedOccurrences: number };
      expect(body.template.status).toBe('ATIVO');
      expect(body.template.version).toBe(0);
      expect(body.generatedOccurrences).toBeGreaterThan(0);
    });

    it('returns 422 when driver does not exist', async () => {
      const res = await createTemplate({ driverId: '00000000-0000-0000-0000-000000000000' });
      expect(res.status).toBe(422);
      expect((res.body as { code: string }).code).toBe('DRIVER_INVALID');
    });

    it('returns 422 when vehicle does not exist', async () => {
      const res = await createTemplate({ vehicleId: '00000000-0000-0000-0000-000000000000' });
      expect(res.status).toBe(422);
      expect((res.body as { code: string }).code).toBe('VEHICLE_INVALID');
    });

    it('returns 400 when recurrenceDays is empty', async () => {
      const res = await createTemplate({ recurrenceDays: [] });
      expect(res.status).toBe(400);
    });

    it('returns 400 when recurrenceDays has value outside 0-6', async () => {
      const res = await createTemplate({ recurrenceDays: [7] });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /route-templates — list', () => {
    it('returns paginated list of templates', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/route-templates')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      const body = res.body as { data: unknown[]; total: number; page: number; limit: number };
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.total).toBeGreaterThan(0);
    });

    it('filters by status', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/route-templates?status=ATIVO')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      const data = (res.body as { data: { status: string }[] }).data;
      for (const t of data) {
        expect(t.status).toBe('ATIVO');
      }
    });
  });

  describe('GET /route-templates/:id — findOne', () => {
    it('returns template with paginated occurrences', async () => {
      const created = await createTemplate({ name: 'FindOne Test' });
      const templateId = (created.body as { template: { id: string } }).template.id;

      const res = await request(app.getHttpServer())
        .get(`/api/v1/route-templates/${templateId}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      const body = res.body as { id: string; occurrences: { data: unknown[]; total: number } };
      expect(body.id).toBe(templateId);
      expect(body.occurrences.total).toBeGreaterThanOrEqual(0);
    });

    it('returns 404 for unknown id', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/route-templates/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /route-templates/:id — update', () => {
    it('updates name and increments version', async () => {
      const created = await createTemplate({ name: 'Update Before' });
      const template = (created.body as { template: { id: string; version: number } }).template;

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/route-templates/${template.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ name: 'Update After', version: template.version });

      expect(res.status).toBe(200);
      const updated = (res.body as { template: { name: string; version: number } }).template;
      expect(updated.name).toBe('Update After');
      expect(updated.version).toBe(template.version + 1);
    });

    it('returns 409 on version mismatch (optimistic concurrency)', async () => {
      const created = await createTemplate({ name: 'Concurrency Test' });
      const templateId = (created.body as { template: { id: string } }).template.id;

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/route-templates/${templateId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ name: 'Conflict Update', version: 999 });

      expect(res.status).toBe(409);
      expect((res.body as { code: string }).code).toBe('CONCURRENT_MODIFICATION');
    });

    it('rejects update without version', async () => {
      const created = await createTemplate({ name: 'Missing Version Test' });
      const templateId = (created.body as { template: { id: string } }).template.id;

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/route-templates/${templateId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ name: 'Update Without Version' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /route-templates/:id/deactivate', () => {
    it('sets template to INATIVO and cancels PLANEJADA occurrences', async () => {
      const created = await createTemplate({ name: 'To Deactivate' });
      const templateId = (created.body as { template: { id: string } }).template.id;

      const res = await request(app.getHttpServer())
        .post(`/api/v1/route-templates/${templateId}/deactivate`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send();

      expect(res.status).toBe(200);
      const body = res.body as { template: { status: string }; cancelledOccurrences: number };
      expect(body.template.status).toBe('INATIVO');
      expect(body.cancelledOccurrences).toBeGreaterThanOrEqual(0);

      // Verify in DB
      const planejadas = await prisma.collectionRoute.count({
        where: { templateId, status: 'PLANEJADA' },
      });
      expect(planejadas).toBe(0);
    });

    it('returns 409 when already INATIVO', async () => {
      const created = await createTemplate({ name: 'Already Inactive Test' });
      const templateId = (created.body as { template: { id: string } }).template.id;

      await request(app.getHttpServer())
        .post(`/api/v1/route-templates/${templateId}/deactivate`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send();

      const secondRes = await request(app.getHttpServer())
        .post(`/api/v1/route-templates/${templateId}/deactivate`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send();

      expect(secondRes.status).toBe(409);
      expect((secondRes.body as { code: string }).code).toBe('TEMPLATE_ALREADY_INACTIVE');
    });
  });

  describe('POST /route-templates/:id/activate', () => {
    it('sets template to ATIVO and generates new occurrences', async () => {
      const created = await createTemplate({ name: 'Activate Me' });
      const templateId = (created.body as { template: { id: string } }).template.id;

      await request(app.getHttpServer())
        .post(`/api/v1/route-templates/${templateId}/deactivate`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send();

      const newStart = new Date();
      newStart.setDate(newStart.getDate() + 1);
      const newStartDate = newStart.toISOString().split('T')[0];

      const activateRes = await request(app.getHttpServer())
        .post(`/api/v1/route-templates/${templateId}/activate`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ startDate: newStartDate });

      expect(activateRes.status).toBe(200);
      const body = activateRes.body as { template: { status: string }; generatedOccurrences: number };
      expect(body.template.status).toBe('ATIVO');
      expect(body.generatedOccurrences).toBeGreaterThanOrEqual(0);
    });

    it('returns 400 when startDate is in the past', async () => {
      const created = await createTemplate({ name: 'Activate Past Date' });
      const templateId = (created.body as { template: { id: string } }).template.id;

      await request(app.getHttpServer())
        .post(`/api/v1/route-templates/${templateId}/deactivate`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send();

      const past = new Date();
      past.setDate(past.getDate() - 1);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/route-templates/${templateId}/activate`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ startDate: past.toISOString().split('T')[0] });

      expect(res.status).toBe(400);
    });

    it('returns 409 when already ATIVO', async () => {
      const created = await createTemplate({ name: 'Already Active Test' });
      const templateId = (created.body as { template: { id: string } }).template.id;

      const today = new Date().toISOString().split('T')[0];
      const res = await request(app.getHttpServer())
        .post(`/api/v1/route-templates/${templateId}/activate`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ startDate: today });

      expect(res.status).toBe(409);
      expect((res.body as { code: string }).code).toBe('TEMPLATE_ALREADY_ACTIVE');
    });
  });

  describe('POST /route-templates/:id/duplicate — HTTP 200 draft', () => {
    it('returns draft with suffix "(cópia)" and null dates without persisting', async () => {
      const created = await createTemplate({ name: 'Original Template' });
      const original = (created.body as { template: { id: string; name: string } }).template;

      const beforeCount = await prisma.routeTemplate.count();

      const dupRes = await request(app.getHttpServer())
        .post(`/api/v1/route-templates/${original.id}/duplicate`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send();

      expect(dupRes.status).toBe(200);
      const draft = (dupRes.body as { draft: { name: string; startDate: unknown; endDate: unknown } }).draft;
      expect(draft.name).toBe(`${original.name} (cópia)`);
      expect(draft.startDate).toBeNull();
      expect(draft.endDate).toBeNull();

      const afterCount = await prisma.routeTemplate.count();
      expect(afterCount).toBe(beforeCount); // Nothing was persisted
    });
  });
});
