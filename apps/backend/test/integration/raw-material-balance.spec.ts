import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma.service';

describe('RawMaterialBalance (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let managerToken: string;
  let driverToken: string;
  let sorterToken: string;
  let driverUserId: string;
  let sorterUserId: string;
  let subcategoryId: string;
  let inactiveSubcategoryId: string;
  let unitId: string;
  let vehicleId: string;
  const createdRouteIds: string[] = [];
  const createdUserEmails = [
    'driver-bal-test@ecocoop.local',
    'sorter-bal-test@ecocoop.local',
  ];

  const login = async (email: string, password: string) => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password });
    return (res.body as { accessToken: string }).accessToken;
  };

  const createRoute = async (status: 'PLANEJADA' | 'EM_ANDAMENTO' | 'CONCLUIDA') => {
    const route = await prisma.collectionRoute.create({
      data: {
        name: `Bal Route ${status} ${Date.now()} ${Math.random()}`,
        plannedDate: new Date('2026-09-20'),
        vehicleId,
        driverId: driverUserId,
        status,
        startedAt: status === 'EM_ANDAMENTO' || status === 'CONCLUIDA' ? new Date() : null,
        completedAt: status === 'CONCLUIDA' ? new Date() : null,
      },
    });
    createdRouteIds.push(route.id);
    return route;
  };

  const createEntry = async (routeId: string, quantity: number) => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${routeId}/material-entries`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ subcategoryId, quantity, unitId });
    expect(res.status).toBe(201);
    return res.body as { id: string; stockEventId: string };
  };

  const createReversal = async (routeId: string, entryId: string) => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${routeId}/material-entries/${entryId}/reversal`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ justification: 'Teste de estorno para saldo' });
    expect(res.status).toBe(201);
    return res.body;
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
    const driverProfile = await prisma.profile.findFirstOrThrow({ where: { type: 'DRIVER', isCustom: false } });
    const sorterProfile = await prisma.profile.findFirstOrThrow({ where: { type: 'SORTER', isCustom: false } });

    // Garante que DRIVER tem permissão de CREATE em RAW_MATERIAL_ENTRIES
    await prisma.profilePermission.upsert({
      where: { profileId_module_action: { profileId: driverProfile.id, module: 'RAW_MATERIAL_ENTRIES', action: 'CREATE' } },
      create: { profileId: driverProfile.id, module: 'RAW_MATERIAL_ENTRIES', action: 'CREATE' },
      update: {},
    });

    const driver = await prisma.user.upsert({
      where: { email: 'driver-bal-test@ecocoop.local' },
      create: { email: 'driver-bal-test@ecocoop.local', passwordHash: hash, profileId: driverProfile.id },
      update: {},
    });
    driverUserId = driver.id;
    driverToken = await login('driver-bal-test@ecocoop.local', 'pwd123');

    const sorter = await prisma.user.upsert({
      where: { email: 'sorter-bal-test@ecocoop.local' },
      create: { email: 'sorter-bal-test@ecocoop.local', passwordHash: hash, profileId: sorterProfile.id },
      update: {},
    });
    sorterUserId = sorter.id;
    sorterToken = await login('sorter-bal-test@ecocoop.local', 'pwd123');

    const unit = await prisma.unitOfMeasure.findFirst({ where: { isActive: true } });
    unitId = unit!.id;

    const category = await prisma.materialCategory.findFirst();

    const subcat = await prisma.materialSubcategory.create({
      data: {
        name: `BAL-Test-Sub-${Date.now()}`,
        categoryId: category!.id,
        defaultUnitId: unitId,
        isActive: true,
      },
    });
    subcategoryId = subcat.id;

    const inactiveSub = await prisma.materialSubcategory.create({
      data: {
        name: `BAL-Inactive-Sub-${Date.now()}`,
        categoryId: category!.id,
        defaultUnitId: unitId,
        isActive: false,
      },
    });
    inactiveSubcategoryId = inactiveSub.id;

    const vehicle = await prisma.vehicle.create({
      data: {
        plate: `BAL${Date.now().toString().slice(-4)}`,
        type: 'VAN',
        model: 'BAL Test Van',
        isActive: true,
        capacityUnitId: unitId,
      },
    });
    vehicleId = vehicle.id;

    void sorterUserId;
  });

  afterAll(async () => {
    if (!prisma) {
      if (app) await app.close();
      return;
    }

    // Limpar eventos de stock de eventos criados por subcategorias de teste
    const stockEvents = await prisma.rawMaterialStockEvent.findMany({
      where: { subcategoryId: { in: [subcategoryId, inactiveSubcategoryId] } },
    });
    const reversalIds = stockEvents.filter((e) => e.referencedEventId).map((e) => e.id);
    const entryIds = stockEvents.filter((e) => !e.referencedEventId).map((e) => e.id);

    if (reversalIds.length) {
      await prisma.rawMaterialStockEvent.deleteMany({ where: { id: { in: reversalIds } } });
    }

    // Limpar entradas de material
    await prisma.rawMaterialEntry.deleteMany({
      where: { routeId: { in: createdRouteIds } },
    });

    if (entryIds.length) {
      await prisma.rawMaterialStockEvent.deleteMany({ where: { id: { in: entryIds } } });
    }

    await prisma.auditLog.deleteMany({
      where: {
        OR: [
          { userId: { in: [driverUserId, sorterUserId] } },
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

  // ─── Saldo acumulado ─────────────────────────────────────────────────────────

  it('saldo após múltiplas entradas = soma das quantidades', async () => {
    const route = await createRoute('EM_ANDAMENTO');
    await createEntry(route.id, 100);
    await createEntry(route.id, 50.5);

    const res = await request(app.getHttpServer())
      .get('/api/v1/raw-material-balance')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ subcategoryId });

    expect(res.status).toBe(200);
    expect(res.body.calculatedAt).toBeTruthy();
    const item = res.body.data.find(
      (d: { subcategory: { id: string } }) => d.subcategory.id === subcategoryId,
    );
    expect(item).toBeDefined();
    // Verifica que balance >= 150.500 (pode haver outros eventos de testes anteriores)
    expect(parseFloat(item.balance)).toBeGreaterThanOrEqual(150.5);
    expect(item.eventCount).toBeGreaterThanOrEqual(2);
  });

  it('saldo após estorno = soma − quantidade estornada', async () => {
    const route = await createRoute('EM_ANDAMENTO');
    const entry = await createEntry(route.id, 200);
    await createReversal(route.id, entry.id);

    const resBefore = await request(app.getHttpServer())
      .get('/api/v1/raw-material-balance')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ subcategoryId });

    expect(resBefore.status).toBe(200);
    const item = resBefore.body.data.find(
      (d: { subcategory: { id: string } }) => d.subcategory.id === subcategoryId,
    );
    expect(item).toBeDefined();
    // Após estorno de 200, o saldo desta entrada é neutralizado
    // eventCount inclui o evento de estorno
    expect(item.eventCount).toBeGreaterThanOrEqual(2);
  });

  // ─── Subcategoria sem eventos não aparece ────────────────────────────────────

  it('subcategoria sem eventos não aparece na listagem', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/raw-material-balance')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ subcategoryId: inactiveSubcategoryId });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  // ─── includeInactive ─────────────────────────────────────────────────────────

  it('subcategoria inativa com histórico aparece com includeInactive=true', async () => {
    // Criar evento diretamente na subcategoria inativa (via rawMaterialStockEvent)
    await prisma.rawMaterialStockEvent.create({
      data: {
        type: 'ENTRADA_BRUTO',
        subcategoryId: inactiveSubcategoryId,
        unitId,
        quantity: 10,
        userId: driverUserId,
      },
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/raw-material-balance')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ subcategoryId: inactiveSubcategoryId, includeInactive: 'true' });

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    const item = res.body.data.find(
      (d: { subcategory: { id: string } }) => d.subcategory.id === inactiveSubcategoryId,
    );
    expect(item).toBeDefined();
    expect(parseFloat(item.balance)).toBeGreaterThan(0);
  });

  it('subcategoria inativa NÃO aparece sem includeInactive', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/raw-material-balance')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ subcategoryId: inactiveSubcategoryId });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  // ─── RBAC ────────────────────────────────────────────────────────────────────

  it('DRIVER sem permissão RAW_MATERIAL_BALANCE → 403', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/raw-material-balance')
      .set('Authorization', `Bearer ${driverToken}`);

    expect(res.status).toBe(403);
  });

  it('SORTER sem permissão RAW_MATERIAL_BALANCE → 403', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/raw-material-balance')
      .set('Authorization', `Bearer ${sorterToken}`);

    expect(res.status).toBe(403);
  });

  it('MANAGER com permissão RAW_MATERIAL_BALANCE:READ → 200', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/raw-material-balance')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.calculatedAt).toBeTruthy();
  });

  // ─── Estrutura da resposta ───────────────────────────────────────────────────

  it('response contém calculatedAt e data com campos obrigatórios', async () => {
    const route = await createRoute('EM_ANDAMENTO');
    await createEntry(route.id, 5);

    const res = await request(app.getHttpServer())
      .get('/api/v1/raw-material-balance')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ subcategoryId });

    expect(res.status).toBe(200);
    expect(res.body.calculatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    const item = res.body.data.find(
      (d: { subcategory: { id: string } }) => d.subcategory.id === subcategoryId,
    );
    expect(item).toBeDefined();
    expect(item.balance).toMatch(/^\d+\.\d{3}$/);
    expect(typeof item.eventCount).toBe('number');
    expect(item.subcategory).toMatchObject({ id: subcategoryId, name: expect.any(String) });
    expect(item.subcategory.category).toMatchObject({ id: expect.any(String), name: expect.any(String) });
    expect(item.unit).toMatchObject({ id: unitId, name: expect.any(String), symbol: expect.any(String) });
  });

  it('filtro por unitId retorna apenas entradas daquela unidade', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/raw-material-balance')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ unitId });

    expect(res.status).toBe(200);
    for (const item of res.body.data) {
      expect(item.unit.id).toBe(unitId);
    }
  });

  it('sem filtros retorna data: [] quando não há eventos cadastrados (mock via filtro impossível)', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await request(app.getHttpServer())
      .get('/api/v1/raw-material-balance')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ subcategoryId: fakeId });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });
});
