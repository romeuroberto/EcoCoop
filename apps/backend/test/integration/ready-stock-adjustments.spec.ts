import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma.service';

describe('ReadyStockAdjustments (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let managerToken: string;
  let sorterToken: string;
  let driverToken: string;
  let sorterUserId: string;
  let driverUserId: string;
  let subcategoryId: string;
  let unitId: string;
  const testUserEmails = [
    'sorter-rsa-test@ecocoop.local',
    'driver-rsa-test@ecocoop.local',
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
    managerToken = await login('gestor@ecocoop.local', 'gestor123');

    const hash = await bcrypt.hash('pwd123', 10);
    const sorterProfile = await prisma.profile.findFirstOrThrow({
      where: { type: 'SORTER', isCustom: false },
    });
    const driverProfile = await prisma.profile.findFirstOrThrow({
      where: { type: 'DRIVER', isCustom: false },
    });

    const sorter = await prisma.user.upsert({
      where: { email: 'sorter-rsa-test@ecocoop.local' },
      create: {
        email: 'sorter-rsa-test@ecocoop.local',
        passwordHash: hash,
        profileId: sorterProfile.id,
      },
      update: {},
    });
    sorterUserId = sorter.id;
    sorterToken = await login('sorter-rsa-test@ecocoop.local', 'pwd123');

    const driver = await prisma.user.upsert({
      where: { email: 'driver-rsa-test@ecocoop.local' },
      create: {
        email: 'driver-rsa-test@ecocoop.local',
        passwordHash: hash,
        profileId: driverProfile.id,
      },
      update: {},
    });
    driverUserId = driver.id;
    driverToken = await login('driver-rsa-test@ecocoop.local', 'pwd123');

    const unit = await prisma.unitOfMeasure.findFirstOrThrow({ where: { isActive: true } });
    unitId = unit.id;

    const category = await prisma.materialCategory.findFirstOrThrow();
    const sub = await prisma.materialSubcategory.create({
      data: {
        name: `RSA-Sub-${Date.now()}`,
        categoryId: category.id,
        defaultUnitId: unitId,
        isActive: true,
      },
    });
    subcategoryId = sub.id;

    // Seed 100 kg de estoque pronto disponível para os testes
    await prisma.readyStockEvent.create({
      data: {
        type: 'TRIAGEM_OUTPUT',
        subcategoryId,
        unitId,
        quantity: 100,
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

    // ReadyStockEvent referencia ReadyStockAdjustment (adjustmentId FK) — deletar primeiro
    await prisma.readyStockEvent.deleteMany({ where: { subcategoryId } });
    await prisma.readyStockAdjustment.deleteMany({ where: { subcategoryId } });
    await prisma.materialSubcategory.deleteMany({ where: { id: subcategoryId } });
    await prisma.user.deleteMany({ where: { email: { in: testUserEmails } } });

    await app.close();
  });

  // ─── Validações 422 ──────────────────────────────────────────────────────────

  it('POST — sem justificativa → 422 JUSTIFICATION_REQUIRED', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/ready-stock-adjustments')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ subcategoryId, unitId, quantity: 10 });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('JUSTIFICATION_REQUIRED');
  });

  it('POST — justificativa vazia → 422 JUSTIFICATION_REQUIRED', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/ready-stock-adjustments')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ subcategoryId, unitId, quantity: 10, justification: '   ' });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('JUSTIFICATION_REQUIRED');
  });

  it('POST — quantity=0 → 422 QUANTITY_CANNOT_BE_ZERO', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/ready-stock-adjustments')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ subcategoryId, unitId, quantity: 0, justification: 'Teste' });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('QUANTITY_CANNOT_BE_ZERO');
  });

  // ─── Conflito de saldo ───────────────────────────────────────────────────────

  it('POST — ajuste negativo causaria saldo negativo → 409 ADJUSTMENT_WOULD_CAUSE_NEGATIVE_BALANCE', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/ready-stock-adjustments')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        subcategoryId,
        unitId,
        quantity: -999,
        justification: 'Tentativa de zerar o saldo',
      });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('ADJUSTMENT_WOULD_CAUSE_NEGATIVE_BALANCE');
  });

  // ─── Ajuste positivo ─────────────────────────────────────────────────────────

  it('POST — ajuste positivo → 201, balance aumenta, ReadyStockEvent(AJUSTE) criado', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/ready-stock-adjustments')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        subcategoryId,
        unitId,
        quantity: 20,
        justification: 'Recontagem física — excedente identificado',
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.subcategory.id).toBe(subcategoryId);
    expect(res.body.unit.id).toBe(unitId);
    expect(parseFloat(res.body.quantity)).toBeCloseTo(20, 3);
    expect(res.body.justification).toBe('Recontagem física — excedente identificado');
    expect(res.body.user).toMatchObject({ id: expect.any(String), email: expect.any(String) });
    expect(res.body.createdAt).toBeDefined();
    expect(res.body.stockEventId).toBeDefined();

    // Confirma que o evento criado é do tipo AJUSTE com a quantidade correta
    const event = await prisma.readyStockEvent.findUnique({
      where: { id: res.body.stockEventId as string },
    });
    expect(event).toBeDefined();
    expect(event!.type).toBe('AJUSTE');
    expect(parseFloat(event!.quantity.toString())).toBeCloseTo(20, 3);
    expect(event!.subcategoryId).toBe(subcategoryId);
    expect(event!.adjustmentId).toBe(res.body.id as string);
  });

  it('POST — ajuste positivo atualiza saldo (saldo = 100 + 20 = 120)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/ready-stock')
      .set('Authorization', `Bearer ${managerToken}`)
      .query({ subcategoryId });

    expect(res.status).toBe(200);
    const item = res.body.data.find(
      (d: { subcategory: { id: string } }) => d.subcategory.id === subcategoryId,
    );
    expect(item).toBeDefined();
    // 100 seed + 20 ajuste positivo = 120
    expect(parseFloat(item.balance)).toBeCloseTo(120, 3);
  });

  // ─── Ajuste negativo ─────────────────────────────────────────────────────────

  it('POST — ajuste negativo válido → 201, balance reduzido', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/ready-stock-adjustments')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        subcategoryId,
        unitId,
        quantity: -15,
        justification: 'Material danificado durante armazenamento',
      });

    expect(res.status).toBe(201);
    expect(parseFloat(res.body.quantity)).toBeCloseTo(-15, 3);
    expect(res.body.stockEventId).toBeDefined();

    // Confirma evento AJUSTE com quantidade negativa
    const event = await prisma.readyStockEvent.findUnique({
      where: { id: res.body.stockEventId as string },
    });
    expect(event).toBeDefined();
    expect(event!.type).toBe('AJUSTE');
    expect(parseFloat(event!.quantity.toString())).toBeCloseTo(-15, 3);
  });

  it('POST — ajuste negativo atualiza saldo (120 − 15 = 105)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/ready-stock')
      .set('Authorization', `Bearer ${managerToken}`)
      .query({ subcategoryId });

    expect(res.status).toBe(200);
    const item = res.body.data.find(
      (d: { subcategory: { id: string } }) => d.subcategory.id === subcategoryId,
    );
    expect(item).toBeDefined();
    expect(parseFloat(item.balance)).toBeCloseTo(105, 3);
  });

  // ─── RBAC ────────────────────────────────────────────────────────────────────

  it('POST — SORTER sem permissão CREATE_ADJUSTMENT → 403', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/ready-stock-adjustments')
      .set('Authorization', `Bearer ${sorterToken}`)
      .send({
        subcategoryId,
        unitId,
        quantity: 5,
        justification: 'Teste de permissão',
      });

    expect(res.status).toBe(403);
  });

  it('POST — DRIVER sem permissão → 403', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/ready-stock-adjustments')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        subcategoryId,
        unitId,
        quantity: 5,
        justification: 'Teste de permissão',
      });

    expect(res.status).toBe(403);
  });

  it('POST — não autenticado → 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/ready-stock-adjustments')
      .send({ subcategoryId, unitId, quantity: 5, justification: 'Teste' });

    expect(res.status).toBe(401);
  });

  // ─── GET /ready-stock-adjustments ────────────────────────────────────────────

  it('GET — retorna lista paginada com ajustes criados', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/ready-stock-adjustments')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ subcategoryId });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    expect(typeof res.body.total).toBe('number');
    expect(typeof res.body.page).toBe('number');
    expect(typeof res.body.limit).toBe('number');
  });

  it('GET — estrutura obrigatória de cada item', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/ready-stock-adjustments')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ subcategoryId });

    expect(res.status).toBe(200);
    const item = res.body.data[0] as {
      id: string;
      subcategory: { id: string; name: string };
      unit: { id: string; symbol: string };
      quantity: string;
      justification: string;
      user: { id: string; email: string };
      createdAt: string;
    };
    expect(item.id).toBeDefined();
    expect(item.subcategory).toMatchObject({ id: expect.any(String), name: expect.any(String) });
    expect(item.unit).toMatchObject({ id: expect.any(String), symbol: expect.any(String) });
    expect(item.quantity).toMatch(/^-?\d+\.\d{3}$/);
    expect(item.justification).toBeDefined();
    expect(item.user).toMatchObject({ id: expect.any(String), email: expect.any(String) });
    expect(item.createdAt).toBeDefined();
  });

  it('GET — SORTER com permissão READY_STOCK:READ → 200', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/ready-stock-adjustments')
      .set('Authorization', `Bearer ${sorterToken}`);

    expect(res.status).toBe(200);
  });

  it('GET — DRIVER sem permissão → 403', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/ready-stock-adjustments')
      .set('Authorization', `Bearer ${driverToken}`);

    expect(res.status).toBe(403);
  });

  it('GET — não autenticado → 401', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/ready-stock-adjustments');
    expect(res.status).toBe(401);
  });
});
