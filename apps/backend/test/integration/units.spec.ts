import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma.service';

describe('Units of Measure (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let managerToken: string;
  let baseUnitId: string;

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
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
    prisma = app.get(PrismaService);

    adminToken = await login('admin@ecocoop.local', 'admin123');
    managerToken = await login('gestor@ecocoop.local', 'gestor123');
  });

  afterAll(async () => {
    await prisma.unitOfMeasure.deleteMany({ where: { symbol: { startsWith: 'T-' } } });
    await app.close();
  });

  it('ADMIN POST /units — creates base unit without conversion (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/units')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test-Quilograma', symbol: 'T-kg' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test-Quilograma');
    expect(res.body.baseUnit).toBeNull();
    baseUnitId = res.body.id as string;
  });

  it('POST /units — creates derived unit with baseUnitId + conversionFactor (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/units')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test-Grama', symbol: 'T-g', baseUnitId, conversionFactor: 0.001 });

    expect(res.status).toBe(201);
    expect(res.body.baseUnit).toBeDefined();
    expect(res.body.baseUnit.id).toBe(baseUnitId);
  });

  it('POST /units — self-reference returns 400 UNIT_SELF_REFERENCE', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/units')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test-Loop', symbol: 'T-lp', baseUnitId, conversionFactor: 1 });

    // We need to create the unit first and then try to set its own ID —
    // since we can't know the ID beforehand, test PATCH self-reference instead
    const unit = await request(app.getHttpServer())
      .post('/api/v1/units')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test-SelfBase', symbol: 'T-sb' });
    expect(unit.status).toBe(201);
    const unitId = (unit.body as { id: string }).id;

    const patchRes = await request(app.getHttpServer())
      .patch(`/api/v1/units/${unitId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ baseUnitId: unitId, conversionFactor: 1 });

    expect(patchRes.status).toBe(400);
    expect(patchRes.body.code).toBe('UNIT_SELF_REFERENCE');
  });

  it('POST /units — conversionFactor without baseUnitId returns 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/units')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test-NoBase', symbol: 'T-nb', conversionFactor: 1.5 });

    expect(res.status).toBe(400);
  });

  it('POST /units — baseUnitId without conversionFactor returns 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/units')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test-NoCF', symbol: 'T-ncf', baseUnitId });

    expect(res.status).toBe(400);
  });

  it('POST /units — duplicate name returns 409 UNIT_NAME_CONFLICT', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/units')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test-Quilograma', symbol: 'T-kg2' });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('UNIT_NAME_CONFLICT');
  });

  it('POST /units — duplicate symbol returns 409 UNIT_SYMBOL_CONFLICT', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/units')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test-Quilograma2', symbol: 'T-kg' });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('UNIT_SYMBOL_CONFLICT');
  });

  it('MANAGER POST /units — returns 403', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/units')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ name: 'Test-Tonelada', symbol: 'T-t' });

    expect(res.status).toBe(403);
  });

  it('GET /units — returns paginated envelope with baseUnit nested', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/units')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('page', 1);
    expect(res.body).toHaveProperty('limit', 20);

    const derived = (res.body.data as { baseUnit: unknown }[]).find((u) => u.baseUnit !== null);
    if (derived) {
      expect(derived.baseUnit).toHaveProperty('id');
    }
  });
});
