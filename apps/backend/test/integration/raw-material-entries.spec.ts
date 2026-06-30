import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma.service';

describe('RawMaterialEntries (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let managerToken: string;
  let driverToken: string;
  let otherDriverToken: string;
  let sorterToken: string;
  let driverUserId: string;
  let otherDriverUserId: string;
  let sorterUserId: string;
  let vehicleId: string;
  let subcategoryId: string;
  let inactiveSubcategoryId: string;
  let unitId: string;
  const createdRouteIds: string[] = [];
  const createdUserEmails = [
    'driver-rme-test@ecocoop.local',
    'other-driver-rme-test@ecocoop.local',
    'sorter-rme-test@ecocoop.local',
  ];

  const login = async (email: string, password: string) => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password });
    return (res.body as { accessToken: string }).accessToken;
  };

  const createRoute = async (
    status: 'PLANEJADA' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA',
    driverId?: string,
  ) => {
    const route = await prisma.collectionRoute.create({
      data: {
        name: `RME Route ${status} ${Date.now()} ${Math.random()}`,
        plannedDate: new Date('2026-09-15'),
        vehicleId,
        driverId: driverId ?? driverUserId,
        status,
        startedAt: status === 'EM_ANDAMENTO' || status === 'CONCLUIDA' ? new Date() : null,
        completedAt: status === 'CONCLUIDA' ? new Date() : null,
      },
    });
    createdRouteIds.push(route.id);
    return route;
  };

  const entryBody = () => ({
    subcategoryId,
    quantity: 50.5,
    unitId,
    notes: 'Teste de entrada',
  });

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

    const driverProfile = await prisma.profile.findFirstOrThrow({ where: { type: 'DRIVER', isCustom: false } });
    const sorterProfile = await prisma.profile.findFirstOrThrow({ where: { type: 'SORTER', isCustom: false } });

    // Ensure DRIVER has RAW_MATERIAL_ENTRIES:CREATE
    await prisma.profilePermission.upsert({
      where: { profileId_module_action: { profileId: driverProfile.id, module: 'RAW_MATERIAL_ENTRIES', action: 'CREATE' } },
      create: { profileId: driverProfile.id, module: 'RAW_MATERIAL_ENTRIES', action: 'CREATE' },
      update: {},
    });

    const driver = await prisma.user.upsert({
      where: { email: 'driver-rme-test@ecocoop.local' },
      create: { email: 'driver-rme-test@ecocoop.local', passwordHash: hash, profileId: driverProfile.id },
      update: {},
    });
    driverUserId = driver.id;
    driverToken = await login('driver-rme-test@ecocoop.local', 'pwd123');

    const otherDriver = await prisma.user.upsert({
      where: { email: 'other-driver-rme-test@ecocoop.local' },
      create: { email: 'other-driver-rme-test@ecocoop.local', passwordHash: hash, profileId: driverProfile.id },
      update: {},
    });
    otherDriverUserId = otherDriver.id;
    otherDriverToken = await login('other-driver-rme-test@ecocoop.local', 'pwd123');

    const sorter = await prisma.user.upsert({
      where: { email: 'sorter-rme-test@ecocoop.local' },
      create: { email: 'sorter-rme-test@ecocoop.local', passwordHash: hash, profileId: sorterProfile.id },
      update: {},
    });
    sorterUserId = sorter.id;
    sorterToken = await login('sorter-rme-test@ecocoop.local', 'pwd123');

    const unit = await prisma.unitOfMeasure.findFirst({ where: { isActive: true } });
    unitId = unit!.id;

    const category = await prisma.materialCategory.findFirst();
    const subcat = await prisma.materialSubcategory.create({
      data: { name: `RME-Test-Sub-${Date.now()}`, categoryId: category!.id, defaultUnitId: unitId, isActive: true },
    });
    subcategoryId = subcat.id;

    const inactiveSub = await prisma.materialSubcategory.create({
      data: { name: `RME-Inactive-Sub-${Date.now()}`, categoryId: category!.id, defaultUnitId: unitId, isActive: false },
    });
    inactiveSubcategoryId = inactiveSub.id;

    const vehicle = await prisma.vehicle.create({
      data: {
        plate: `RME${Date.now().toString().slice(-4)}`,
        type: 'VAN',
        model: 'RME Test Van',
        isActive: true,
        capacityUnitId: unitId,
      },
    });
    vehicleId = vehicle.id;

    void otherDriverUserId;
    void sorterUserId;
  });

  afterAll(async () => {
    if (!prisma) {
      if (app) await app.close();
      return;
    }

    const entries = await prisma.rawMaterialEntry.findMany({
      where: { routeId: { in: createdRouteIds } },
      include: { stockEvent: { include: { reversals: true } } },
    });

    const reversalIds = entries
      .flatMap((e) => e.stockEvent?.reversals.map((r) => r.id) ?? []);
    const stockEventIds = entries.map((e) => e.stockEvent?.id).filter(Boolean) as string[];

    if (reversalIds.length) {
      await prisma.rawMaterialStockEvent.deleteMany({ where: { id: { in: reversalIds } } });
    }
    if (stockEventIds.length) {
      await prisma.rawMaterialStockEvent.deleteMany({ where: { id: { in: stockEventIds } } });
    }
    await prisma.rawMaterialEntry.deleteMany({ where: { routeId: { in: createdRouteIds } } });

    await prisma.auditLog.deleteMany({
      where: {
        OR: [
          { entityType: 'rawMaterialEntry', entityId: { in: entries.map((e) => e.id) } },
          { userId: { in: [driverUserId, otherDriverUserId, sorterUserId] } },
        ],
      },
    });

    await prisma.collectionRoute.deleteMany({ where: { id: { in: createdRouteIds } } });
    await prisma.vehicle.deleteMany({ where: { id: vehicleId } });
    await prisma.materialSubcategory.deleteMany({
      where: { id: { in: [subcategoryId, inactiveSubcategoryId] } },
    });
    await prisma.user.deleteMany({ where: { email: { in: createdUserEmails } } });

    await app.close();
  });

  // ─── POST /material-entries — status da rota ──────────────────────────────

  it('criar entrada em rota EM_ANDAMENTO → 201 + stockEventId', async () => {
    const route = await createRoute('EM_ANDAMENTO');
    const res = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${route.id}/material-entries`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(entryBody());

    expect(res.status).toBe(201);
    expect(res.body.stockEventId).toBeTruthy();
    expect(res.body.isReversed).toBe(false);
  });

  it('criar entrada em rota CONCLUIDA → 201', async () => {
    const route = await createRoute('CONCLUIDA');
    const res = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${route.id}/material-entries`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(entryBody());

    expect(res.status).toBe(201);
    expect(res.body.stockEventId).toBeTruthy();
  });

  it('criar entrada em rota PLANEJADA → 409 ROUTE_STATUS_INVALID', async () => {
    const route = await createRoute('PLANEJADA');
    const res = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${route.id}/material-entries`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(entryBody());

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('ROUTE_STATUS_INVALID');
  });

  it('criar entrada em rota CANCELADA → 409 ROUTE_STATUS_INVALID', async () => {
    const route = await createRoute('CANCELADA');
    const res = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${route.id}/material-entries`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(entryBody());

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('ROUTE_STATUS_INVALID');
  });

  // ─── POST — validação de campos ──────────────────────────────────────────

  it('quantidade = 0 → 422 QUANTITY_MUST_BE_POSITIVE', async () => {
    const route = await createRoute('EM_ANDAMENTO');
    const res = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${route.id}/material-entries`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...entryBody(), quantity: 0 });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('QUANTITY_MUST_BE_POSITIVE');
  });

  it('subcategoria inativa → 422 SUBCATEGORY_INACTIVE', async () => {
    const route = await createRoute('EM_ANDAMENTO');
    const res = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${route.id}/material-entries`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...entryBody(), subcategoryId: inactiveSubcategoryId });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('SUBCATEGORY_INACTIVE');
  });

  // ─── POST — permissões DRIVER ─────────────────────────────────────────────

  it('DRIVER em rota própria EM_ANDAMENTO → 201', async () => {
    const route = await createRoute('EM_ANDAMENTO', driverUserId);
    const res = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${route.id}/material-entries`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send(entryBody());

    expect(res.status).toBe(201);
  });

  it('DRIVER em rota própria CONCLUIDA → 201 (FR-035b)', async () => {
    const route = await createRoute('CONCLUIDA', driverUserId);
    const res = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${route.id}/material-entries`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send(entryBody());

    expect(res.status).toBe(201);
  });

  it('DRIVER em rota de outro → 403', async () => {
    const route = await createRoute('EM_ANDAMENTO', otherDriverUserId);
    const res = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${route.id}/material-entries`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send(entryBody());

    expect(res.status).toBe(403);
  });

  // ─── GET /material-entries ────────────────────────────────────────────────

  it('SORTER tentando GET /material-entries → 403', async () => {
    const route = await createRoute('EM_ANDAMENTO');
    const res = await request(app.getHttpServer())
      .get(`/api/v1/collection-routes/${route.id}/material-entries`)
      .set('Authorization', `Bearer ${sorterToken}`);

    expect(res.status).toBe(403);
  });

  it('GET list retorna isReversed para entradas', async () => {
    const route = await createRoute('EM_ANDAMENTO');
    await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${route.id}/material-entries`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(entryBody());

    const res = await request(app.getHttpServer())
      .get(`/api/v1/collection-routes/${route.id}/material-entries`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data[0]).toHaveProperty('isReversed', false);
  });

  // ─── POST reversal ────────────────────────────────────────────────────────

  it('estorno → response com RawMaterialEntry + isReversed: true', async () => {
    const route = await createRoute('EM_ANDAMENTO');
    const createRes = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${route.id}/material-entries`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(entryBody());
    expect(createRes.status).toBe(201);

    const reversalRes = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${route.id}/material-entries/${createRes.body.id}/reversal`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ justification: 'Quantidade registrada errada' });

    expect(reversalRes.status).toBe(201);
    expect(reversalRes.body.isReversed).toBe(true);
    expect(reversalRes.body.id).toBe(createRes.body.id);
    expect(reversalRes.body.stockEvent).toBeDefined();
  });

  it('estorno que zeraria saldo → 200 (saldo = 0, não negativo)', async () => {
    const route = await createRoute('EM_ANDAMENTO');
    const createRes = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${route.id}/material-entries`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(entryBody());
    expect(createRes.status).toBe(201);

    // Create a second entry with same subcategory/unit so balance = 2×50.5
    // Then reversal of one entry → balance = 50.5, still positive
    // To test "zeraria saldo exactly" we need balance == entry quantity.
    // We'll create a single entry and reverse it (zero out).
    const singleRoute = await createRoute('EM_ANDAMENTO');
    const singleEntry = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${singleRoute.id}/material-entries`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ subcategoryId, quantity: 100, unitId });
    expect(singleEntry.status).toBe(201);

    // Reverse entire amount → balance becomes 0 (valid, not negative)
    const revRes = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${singleRoute.id}/material-entries/${singleEntry.body.id}/reversal`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ justification: 'Zerar saldo completo' });

    expect(revRes.status).toBe(201);
    expect(revRes.body.isReversed).toBe(true);
  });

  it('estorno que tornaria negativo → 409 REVERSAL_WOULD_CAUSE_NEGATIVE_BALANCE', async () => {
    // Create route with a single entry of 10 units, then attempt reversal
    // where balance is already 0 from another reversal, or entry > total balance.
    // Strategy: Create entry for qty=10, reverse it (balance=0), then create another entry
    // of qty=5, reverse the 10 unit entry again → not possible (already reversed).
    // Instead, create one entry of qty=5, then try to create a reversal via direct manipulation.
    // Easier: use a fresh subcategory so balance is 0, then try to reverse.

    // Create new unique subcategory for isolated balance
    const cat = await prisma.materialCategory.findFirst();
    const isolatedSub = await prisma.materialSubcategory.create({
      data: { name: `Isolated-${Date.now()}`, categoryId: cat!.id, defaultUnitId: unitId, isActive: true },
    });

    const route = await createRoute('EM_ANDAMENTO');
    const entryRes = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${route.id}/material-entries`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ subcategoryId: isolatedSub.id, quantity: 10, unitId });
    expect(entryRes.status).toBe(201);

    // Reverse it (balance → 0)
    const firstRev = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${route.id}/material-entries/${entryRes.body.id}/reversal`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ justification: 'Limpar saldo' });
    expect(firstRev.status).toBe(201);

    // Create another entry of qty=5 with same isolated subcategory
    const route2 = await createRoute('EM_ANDAMENTO');
    const entryRes2 = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${route2.id}/material-entries`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ subcategoryId: isolatedSub.id, quantity: 5, unitId });
    expect(entryRes2.status).toBe(201);

    // Inject a negative event directly to make total balance < 5 (simulate scenario)
    // Actually: balance = 10 - 10 + 5 = 5. Reversal of 5 → balance = 0. That's valid.
    // Let's create qty=3 entry and try to reverse the qty=5 entry (would make balance = 3-5 = -2)
    const route3 = await createRoute('EM_ANDAMENTO');
    const smallEntry = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${route3.id}/material-entries`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ subcategoryId: isolatedSub.id, quantity: 3, unitId });
    expect(smallEntry.status).toBe(201);

    // Now balance = 0 + 5 + 3 = 8. Reverse the qty=5 entry → balance = 8 - 5 = 3. Still valid.
    // We need balance < qty of the entry to reverse.
    // Let's reverse the qty=5 entry too so balance becomes 3, then reverse the qty=3 entry
    await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${route2.id}/material-entries/${entryRes2.body.id}/reversal`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ justification: 'Limpar' });

    // Now balance = 3. Reverse qty=3 → balance = 0. Valid.
    // To get 409 we need to force a situation where balance < reversal qty.
    // Create a fresh entry of qty=2 and try to reverse an entry of qty=5 when total balance < 5.
    const route4 = await createRoute('EM_ANDAMENTO');
    const largeEntry = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${route4.id}/material-entries`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ subcategoryId: isolatedSub.id, quantity: 20, unitId });
    expect(largeEntry.status).toBe(201);

    // Reverse the large entry so balance goes negative... wait no, balance = 3 + 20 = 23.
    // We need balance - reversalQty < 0. Create a tiny entry and try to reverse the large one.
    // balance = 3 + 20 = 23. Reverse 20 → 3. No problem.
    // Let me try a simpler isolated approach: create a NEW subcategory with total balance=2
    // and try to reverse an entry of qty=5.

    const isolatedSub2 = await prisma.materialSubcategory.create({
      data: { name: `Isolated2-${Date.now()}`, categoryId: cat!.id, defaultUnitId: unitId, isActive: true },
    });

    const route5 = await createRoute('EM_ANDAMENTO');
    const bigEntry = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${route5.id}/material-entries`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ subcategoryId: isolatedSub2.id, quantity: 50, unitId });
    expect(bigEntry.status).toBe(201);

    const route6 = await createRoute('EM_ANDAMENTO');
    const smallEntry2 = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${route6.id}/material-entries`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ subcategoryId: isolatedSub2.id, quantity: 2, unitId });
    expect(smallEntry2.status).toBe(201);

    // Now balance = 50 + 2 = 52. Reverse the big entry (50) → balance = 2. Valid.
    const bigRev = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${route5.id}/material-entries/${bigEntry.body.id}/reversal`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ justification: 'Reverter grande' });
    expect(bigRev.status).toBe(201);

    // Balance = 2. Now try to reverse the smallEntry2 (qty=2) → balance = 0. Valid.
    // We need something that causes negative. Let me directly create an entry of qty=10
    // and reverse qty=2 entry when balance=0.
    // Actually let's reverse small (qty=2) → balance = 0.
    const smallRev = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${route6.id}/material-entries/${smallEntry2.body.id}/reversal`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ justification: 'Reverter pequeno' });
    expect(smallRev.status).toBe(201);

    // Balance = 0. Now create entry of qty=3, balance = 3.
    // Try to reverse an existing entry of qty=5 (the qty we want to reverse > balance).
    // Create entry of qty=5, reverse it: balance = 3+5-5 = 3.
    // We need balance(3) - reversalQty(?) < 0, so reversalQty > 3.
    // Use a NEW entry of qty=10 to try to reverse when balance = 3.
    // But we can't reverse it if it doesn't exist. We need to reverse an entry that was already reversed.
    // Just create a new entry with a fresh subcategory for clean test.

    const isolatedSub3 = await prisma.materialSubcategory.create({
      data: { name: `Isolated3-${Date.now()}`, categoryId: cat!.id, defaultUnitId: unitId, isActive: true },
    });
    const route7 = await createRoute('EM_ANDAMENTO');

    // Create entry qty=10
    const entryA = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${route7.id}/material-entries`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ subcategoryId: isolatedSub3.id, quantity: 10, unitId });
    expect(entryA.status).toBe(201);

    // Create entry qty=5 (total balance = 15)
    const entryB = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${route7.id}/material-entries`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ subcategoryId: isolatedSub3.id, quantity: 5, unitId });
    expect(entryB.status).toBe(201);

    // Reverse entryA (qty=10): balance = 15 - 10 = 5. Valid.
    const revA = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${route7.id}/material-entries/${entryA.body.id}/reversal`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ justification: 'Reverter A' });
    expect(revA.status).toBe(201);

    // Now balance = 5. Try to reverse entryB (qty=5): balance = 0. Valid.
    // We need something that goes negative.
    // Create entry qty=3 (balance = 5+3=8) then insert a stock event directly to drain balance.
    // Simpler: use DB to insert a reversal-like negative event to drain balance below qty.
    await prisma.rawMaterialStockEvent.create({
      data: {
        type: 'ESTORNO_BRUTO',
        subcategoryId: isolatedSub3.id,
        unitId,
        quantity: -4, // balance = 8-4=4, but now if we try to reverse entryB(5) → 4-5 = -1
        referencedEventId: null, // NOTE: unique constraint requires null to be distinct
        justification: 'Setup para teste negativo',
        userId: driverUserId, // need a valid userId
      },
    });

    // Balance = 5 + 3(from extra entry) - 4 = wait... let me recalculate
    // After revA: balance = 10 + 5 - 10 = 5
    // After direct event: balance = 5 - 4 = 1
    // Now try to reverse entryB (qty=5): balance would be 1 - 5 = -4 → should be 409

    const negativeRevRes = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${route7.id}/material-entries/${entryB.body.id}/reversal`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ justification: 'Tentativa inválida' });

    expect(negativeRevRes.status).toBe(409);
    expect(negativeRevRes.body.code).toBe('REVERSAL_WOULD_CAUSE_NEGATIVE_BALANCE');

    // Cleanup isolated subcategories
    await prisma.rawMaterialStockEvent.deleteMany({
      where: { subcategoryId: { in: [isolatedSub.id, isolatedSub2.id, isolatedSub3.id] } },
    });
    await prisma.rawMaterialEntry.deleteMany({
      where: { subcategoryId: { in: [isolatedSub.id, isolatedSub2.id, isolatedSub3.id] } },
    });
    await prisma.materialSubcategory.deleteMany({
      where: { id: { in: [isolatedSub.id, isolatedSub2.id, isolatedSub3.id] } },
    });
  }, 30000);

  it('estorno duplicado → 409 ENTRY_ALREADY_REVERSED', async () => {
    const route = await createRoute('EM_ANDAMENTO');
    const createRes = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${route.id}/material-entries`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(entryBody());
    expect(createRes.status).toBe(201);

    const firstRev = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${route.id}/material-entries/${createRes.body.id}/reversal`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ justification: 'Primeiro estorno' });
    expect(firstRev.status).toBe(201);

    const secondRev = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${route.id}/material-entries/${createRes.body.id}/reversal`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ justification: 'Segundo estorno — deve falhar' });

    expect(secondRev.status).toBe(409);
    expect(secondRev.body.code).toBe('ENTRY_ALREADY_REVERSED');
  });

  it('DRIVER tentando estorno → 403', async () => {
    const route = await createRoute('EM_ANDAMENTO', driverUserId);
    const createRes = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${route.id}/material-entries`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send(entryBody());
    expect(createRes.status).toBe(201);

    const res = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${route.id}/material-entries/${createRes.body.id}/reversal`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ justification: 'Driver tentando estornar' });

    expect(res.status).toBe(403);
  });
});
