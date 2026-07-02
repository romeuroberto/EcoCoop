import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma.service';

describe('ReadyStock (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let sorterToken: string;
  let driverToken: string;
  let sorterUserId: string;
  let driverUserId: string;
  let subcategoryId: string;
  let inactiveSubcategoryId: string;
  let otherSubcategoryId: string;
  let unitId: string;
  const testUserEmails = [
    'sorter-rs-test@ecocoop.local',
    'driver-rs-test@ecocoop.local',
  ];

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

    const hash = await bcrypt.hash('pwd123', 10);
    const sorterProfile = await prisma.profile.findFirstOrThrow({
      where: { type: 'SORTER', isCustom: false },
    });
    const driverProfile = await prisma.profile.findFirstOrThrow({
      where: { type: 'DRIVER', isCustom: false },
    });

    const sorter = await prisma.user.upsert({
      where: { email: 'sorter-rs-test@ecocoop.local' },
      create: {
        email: 'sorter-rs-test@ecocoop.local',
        passwordHash: hash,
        profileId: sorterProfile.id,
      },
      update: {},
    });
    sorterUserId = sorter.id;
    sorterToken = await login('sorter-rs-test@ecocoop.local', 'pwd123');

    const driver = await prisma.user.upsert({
      where: { email: 'driver-rs-test@ecocoop.local' },
      create: {
        email: 'driver-rs-test@ecocoop.local',
        passwordHash: hash,
        profileId: driverProfile.id,
      },
      update: {},
    });
    driverUserId = driver.id;
    driverToken = await login('driver-rs-test@ecocoop.local', 'pwd123');

    const unit = await prisma.unitOfMeasure.findFirstOrThrow({ where: { isActive: true } });
    unitId = unit.id;

    const category = await prisma.materialCategory.findFirstOrThrow();

    const sub = await prisma.materialSubcategory.create({
      data: {
        name: `RS-Sub-${Date.now()}`,
        categoryId: category.id,
        defaultUnitId: unitId,
        isActive: true,
      },
    });
    subcategoryId = sub.id;

    const inactiveSub = await prisma.materialSubcategory.create({
      data: {
        name: `RS-Inactive-${Date.now()}`,
        categoryId: category.id,
        defaultUnitId: unitId,
        isActive: false,
      },
    });
    inactiveSubcategoryId = inactiveSub.id;

    const otherSub = await prisma.materialSubcategory.create({
      data: {
        name: `RS-Other-${Date.now()}`,
        categoryId: category.id,
        defaultUnitId: unitId,
        isActive: true,
      },
    });
    otherSubcategoryId = otherSub.id;

    // Seed ready stock events:
    // 3 TRIAGEM_OUTPUT events for main subcategory (80 + 50 + 30 = 160 kg)
    await prisma.readyStockEvent.createMany({
      data: [
        {
          type: 'TRIAGEM_OUTPUT',
          subcategoryId,
          unitId,
          quantity: 80,
          userId: sorterUserId,
        },
        {
          type: 'TRIAGEM_OUTPUT',
          subcategoryId,
          unitId,
          quantity: 50,
          userId: sorterUserId,
        },
        {
          type: 'TRIAGEM_OUTPUT',
          subcategoryId,
          unitId,
          quantity: 30,
          userId: sorterUserId,
        },
      ],
    });

    // 1 AJUSTE event (negative: -10)
    await prisma.readyStockEvent.create({
      data: {
        type: 'AJUSTE',
        subcategoryId,
        unitId,
        quantity: -10,
        userId: sorterUserId,
      },
    });

    // 1 TRIAGEM_OUTPUT for inactive subcategory
    await prisma.readyStockEvent.create({
      data: {
        type: 'TRIAGEM_OUTPUT',
        subcategoryId: inactiveSubcategoryId,
        unitId,
        quantity: 20,
        userId: sorterUserId,
      },
    });

    // 1 TRIAGEM_OUTPUT for other subcategory
    await prisma.readyStockEvent.create({
      data: {
        type: 'TRIAGEM_OUTPUT',
        subcategoryId: otherSubcategoryId,
        unitId,
        quantity: 40,
        userId: sorterUserId,
      },
    });

    void driverUserId;
  });

  afterAll(async () => {
    if (!prisma) {
      if (app) await app.close();
      return;
    }

    await prisma.readyStockEvent.deleteMany({
      where: {
        subcategoryId: { in: [subcategoryId, inactiveSubcategoryId, otherSubcategoryId] },
      },
    });

    await prisma.materialSubcategory.deleteMany({
      where: { id: { in: [subcategoryId, inactiveSubcategoryId, otherSubcategoryId] } },
    });

    await prisma.user.deleteMany({ where: { email: { in: testUserEmails } } });

    await app.close();
  });

  // ─── GET /ready-stock ────────────────────────────────────────────────────────

  it('GET /ready-stock — retorna envelope com data e calculatedAt', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/ready-stock')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.calculatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('GET /ready-stock — saldo agregado: 80+50+30−10 = 150 kg para subcategoria principal', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/ready-stock')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ subcategoryId });

    expect(res.status).toBe(200);
    const item = res.body.data.find(
      (d: { subcategory: { id: string } }) => d.subcategory.id === subcategoryId,
    );
    expect(item).toBeDefined();
    expect(parseFloat(item.balance)).toBeCloseTo(150, 3);
    expect(item.eventCount).toBeGreaterThanOrEqual(4);
  });

  it('GET /ready-stock — estrutura obrigatória: subcategory(id,name,category), unit(id,name,symbol), balance, eventCount', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/ready-stock')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ subcategoryId });

    expect(res.status).toBe(200);
    const item = res.body.data.find(
      (d: { subcategory: { id: string } }) => d.subcategory.id === subcategoryId,
    );
    expect(item).toBeDefined();
    expect(item.balance).toMatch(/^\d+\.\d{3}$/);
    expect(typeof item.eventCount).toBe('number');
    expect(item.subcategory).toMatchObject({ id: subcategoryId, name: expect.any(String) });
    expect(item.subcategory.category).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
    });
    expect(item.unit).toMatchObject({
      id: unitId,
      name: expect.any(String),
      symbol: expect.any(String),
    });
  });

  it('GET /ready-stock — filtro por subcategoryId retorna apenas aquela subcategoria', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/ready-stock')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ subcategoryId });

    expect(res.status).toBe(200);
    for (const item of res.body.data) {
      expect((item as { subcategory: { id: string } }).subcategory.id).toBe(subcategoryId);
    }
  });

  it('GET /ready-stock — filtro por unitId retorna apenas aquela unidade', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/ready-stock')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ unitId });

    expect(res.status).toBe(200);
    for (const item of res.body.data) {
      expect((item as { unit: { id: string } }).unit.id).toBe(unitId);
    }
  });

  it('GET /ready-stock — subcategoria inativa NÃO aparece sem includeInactive', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/ready-stock')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ subcategoryId: inactiveSubcategoryId });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('GET /ready-stock — subcategoria inativa aparece com includeInactive=true', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/ready-stock')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ subcategoryId: inactiveSubcategoryId, includeInactive: 'true' });

    expect(res.status).toBe(200);
    const item = res.body.data.find(
      (d: { subcategory: { id: string } }) => d.subcategory.id === inactiveSubcategoryId,
    );
    expect(item).toBeDefined();
    expect(parseFloat(item.balance)).toBeCloseTo(20, 3);
  });

  it('GET /ready-stock — sem eventos para subcategoryId inexistente retorna data: []', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/ready-stock')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ subcategoryId: '00000000-0000-0000-0000-000000000000' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('GET /ready-stock — SORTER com permissão READY_STOCK:READ → 200', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/ready-stock')
      .set('Authorization', `Bearer ${sorterToken}`);

    expect(res.status).toBe(200);
  });

  it('GET /ready-stock — DRIVER sem permissão → 403', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/ready-stock')
      .set('Authorization', `Bearer ${driverToken}`);

    expect(res.status).toBe(403);
  });

  it('GET /ready-stock — não autenticado → 401', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/ready-stock');
    expect(res.status).toBe(401);
  });

  // ─── GET /ready-stock/movements ─────────────────────────────────────────────

  it('GET /ready-stock/movements — retorna envelope paginado com data/total/page/limit', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/ready-stock/movements')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(typeof res.body.total).toBe('number');
    expect(typeof res.body.page).toBe('number');
    expect(typeof res.body.limit).toBe('number');
  });

  it('GET /ready-stock/movements — estrutura obrigatória de cada item', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/ready-stock/movements')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ subcategoryId });

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);

    const item = res.body.data[0] as {
      id: string;
      type: string;
      subcategory: { id: string; name: string };
      unit: { id: string; symbol: string };
      quantity: string;
      sortingOperationId: unknown;
      adjustmentId: unknown;
      user: { id: string; email: string };
      createdAt: string;
    };
    expect(item.id).toBeDefined();
    expect(['TRIAGEM_OUTPUT', 'AJUSTE', 'ESTORNO']).toContain(item.type);
    expect(item.subcategory).toMatchObject({ id: expect.any(String), name: expect.any(String) });
    expect(item.unit).toMatchObject({ id: expect.any(String), symbol: expect.any(String) });
    expect(item.quantity).toMatch(/^-?\d+\.\d{3}$/);
    expect(item.user).toMatchObject({ id: expect.any(String), email: expect.any(String) });
    expect(item.createdAt).toBeDefined();
  });

  it('GET /ready-stock/movements — filtro por subcategoryId', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/ready-stock/movements')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ subcategoryId });

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const item of res.body.data) {
      expect((item as { subcategory: { id: string } }).subcategory.id).toBe(subcategoryId);
    }
  });

  it('GET /ready-stock/movements — filtro por type=TRIAGEM_OUTPUT', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/ready-stock/movements')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ subcategoryId, type: 'TRIAGEM_OUTPUT' });

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const item of res.body.data) {
      expect((item as { type: string }).type).toBe('TRIAGEM_OUTPUT');
    }
  });

  it('GET /ready-stock/movements — filtro por type=AJUSTE retorna apenas ajustes', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/ready-stock/movements')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ subcategoryId, type: 'AJUSTE' });

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const item of res.body.data) {
      expect((item as { type: string }).type).toBe('AJUSTE');
    }
    // AJUSTE event has negative quantity
    const ajuste = res.body.data[0] as { quantity: string };
    expect(parseFloat(ajuste.quantity)).toBeCloseTo(-10, 3);
  });

  it('GET /ready-stock/movements — paginação: page=1&limit=2 retorna ≤2 itens', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/ready-stock/movements')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ subcategoryId, page: 1, limit: 2 });

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(2);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(2);
    expect(res.body.total).toBeGreaterThanOrEqual(4);
  });

  it('GET /ready-stock/movements — filtro por período from/to', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/ready-stock/movements')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({
        subcategoryId,
        from: '2020-01-01',
        to: '2099-12-31',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('GET /ready-stock/movements — período futuro sem eventos retorna data: []', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/ready-stock/movements')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ from: '2099-01-01', to: '2099-12-31' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('GET /ready-stock/movements — SORTER com permissão → 200', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/ready-stock/movements')
      .set('Authorization', `Bearer ${sorterToken}`);

    expect(res.status).toBe(200);
  });

  it('GET /ready-stock/movements — DRIVER sem permissão → 403', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/ready-stock/movements')
      .set('Authorization', `Bearer ${driverToken}`);

    expect(res.status).toBe(403);
  });

  it('GET /ready-stock/movements — não autenticado → 401', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/ready-stock/movements');
    expect(res.status).toBe(401);
  });
});
