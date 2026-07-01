/**
 * T045 — Edge Cases Phase 3 (integration)
 *
 * Edge cases já cobertos nos specs de módulo (não duplicados aqui):
 *   - Geocoding falha → locationPending=true      [collection-points.spec.ts:75,279]
 *   - Dois start simultâneos → 409                [collection-route-execution.spec.ts:353]
 *   - Quantidade 0 → 422                          [raw-material-entries.spec.ts]
 *   - Quantidade negativa → 422                   [raw-material-entries.spec.ts]
 *   - Estorno que negativaria saldo → 409         [raw-material-entries.spec.ts]
 *   - Saldo subcategoria inativa com histórico    [raw-material-balance.spec.ts]
 *
 * Cenário exclusivo deste arquivo (único gap não coberto):
 *   - Ponto de coleta inativado APÓS inclusão em rota existente →
 *     ponto permanece na rota com collectionPoint.isActive=false.
 */

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { GEOCODING_PROVIDER } from '../../src/common/providers/geocoding/geocoding.provider';
import { PrismaService } from '../../src/common/prisma.service';

describe('Edge Cases Phase 3 (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let vehicleId: string;
  let driverUserId: string;

  const DRIVER_EMAIL = 'edge-p3-driver@ecocoop.local';
  const createdPointIds: string[] = [];
  const createdRouteIds: string[] = [];

  const mockGeocodingProvider = {
    geocode: jest.fn().mockResolvedValue({ lat: -23.5505, lng: -46.6333 }),
  };

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

    const hash = await bcrypt.hash('edge123', 10);
    const driverProfile = await prisma.profile.findFirstOrThrow({
      where: { type: 'DRIVER', isCustom: false },
    });
    const driver = await prisma.user.upsert({
      where: { email: DRIVER_EMAIL },
      create: { email: DRIVER_EMAIL, passwordHash: hash, profileId: driverProfile.id },
      update: {},
    });
    driverUserId = driver.id;

    const unit = await prisma.unitOfMeasure.findFirstOrThrow({ where: { isActive: true } });
    const vehicle = await prisma.vehicle.create({
      data: {
        plate: `EDG${Date.now().toString().slice(-4)}`,
        type: 'VAN',
        model: 'Edge P3 Van',
        isActive: true,
        capacityUnitId: unit.id,
      },
    });
    vehicleId = vehicle.id;
  });

  afterAll(async () => {
    await prisma.collectionRoute
      .deleteMany({ where: { id: { in: createdRouteIds } } })
      .catch(() => null);
    await prisma.collectionPoint
      .deleteMany({ where: { id: { in: createdPointIds } } })
      .catch(() => null);
    await prisma.vehicle.deleteMany({ where: { id: vehicleId } }).catch(() => null);
    await prisma.user.deleteMany({ where: { email: DRIVER_EMAIL } }).catch(() => null);
    await app.close();
  });

  // ─── Ponto inativado APÓS inclusão em rota ────────────────────────────────

  it('ponto de coleta inativado após inclusão em rota → permanece na rota com collectionPoint.isActive=false', async () => {
    // 1. Criar ponto de coleta ativo
    const pointRes = await request(app.getHttpServer())
      .post('/api/v1/collection-points')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Ponto Edge P3', address: 'Rua Edge, 1', latitude: -23.55, longitude: -46.63 });

    expect(pointRes.status).toBe(201);
    const pointId = (pointRes.body as { id: string }).id;
    createdPointIds.push(pointId);
    expect(pointRes.body.isActive).toBe(true);

    // 2. Criar rota PLANEJADA com o ponto incluído
    const routeRes = await request(app.getHttpServer())
      .post('/api/v1/collection-routes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Rota Edge P3',
        plannedDate: '2026-10-10',
        vehicleId,
        driverId: driverUserId,
        pointIds: [pointId],
      });

    expect(routeRes.status).toBe(201);
    const routeId = (routeRes.body as { id: string }).id;
    createdRouteIds.push(routeId);
    const routeBody = routeRes.body as { routePoints: { collectionPoint: { id: string; isActive: boolean } }[] };
    expect(routeBody.routePoints).toHaveLength(1);
    expect(routeBody.routePoints[0].collectionPoint.id).toBe(pointId);
    expect(routeBody.routePoints[0].collectionPoint.isActive).toBe(true);

    // 3. Inativar o ponto APÓS inclusão na rota
    const patchRes = await request(app.getHttpServer())
      .patch(`/api/v1/collection-points/${pointId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.isActive).toBe(false);

    // 4. Buscar a rota — ponto deve permanecer, com isActive=false
    const getRouteRes = await request(app.getHttpServer())
      .get(`/api/v1/collection-routes/${routeId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(getRouteRes.status).toBe(200);
    const fetchedRoute = getRouteRes.body as {
      routePoints: { collectionPoint: { id: string; isActive: boolean } }[];
    };

    // O ponto deve continuar na rota (não removido)
    expect(fetchedRoute.routePoints).toHaveLength(1);
    expect(fetchedRoute.routePoints[0].collectionPoint.id).toBe(pointId);

    // O ponto deve refletir isActive=false (inativação lógica, não remoção da rota)
    expect(fetchedRoute.routePoints[0].collectionPoint.isActive).toBe(false);
  });
});
