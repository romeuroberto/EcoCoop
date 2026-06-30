import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma.service';

describe('EPI Types (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let managerToken: string;
  let buyerToken: string;

  const login = async (email: string, password: string) => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password });
    return (res.body as { accessToken: string }).accessToken;
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();
    prisma = app.get(PrismaService);

    adminToken = await login('admin@ecocoop.local', 'admin123');
    managerToken = await login('gestor@ecocoop.local', 'gestor123');
    buyerToken = await login('comprador@ecocoop.local', 'comprador123');
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { entityType: 'epiType' } });
    await prisma.epiType.deleteMany({ where: { name: { startsWith: 'Test-EPI-' } } });
    await app.close();
  });

  it('ADMIN POST /epi-types — creates with validity (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/epi-types')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test-EPI-Luva de raspa', defaultValidityDays: 180 });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test-EPI-Luva de raspa');
    expect(res.body.defaultValidityDays).toBe(180);
    expect(res.body.isActive).toBe(true);
  });

  it('ADMIN POST /epi-types — creates without validity (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/epi-types')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test-EPI-Bota PVC' });

    expect(res.status).toBe(201);
    expect(res.body.defaultValidityDays).toBeNull();
  });

  it('POST /epi-types — duplicate name returns 409 EPI_TYPE_NAME_CONFLICT', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/epi-types')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test-EPI-Luva de raspa' });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('EPI_TYPE_NAME_CONFLICT');
  });

  it('POST /epi-types — defaultValidityDays of 0 returns 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/epi-types')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test-EPI-Invalid', defaultValidityDays: 0 });

    expect(res.status).toBe(400);
  });

  it('MANAGER GET /epi-types — returns 200 with paginated envelope {data, total, page, limit}', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/epi-types')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('page', 1);
    expect(res.body).toHaveProperty('limit', 20);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('MANAGER GET /epi-types/:id — returns 200', async () => {
    const epiType = await prisma.epiType.findFirst({ where: { name: 'Test-EPI-Bota PVC' } });
    expect(epiType).not.toBeNull();

    const res = await request(app.getHttpServer())
      .get(`/api/v1/epi-types/${epiType!.id}`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Test-EPI-Bota PVC');
  });

  it('MANAGER POST /epi-types — returns 403', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/epi-types')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ name: 'Test-EPI-Blocked-Manager' });

    expect(res.status).toBe(403);
  });

  it('MANAGER PATCH /epi-types/:id — returns 403', async () => {
    const epiType = await prisma.epiType.findFirst({ where: { name: 'Test-EPI-Bota PVC' } });
    expect(epiType).not.toBeNull();

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/epi-types/${epiType!.id}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ name: 'Test-EPI-Renamed' });

    expect(res.status).toBe(403);
  });

  it('POST /epi-types — user without EPI_TYPES permission returns 403', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/epi-types')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ name: 'Test-EPI-X' });

    expect(res.status).toBe(403);
  });

  it('ADMIN GET /epi-types/:id — returns 200', async () => {
    const epiType = await prisma.epiType.findFirst({ where: { name: 'Test-EPI-Luva de raspa' } });
    expect(epiType).not.toBeNull();

    const res = await request(app.getHttpServer())
      .get(`/api/v1/epi-types/${epiType!.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(epiType!.id);
  });

  it('GET /epi-types/:id — unknown id returns 404 EPI_TYPE_NOT_FOUND', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/epi-types/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('EPI_TYPE_NOT_FOUND');
  });

  it('PATCH /epi-types/:id — inactivated type absent from ?status=active list', async () => {
    const epiType = await prisma.epiType.findFirst({ where: { name: 'Test-EPI-Bota PVC' } });
    expect(epiType).not.toBeNull();

    await request(app.getHttpServer())
      .patch(`/api/v1/epi-types/${epiType!.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });

    const listRes = await request(app.getHttpServer())
      .get('/api/v1/epi-types?status=active')
      .set('Authorization', `Bearer ${adminToken}`);

    const ids = (listRes.body.data as { id: string }[]).map((e) => e.id);
    expect(ids).not.toContain(epiType!.id);
  });

  it('PATCH /epi-types/:id — previousState non-null in AuditLog (SC-004)', async () => {
    const epiType = await prisma.epiType.create({
      data: { name: 'Test-EPI-Audit' },
    });

    await request(app.getHttpServer())
      .patch(`/api/v1/epi-types/${epiType.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ defaultValidityDays: 90 });

    await new Promise((r) => setTimeout(r, 150));

    const log = await prisma.auditLog.findFirst({
      where: { entityType: 'epiType', entityId: epiType.id, action: 'UPDATE' },
      orderBy: { createdAt: 'desc' },
    });

    expect(log).toBeDefined();
    expect(log!.previousState).not.toBeNull();
    expect(log!.newState).not.toBeNull();
  });
});
