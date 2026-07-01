/**
 * T044 — RBAC Phase 3 (integration)
 *
 * Focus: SC-006 — respostas 403 não devem vazar dados do recurso protegido.
 *
 * Cenários 403 funcionais já cobertos nos specs de módulo:
 *   - DRIVER POST /collection-points → 403          [collection-points.spec.ts:114]
 *   - SORTER POST /collection-points → 403          [collection-points.spec.ts:123]
 *   - DRIVER POST /collection-routes → 403          [collection-routes.spec.ts:183]
 *   - SORTER POST /collection-routes → 403          [collection-routes.spec.ts:192]
 *   - DRIVER (outro) start/complete rota → 403      [collection-route-execution.spec.ts:271]
 *   - DRIVER cancel → 403                           [collection-route-execution.spec.ts:288]
 *   - SORTER start/complete/cancel → 403            [collection-route-execution.spec.ts:299]
 *   - DRIVER rota de outro (entrada) → 403          [raw-material-entries.spec.ts:279]
 *   - SORTER GET /material-entries → 403            [raw-material-entries.spec.ts:291]
 *   - DRIVER estorno → 403                          [raw-material-entries.spec.ts:569]
 *   - DRIVER GET /raw-material-balance → 403        [raw-material-balance.spec.ts:288]
 *   - SORTER GET /raw-material-balance → 403        [raw-material-balance.spec.ts:296]
 *
 * Este arquivo cobre o gap de SC-006: verifica o BODY de respostas 403 para
 * garantir que nenhum dado sensível do recurso é exposto.
 */

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma.service';

/** Verifica SC-006: o body de um 403 não deve conter campos de dados do recurso. */
function assertNoResourceLeak(body: Record<string, unknown>, resourceValues: string[]): void {
  const bodyStr = JSON.stringify(body);
  for (const val of resourceValues) {
    expect(bodyStr).not.toContain(val);
  }
  // Campos permitidos numa resposta 403 genérica
  const allowedKeys = new Set(['statusCode', 'message', 'error', 'code']);
  const leaked = Object.keys(body).filter((k) => !allowedKeys.has(k));
  expect(leaked).toEqual([]);
}

