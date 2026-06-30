import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma.service';

describe('Cost Centers (integration)', () => {
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
    await prisma.auditLog.deleteMany({ where: { entityType: 'costCenter' } });
    await prisma.costCenter.deleteMany({ where: { name: { startsWith: 'Test-CC-' } } });
    await app.close();
  });

  it('ADMIN POST /cost-centers — creates with code (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/cost-centers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test-CC-Logística', code: 'TST-LOG-001', description: 'Custos de coleta' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test-CC-Logística');
    expect(res.body.code).toBe('TST-LOG-001');
    expect(res.body.isActive).toBe(true);
  });

  it('ADMIN POST /cost-centers — creates without code (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/cost-centers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test-CC-Administrativo' });

    expect(res.status).toBe(201);
    expect(res.body.code).toBeNull();
  });

  it('POST /cost-centers — duplicate code case-insensitive returns 409 COST_CENTER_CODE_CONFLICT', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/cost-centers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test-CC-Outra Logistica', code: 'tst-log-001' });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('COST_CENTER_CODE_CONFLICT');
  });

  it('POST /cost-centers — duplicate name returns 409 COST_CENTER_NAME_CONFLICT', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/cost-centers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test-CC-Logística' });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('COST_CENTER_NAME_CONFLICT');
  });

  it('MANAGER GET /cost-centers — returns 200 with paginated envelope {data, total, page, limit}', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/cost-centers')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('page', 1);
    expect(res.body).toHaveProperty('limit', 20);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('MANAGER GET /cost-centers/:id — returns 200', async () => {
    const cc = await prisma.costCenter.findFirst({ where: { name: 'Test-CC-Administrativo' } });
    expect(cc).not.toBeNull();

    const res = await request(app.getHttpServer())
      .get(`/api/v1/cost-centers/${cc!.id}`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Test-CC-Administrativo');
  });

  it('MANAGER POST /cost-centers — returns 403', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/cost-centers')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ name: 'Test-CC-Blocked-Manager' });

    expect(res.status).toBe(403);
  });

  it('MANAGER PATCH /cost-centers/:id — returns 403', async () => {
    const cc = await prisma.costCenter.findFirst({ where: { name: 'Test-CC-Administrativo' } });
    expect(cc).not.toBeNull();

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/cost-centers/${cc!.id}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ name: 'Test-CC-Renamed' });

    expect(res.status).toBe(403);
  });

  it('POST /cost-centers — user without COST_CENTERS permission returns 403', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/cost-centers')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ name: 'Test-CC-X' });

    expect(res.status).toBe(403);
  });

  it('ADMIN GET /cost-centers/:id — returns 200', async () => {
    const cc = await prisma.costCenter.findFirst({ where: { name: 'Test-CC-Logística' } });
    expect(cc).not.toBeNull();

    const res = await request(app.getHttpServer())
      .get(`/api/v1/cost-centers/${cc!.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(cc!.id);
  });

  it('GET /cost-centers/:id — unknown id returns 404 COST_CENTER_NOT_FOUND', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/cost-centers/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('COST_CENTER_NOT_FOUND');
  });

  it('PATCH /cost-centers/:id — inactivated center absent from ?status=active list', async () => {
    const cc = await prisma.costCenter.findFirst({ where: { name: 'Test-CC-Administrativo' } });
    expect(cc).not.toBeNull();

    await request(app.getHttpServer())
      .patch(`/api/v1/cost-centers/${cc!.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });

    const listRes = await request(app.getHttpServer())
      .get('/api/v1/cost-centers?status=active')
      .set('Authorization', `Bearer ${adminToken}`);

    const ids = (listRes.body.data as { id: string }[]).map((c) => c.id);
    expect(ids).not.toContain(cc!.id);
  });

  it('PATCH /cost-centers/:id — previousState non-null in AuditLog (SC-004)', async () => {
    const cc = await prisma.costCenter.create({
      data: { name: 'Test-CC-Audit' },
    });

    await request(app.getHttpServer())
      .patch(`/api/v1/cost-centers/${cc.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ description: 'Auditado' });

    await new Promise((r) => setTimeout(r, 150));

    const log = await prisma.auditLog.findFirst({
      where: { entityType: 'costCenter', entityId: cc.id, action: 'UPDATE' },
      orderBy: { createdAt: 'desc' },
    });

    expect(log).toBeDefined();
    expect(log!.previousState).not.toBeNull();
    expect(log!.newState).not.toBeNull();
  });
});
