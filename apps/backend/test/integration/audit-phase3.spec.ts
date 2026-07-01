import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { GEOCODING_PROVIDER } from '../../src/common/providers/geocoding/geocoding.provider';
import { PrismaService } from '../../src/common/prisma.service';

describe('Audit Phase 3 — CREATE operations (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let vehicleId: string;
  let driverUserId: string;
  let unitId: string;
  let subcategoryId: string;

  const createdPointIds: string[] = [];
  const createdRouteIds: string[] = [];

  const mockGeocodingProvider = {
    geocode: jest.fn().mockResolvedValue({ lat: -23.5505, lng: -46.6333 }),
  };

  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  const login = async (email: string, password: string) => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password });
    return (res.body as { accessToken: string }).accessToken;
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

    adminToken = await login('admin@ecocoop.local', 'admin123');

    const unit = await prisma.unitOfMeasure.findFirstOrThrow({ where: { isActive: true } });
    unitId = unit.id;

    const category = await prisma.materialCategory.findFirstOrThrow();
    const subcat = await prisma.materialSubcategory.create({
      data: {
        name: `Audit-P3-Sub-${Date.now()}`,
        categoryId: category.id,
        defaultUnitId: unitId,
        isActive: true,
      },
    });
    subcategoryId = subcat.id;

    const vehicle = await prisma.vehicle.create({
      data: {
        plate: `AUD${Date.now().toString().slice(-4)}`,
        type: 'VAN',
        model: 'Audit P3 Van',
        isActive: true,
        capacityUnitId: unitId,
      },
    });
    vehicleId = vehicle.id;

    const hash = await bcrypt.hash('audit123', 10);
    const driverProfile = await prisma.profile.findFirstOrThrow({
      where: { type: 'DRIVER', isCustom: false },
    });
    const driver = await prisma.user.upsert({
      where: { email: 'audit-p3-driver@ecocoop.local' },
      create: {
        email: 'audit-p3-driver@ecocoop.local',
        passwordHash: hash,
        profileId: driverProfile.id,
      },
      update: {},
    });
    driverUserId = driver.id;
  });

  afterAll(async () => {
    if (!prisma) {
      if (app) await app.close();
      return;
    }

    const entries = await prisma.rawMaterialEntry.findMany({
      where: { routeId: { in: createdRouteIds } },
      include: { stockEvent: true },
    });
    const stockEventIds = entries.map((e) => e.stockEvent?.id).filter(Boolean) as string[];

    if (stockEventIds.length) {
      await prisma.rawMaterialStockEvent.deleteMany({ where: { id: { in: stockEventIds } } });
    }
    if (entries.length) {
      await prisma.auditLog
        .deleteMany({ where: { entityType: 'rawMaterialEntry', entityId: { in: entries.map((e) => e.id) } } })
        .catch(() => null);
      await prisma.rawMaterialEntry.deleteMany({ where: { routeId: { in: createdRouteIds } } });
    }

    await prisma.auditLog
      .deleteMany({
        where: {
          OR: [
            { entityType: 'collectionPoint', entityId: { in: createdPointIds } },
            { entityType: 'collectionRoute', entityId: { in: createdRouteIds } },
          ],
        },
      })
      .catch(() => null);

    await prisma.collectionRoute.deleteMany({ where: { id: { in: createdRouteIds } } });
    await prisma.collectionPoint.deleteMany({ where: { id: { in: createdPointIds } } });
    await prisma.materialSubcategory.deleteMany({ where: { id: subcategoryId } }).catch(() => null);
    await prisma.vehicle.deleteMany({ where: { id: vehicleId } }).catch(() => null);
    await prisma.user.deleteMany({ where: { email: 'audit-p3-driver@ecocoop.local' } }).catch(() => null);
    await app.close();
  });

  // ─── T041 Scenario 1: CollectionPoint CREATE ─────────────────────────────

  it('POST /collection-points → AuditLog CREATE com previousState=null e newState preenchido', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/collection-points')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Ponto Auditoria P3', address: 'Av. Teste, 123' });

    expect(res.status).toBe(201);
    const pointId = (res.body as { id: string }).id;
    createdPointIds.push(pointId);

    await sleep(150);

    const log = await prisma.auditLog.findFirst({
      where: { entityType: 'collectionPoint', entityId: pointId, action: 'CREATE' },
      orderBy: { createdAt: 'desc' },
    });

    expect(log).toBeDefined();
    expect(log!.previousState).toBeNull();
    expect(log!.newState).not.toBeNull();
    const newState = log!.newState as Record<string, unknown>;
    expect(newState['name']).toBe('Ponto Auditoria P3');
  });

  // ─── T041 Scenario 2: CollectionRoute CREATE ─────────────────────────────

  it('POST /collection-routes → AuditLog CREATE com previousState=null e newState preenchido', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/collection-routes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Rota Auditoria P3',
        plannedDate: '2026-09-01',
        vehicleId,
        driverId: driverUserId,
      });

    expect(res.status).toBe(201);
    const routeId = (res.body as { id: string }).id;
    createdRouteIds.push(routeId);

    await sleep(150);

    const log = await prisma.auditLog.findFirst({
      where: { entityType: 'collectionRoute', entityId: routeId, action: 'CREATE' },
      orderBy: { createdAt: 'desc' },
    });

    expect(log).toBeDefined();
    expect(log!.previousState).toBeNull();
    expect(log!.newState).not.toBeNull();
    const newState = log!.newState as Record<string, unknown>;
    expect(newState['name']).toBe('Rota Auditoria P3');
    expect(newState['status']).toBe('PLANEJADA');
  });

  // ─── T041 Scenario 3: RawMaterialEntry CREATE ────────────────────────────

  it('POST /collection-routes/:id/material-entries → AuditLog CREATE com previousState=null e newState preenchido', async () => {
    const route = await prisma.collectionRoute.create({
      data: {
        name: `Rota RME Audit ${Date.now()}`,
        plannedDate: new Date('2026-09-15'),
        vehicleId,
        driverId: driverUserId,
        status: 'EM_ANDAMENTO',
        startedAt: new Date(),
      },
    });
    createdRouteIds.push(route.id);

    const res = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${route.id}/material-entries`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ subcategoryId, quantity: 10.5, unitId });

    expect(res.status).toBe(201);
    const entryId = (res.body as { id: string }).id;

    await sleep(150);

    const log = await prisma.auditLog.findFirst({
      where: { entityType: 'rawMaterialEntry', entityId: entryId, action: 'CREATE' },
      orderBy: { createdAt: 'desc' },
    });

    expect(log).toBeDefined();
    expect(log!.previousState).toBeNull();
    expect(log!.newState).not.toBeNull();
    const newState = log!.newState as Record<string, unknown>;
    expect(newState['subcategoryId']).toBe(subcategoryId);
  });

  // ─── T041 Scenario 4: RawMaterialStockEvent immutability ─────────────────

  it('RawMaterialStockEvent gerado por entrada é imutável: sem updatedAt e sem rota PUT/DELETE direta', async () => {
    const route = await prisma.collectionRoute.create({
      data: {
        name: `Rota StockEvent Audit ${Date.now()}`,
        plannedDate: new Date('2026-09-20'),
        vehicleId,
        driverId: driverUserId,
        status: 'EM_ANDAMENTO',
        startedAt: new Date(),
      },
    });
    createdRouteIds.push(route.id);

    const res = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${route.id}/material-entries`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ subcategoryId, quantity: 5.0, unitId });

    expect(res.status).toBe(201);
    const entryId = (res.body as { id: string }).id;

    const stockEvent = await prisma.rawMaterialStockEvent.findFirst({
      where: { rawMaterialEntryId: entryId },
    });

    expect(stockEvent).toBeDefined();
    // RawMaterialStockEvent has only createdAt, no updatedAt (Principle IV — immutability)
    expect((stockEvent as Record<string, unknown>)['updatedAt']).toBeUndefined();

    // No PUT or DELETE routes exist for stock events
    const putRes = await request(app.getHttpServer())
      .put(`/api/v1/raw-material-stock-events/${stockEvent!.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(putRes.status).toBe(404);

    const deleteRes = await request(app.getHttpServer())
      .delete(`/api/v1/raw-material-stock-events/${stockEvent!.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deleteRes.status).toBe(404);
  });

  // ─── Immutability of AuditLog itself ─────────────────────────────────────

  it('/api/v1/audit-logs não expõe rotas PUT ou DELETE', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';

    const putRes = await request(app.getHttpServer())
      .put(`/api/v1/audit-logs/${fakeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(putRes.status).toBe(404);

    const deleteRes = await request(app.getHttpServer())
      .delete(`/api/v1/audit-logs/${fakeId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deleteRes.status).toBe(404);
  });
});
