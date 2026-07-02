import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma.service';

describe('SortingOperations (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let sorterToken: string;
  let driverToken: string;
  let sorterUserId: string;
  let driverUserId: string;
  let rawSubcategoryId: string;
  let readySubcategoryId: string;
  let unitId: string;
  const createdSortingOpIds: string[] = [];
  const testUserEmails = [
    'sorter-sorting-test@ecocoop.local',
    'driver-sorting-test@ecocoop.local',
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
      where: { email: 'sorter-sorting-test@ecocoop.local' },
      create: {
        email: 'sorter-sorting-test@ecocoop.local',
        passwordHash: hash,
        profileId: sorterProfile.id,
      },
      update: {},
    });
    sorterUserId = sorter.id;
    sorterToken = await login('sorter-sorting-test@ecocoop.local', 'pwd123');

    const driver = await prisma.user.upsert({
      where: { email: 'driver-sorting-test@ecocoop.local' },
      create: {
        email: 'driver-sorting-test@ecocoop.local',
        passwordHash: hash,
        profileId: driverProfile.id,
      },
      update: {},
    });
    driverUserId = driver.id;
    driverToken = await login('driver-sorting-test@ecocoop.local', 'pwd123');

    const unit = await prisma.unitOfMeasure.findFirstOrThrow({ where: { isActive: true } });
    unitId = unit.id;

    const category = await prisma.materialCategory.findFirstOrThrow();

    const rawSub = await prisma.materialSubcategory.create({
      data: {
        name: `SORT-RAW-${Date.now()}`,
        categoryId: category.id,
        defaultUnitId: unitId,
        isActive: true,
      },
    });
    rawSubcategoryId = rawSub.id;

    const readySub = await prisma.materialSubcategory.create({
      data: {
        name: `SORT-READY-${Date.now()}`,
        categoryId: category.id,
        defaultUnitId: unitId,
        isActive: true,
      },
    });
    readySubcategoryId = readySub.id;

    // Seed 200 kg of raw material balance
    await prisma.rawMaterialStockEvent.create({
      data: {
        type: 'ENTRADA_BRUTO',
        subcategoryId: rawSubcategoryId,
        unitId,
        quantity: 200,
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

    // ReadyStockEvent.subcategoryId → RESTRICT, must delete before subcategory
    await prisma.readyStockEvent.deleteMany({
      where: { subcategoryId: readySubcategoryId },
    });

    // SortingOperation delete cascades to SortingOutput + SortingReject
    // RawMaterialStockEvent.sortingOperationId becomes null (ON DELETE SET NULL)
    await prisma.sortingOperation.deleteMany({
      where: { subcategoryId: rawSubcategoryId },
    });

    // Delete all raw stock events for this subcategory (seed + SAIDA_TRIAGEM with null FK now)
    await prisma.rawMaterialStockEvent.deleteMany({
      where: { subcategoryId: rawSubcategoryId },
    });

    await prisma.auditLog.deleteMany({
      where: { userId: { in: [sorterUserId, driverUserId] } },
    });

    await prisma.user.deleteMany({ where: { email: { in: testUserEmails } } });

    await prisma.materialSubcategory.deleteMany({
      where: { id: { in: [rawSubcategoryId, readySubcategoryId] } },
    });

    await app.close();
  });

  // ─── POST ────────────────────────────────────────────────────────────────────

  it('POST — cenário principal: 90 kg processados, 80 kg output, 5 kg rejeito → PERDA_INERENTE 5 kg auto-criada (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/sorting-operations')
      .set('Authorization', `Bearer ${sorterToken}`)
      .send({
        subcategoryId: rawSubcategoryId,
        unitId,
        processedQuantity: 90,
        outputs: [{ subcategoryId: readySubcategoryId, unitId, quantity: 80 }],
        rejects: [{ type: 'REJEITO', unitId, quantity: 5, description: 'PET contaminado' }],
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('CONCLUIDA');
    expect(res.body.subcategory.id).toBe(rawSubcategoryId);
    expect(parseFloat(res.body.processedQuantity)).toBeCloseTo(90, 3);
    expect(res.body.outputs).toHaveLength(1);
    expect(parseFloat(res.body.outputs[0].quantity)).toBeCloseTo(80, 3);

    // 1 manual reject + 1 PERDA_INERENTE auto-created
    expect(res.body.rejects).toHaveLength(2);
    const pei = res.body.rejects.find((r: { type: string }) => r.type === 'PERDA_INERENTE');
    expect(pei).toBeDefined();
    expect(parseFloat(pei.quantity)).toBeCloseTo(5, 3);
    expect(pei.description).toBe('Perda inerente ao processo');
    expect(pei.subcategory).toBeNull();

    expect(res.body.user.id).toBeDefined();
    expect(res.body.id).toBeDefined();
    createdSortingOpIds.push(res.body.id as string);
  });

  it('POST — saldo bruto decrementado em 90 kg (200 − 90 = 110)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/raw-material-balance')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ subcategoryId: rawSubcategoryId });

    expect(res.status).toBe(200);
    const item = res.body.data.find(
      (d: { subcategory: { id: string } }) => d.subcategory.id === rawSubcategoryId,
    );
    expect(item).toBeDefined();
    expect(parseFloat(item.balance)).toBeCloseTo(110, 3);
  });

  it('POST — saldo pronto creditado em 80 kg via ReadyStockEvent', async () => {
    const events = await prisma.readyStockEvent.findMany({
      where: { subcategoryId: readySubcategoryId },
    });
    const totalReady = events.reduce((acc, e) => acc + parseFloat(e.quantity.toString()), 0);
    expect(totalReady).toBeCloseTo(80, 3);
  });

  it('POST — saldo bruto insuficiente → 409 INSUFFICIENT_RAW_STOCK', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/sorting-operations')
      .set('Authorization', `Bearer ${sorterToken}`)
      .send({
        subcategoryId: rawSubcategoryId,
        unitId,
        processedQuantity: 9999,
        outputs: [{ subcategoryId: readySubcategoryId, unitId, quantity: 9999 }],
      });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('INSUFFICIENT_RAW_STOCK');
  });

  it('POST — soma outputs+rejects excede processedQuantity → 422 OUTPUTS_SUM_EXCEEDS_PROCESSED', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/sorting-operations')
      .set('Authorization', `Bearer ${sorterToken}`)
      .send({
        subcategoryId: rawSubcategoryId,
        unitId,
        processedQuantity: 10,
        outputs: [{ subcategoryId: readySubcategoryId, unitId, quantity: 8 }],
        rejects: [{ type: 'REJEITO', unitId, quantity: 5, description: 'Excede' }],
      });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('OUTPUTS_SUM_EXCEEDS_PROCESSED');
  });

  it('POST — soma exatamente igual a processedQuantity → sem PERDA_INERENTE', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/sorting-operations')
      .set('Authorization', `Bearer ${sorterToken}`)
      .send({
        subcategoryId: rawSubcategoryId,
        unitId,
        processedQuantity: 10,
        outputs: [{ subcategoryId: readySubcategoryId, unitId, quantity: 10 }],
        rejects: [],
      });

    expect(res.status).toBe(201);
    const hasPerda = res.body.rejects.some((r: { type: string }) => r.type === 'PERDA_INERENTE');
    expect(hasPerda).toBe(false);
    expect(res.body.rejects).toHaveLength(0);
    createdSortingOpIds.push(res.body.id as string);
  });

  it('POST — rejects omitidos (campo opcional) → aceita e auto-cria PERDA_INERENTE', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/sorting-operations')
      .set('Authorization', `Bearer ${sorterToken}`)
      .send({
        subcategoryId: rawSubcategoryId,
        unitId,
        processedQuantity: 5,
        outputs: [{ subcategoryId: readySubcategoryId, unitId, quantity: 3 }],
        // rejects omitted intentionally
      });

    expect(res.status).toBe(201);
    const pei = res.body.rejects.find((r: { type: string }) => r.type === 'PERDA_INERENTE');
    expect(pei).toBeDefined();
    expect(parseFloat(pei.quantity)).toBeCloseTo(2, 3);
    createdSortingOpIds.push(res.body.id as string);
  });

  it('POST — outputs vazio (ArrayMinSize(1)) → 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/sorting-operations')
      .set('Authorization', `Bearer ${sorterToken}`)
      .send({
        subcategoryId: rawSubcategoryId,
        unitId,
        processedQuantity: 10,
        outputs: [],
      });

    expect(res.status).toBe(400);
  });

  it('POST — não autenticado → 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/sorting-operations')
      .send({
        subcategoryId: rawSubcategoryId,
        unitId,
        processedQuantity: 10,
        outputs: [{ subcategoryId: readySubcategoryId, unitId, quantity: 10 }],
      });

    expect(res.status).toBe(401);
  });

  it('POST — DRIVER sem permissão SORTING:CREATE → 403', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/sorting-operations')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        subcategoryId: rawSubcategoryId,
        unitId,
        processedQuantity: 10,
        outputs: [{ subcategoryId: readySubcategoryId, unitId, quantity: 10 }],
      });

    expect(res.status).toBe(403);
  });

  // ─── GET list ────────────────────────────────────────────────────────────────

  it('GET /sorting-operations — retorna envelope paginado (data/total/page/limit)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/sorting-operations')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(typeof res.body.total).toBe('number');
    expect(typeof res.body.page).toBe('number');
    expect(typeof res.body.limit).toBe('number');
  });

  it('GET /sorting-operations?subcategoryId — filtra apenas triagens da subcategoria', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/sorting-operations')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ subcategoryId: rawSubcategoryId });

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const op of res.body.data) {
      expect((op as { subcategory: { id: string } }).subcategory.id).toBe(rawSubcategoryId);
    }
    // Items returned have compact list shape (outputsCount, rejectsCount — not full arrays)
    const first = res.body.data[0] as { outputsCount: number; rejectsCount: number };
    expect(typeof first.outputsCount).toBe('number');
    expect(typeof first.rejectsCount).toBe('number');
  });

  it('GET /sorting-operations — DRIVER sem permissão → 403', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/sorting-operations')
      .set('Authorization', `Bearer ${driverToken}`);

    expect(res.status).toBe(403);
  });

  // ─── GET :id ─────────────────────────────────────────────────────────────────

  it('GET /sorting-operations/:id — retorna detalhes completos com outputs e rejects', async () => {
    const opId = createdSortingOpIds[0];
    const res = await request(app.getHttpServer())
      .get(`/api/v1/sorting-operations/${opId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(opId);
    expect(Array.isArray(res.body.outputs)).toBe(true);
    expect(Array.isArray(res.body.rejects)).toBe(true);
    expect(res.body.user).toBeDefined();
    expect(res.body.subcategory.id).toBe(rawSubcategoryId);
  });

  it('GET /sorting-operations/:id — id inexistente → 404 SORTING_OPERATION_NOT_FOUND', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/sorting-operations/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('SORTING_OPERATION_NOT_FOUND');
  });
});