describe('RBAC Phase 3 — SC-006: 403 body não vaza dados do recurso (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let driverToken: string;
  let sorterToken: string;
  let vehicleId: string;
  let foreignDriverUserId: string;
  let foreignRouteId: string;
  let foreignEntryRouteId: string;

  const DRIVER_EMAIL = 'rbac-p3-driver@ecocoop.local';
  const FOREIGN_DRIVER_EMAIL = 'rbac-p3-foreign@ecocoop.local';
  const SORTER_EMAIL = 'rbac-p3-sorter@ecocoop.local';

  // Valores distintivos para verificação SC-006 — nunca devem aparecer no body 403
  const SECRET_ROUTE_NAME = 'SC006_SECRET_ROUTE_RBAC_P3_TEST';
  const SECRET_POINT_NAME = 'SC006_SECRET_POINT_RBAC_P3_TEST';

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

    const hash = await bcrypt.hash('rbac123', 10);
    const driverProfile = await prisma.profile.findFirstOrThrow({
      where: { type: 'DRIVER', isCustom: false },
    });
    const sorterProfile = await prisma.profile.findFirstOrThrow({
      where: { type: 'SORTER', isCustom: false },
    });

    await prisma.user.upsert({
      where: { email: DRIVER_EMAIL },
      create: { email: DRIVER_EMAIL, passwordHash: hash, profileId: driverProfile.id },
      update: {},
    });
    driverToken = await login(DRIVER_EMAIL, 'rbac123');

    const foreign = await prisma.user.upsert({
      where: { email: FOREIGN_DRIVER_EMAIL },
      create: { email: FOREIGN_DRIVER_EMAIL, passwordHash: hash, profileId: driverProfile.id },
      update: {},
    });
    foreignDriverUserId = foreign.id;

    await prisma.user.upsert({
      where: { email: SORTER_EMAIL },
      create: { email: SORTER_EMAIL, passwordHash: hash, profileId: sorterProfile.id },
      update: {},
    });
    sorterToken = await login(SORTER_EMAIL, 'rbac123');

    const unit = await prisma.unitOfMeasure.findFirstOrThrow({ where: { isActive: true } });
    const vehicle = await prisma.vehicle.create({
      data: {
        plate: `RBC${Date.now().toString().slice(-4)}`,
        type: 'VAN',
        model: 'RBAC P3 Van',
        isActive: true,
        capacityUnitId: unit.id,
      },
    });
    vehicleId = vehicle.id;

    // Rota "secreta" pertencente ao foreign driver — usada para testar RouteOwnershipGuard
    const foreignRoute = await prisma.collectionRoute.create({
      data: {
        name: SECRET_ROUTE_NAME,
        plannedDate: new Date('2026-10-01'),
        vehicleId,
        driverId: foreignDriverUserId,
        status: 'PLANEJADA',
      },
    });
    foreignRouteId = foreignRoute.id;

    // Rota em EM_ANDAMENTO para testar material-entries ownership
    const foreignEntryRoute = await prisma.collectionRoute.create({
      data: {
        name: `${SECRET_ROUTE_NAME}_ENTRY`,
        plannedDate: new Date('2026-10-02'),
        vehicleId,
        driverId: foreignDriverUserId,
        status: 'EM_ANDAMENTO',
        startedAt: new Date(),
      },
    });
    foreignEntryRouteId = foreignEntryRoute.id;
  });

  afterAll(async () => {
    await prisma.collectionRoute
      .deleteMany({ where: { id: { in: [foreignRouteId, foreignEntryRouteId] } } })
      .catch(() => null);
    await prisma.vehicle.deleteMany({ where: { id: vehicleId } }).catch(() => null);
    await prisma.user
      .deleteMany({ where: { email: { in: [DRIVER_EMAIL, FOREIGN_DRIVER_EMAIL, SORTER_EMAIL] } } })
      .catch(() => null);
    await app.close();
  });

  // ─── Cenário 1: DRIVER POST /collection-points (RolesGuard) ──────────────

  it('SC-006: DRIVER POST /collection-points → 403 sem vazar dados do ponto no body', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/collection-points')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ name: SECRET_POINT_NAME, address: 'Av. Secreta, 1' });

    expect(res.status).toBe(403);
    assertNoResourceLeak(res.body as Record<string, unknown>, [SECRET_POINT_NAME, 'Av. Secreta']);
  });

  // ─── Cenário 2: SORTER POST /collection-routes (RolesGuard) ──────────────

  it('SC-006: SORTER POST /collection-routes → 403 sem vazar dados da rota no body', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/collection-routes')
      .set('Authorization', `Bearer ${sorterToken}`)
      .send({
        name: SECRET_ROUTE_NAME,
        plannedDate: '2026-10-01',
        vehicleId,
        driverId: foreignDriverUserId,
      });

    expect(res.status).toBe(403);
    assertNoResourceLeak(res.body as Record<string, unknown>, [SECRET_ROUTE_NAME, vehicleId]);
  });

  // ─── Cenário 3: DRIVER start rota de outro (RouteOwnershipGuard) ─────────

  it('SC-006: DRIVER start rota de outro → 403 sem vazar dados da rota no body', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${foreignRouteId}/start`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({});

    expect(res.status).toBe(403);
    assertNoResourceLeak(res.body as Record<string, unknown>, [
      SECRET_ROUTE_NAME,
      foreignRouteId,
      foreignDriverUserId,
    ]);
  });

  // ─── Cenário 4: DRIVER POST material-entries em rota de outro ────────────

  it('SC-006: DRIVER POST material-entries em rota de outro → 403 sem vazar dados da rota no body', async () => {
    const unit = await prisma.unitOfMeasure.findFirstOrThrow({ where: { isActive: true } });
    const category = await prisma.materialCategory.findFirstOrThrow();
    const subcat = await prisma.materialSubcategory.findFirstOrThrow({
      where: { categoryId: category.id, isActive: true },
    });

    const res = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${foreignEntryRouteId}/material-entries`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ subcategoryId: subcat.id, quantity: 10, unitId: unit.id });

    expect(res.status).toBe(403);
    assertNoResourceLeak(res.body as Record<string, unknown>, [
      `${SECRET_ROUTE_NAME}_ENTRY`,
      foreignEntryRouteId,
      foreignDriverUserId,
    ]);
  });

  // ─── Cenário 5: DRIVER POST /collection-routes (RolesGuard) ──────────────

  it('SC-006: DRIVER POST /collection-routes → 403 sem vazar dados da rota no body', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/collection-routes')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        name: SECRET_ROUTE_NAME,
        plannedDate: '2026-10-01',
        vehicleId,
        driverId: foreignDriverUserId,
      });

    expect(res.status).toBe(403);
    assertNoResourceLeak(res.body as Record<string, unknown>, [SECRET_ROUTE_NAME, vehicleId]);
  });

  // ─── Cenário 6: SORTER POST /collection-points (RolesGuard) ──────────────

  it('SC-006: SORTER POST /collection-points → 403 sem vazar dados do ponto no body', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/collection-points')
      .set('Authorization', `Bearer ${sorterToken}`)
      .send({ name: SECRET_POINT_NAME, address: 'Av. Secreta, 2' });

    expect(res.status).toBe(403);
    assertNoResourceLeak(res.body as Record<string, unknown>, [SECRET_POINT_NAME, 'Av. Secreta']);
  });
});
