import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { GEOCODING_PROVIDER } from '../../src/common/providers/geocoding/geocoding.provider';
import { PrismaService } from '../../src/common/prisma.service';

describe('CollectionRoutes — Planning (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let managerToken: string;
  let driverToken: string;
  let sorterToken: string;
  let driverUserId: string;
  let vehicleId: string;
  let pointAId: string;
  let pointBId: string;
  let pointNoCoordsId: string;
  const createdRouteIds: string[] = [];

  const mockGeocodingProvider = { geocode: jest.fn().mockResolvedValue(null) };

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
    managerToken = await login('gestor@ecocoop.local', 'gestor123');

    const hash = await bcrypt.hash('driver123', 10);

    // DRIVER user
    const driverProfile = await prisma.profile.findFirst({
      where: { type: 'DRIVER', isCustom: false },
    });
    const driverUser = await prisma.user.upsert({
      where: { email: 'driver-routes-test@ecocoop.local' },
      create: {
        email: 'driver-routes-test@ecocoop.local',
        passwordHash: hash,
        profileId: driverProfile!.id,
      },
      update: {},
    });
    driverUserId = driverUser.id;
    driverToken = await login('driver-routes-test@ecocoop.local', 'driver123');

    // SORTER user
    const sorterProfile = await prisma.profile.findFirst({
      where: { type: 'SORTER', isCustom: false },
    });
    await prisma.user.upsert({
      where: { email: 'sorter-routes-test@ecocoop.local' },
      create: {
        email: 'sorter-routes-test@ecocoop.local',
        passwordHash: hash,
        profileId: sorterProfile!.id,
      },
      update: {},
    });
    sorterToken = await login('sorter-routes-test@ecocoop.local', 'driver123');

    // Vehicle fixture
    const unitForCapacity = await prisma.unitOfMeasure.findFirst();
    const vehicle = await prisma.vehicle.create({
      data: { plate: `TST-${Date.now()}`.slice(0, 10), type: 'VAN', model: 'Test Van', isActive: true, capacityUnitId: unitForCapacity?.id },
    });
    vehicleId = vehicle.id;

    // CollectionPoint fixtures
    const cpA = await prisma.collectionPoint.create({
      data: {
        name: 'Ponto A',
        address: 'Rua A, 1',
        latitude: -23.55,
        longitude: -46.63,
        locationPending: false,
        isActive: true,
      },
    });
    pointAId = cpA.id;

    const cpB = await prisma.collectionPoint.create({
      data: {
        name: 'Ponto B',
        address: 'Rua B, 2',
        latitude: -23.56,
        longitude: -46.64,
        locationPending: false,
        isActive: true,
      },
    });
    pointBId = cpB.id;

    const cpNoCoords = await prisma.collectionPoint.create({
      data: {
        name: 'Ponto Sem Coords',
        address: 'Endereço sem geocoding',
        locationPending: true,
        isActive: true,
      },
    });
    pointNoCoordsId = cpNoCoords.id;
  });

  afterAll(async () => {
    await prisma.collectionRoute.deleteMany({ where: { id: { in: createdRouteIds } } });
    await prisma.collectionPoint.deleteMany({
      where: { id: { in: [pointAId, pointBId, pointNoCoordsId] } },
    });
    await prisma.vehicle.deleteMany({ where: { id: vehicleId } });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['driver-routes-test@ecocoop.local', 'sorter-routes-test@ecocoop.local'],
        },
      },
    });
    await app.close();
  });

  // ─── POST /collection-routes ───────────────────────────────────────────────

  it('ADMIN cria rota → 201 status=PLANEJADA', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/collection-routes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Rota Teste Norte',
        plannedDate: '2026-08-01',
        vehicleId,
        driverId: driverUserId,
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('PLANEJADA');
    expect(res.body.name).toBe('Rota Teste Norte');
    expect(res.body.vehicle.id).toBe(vehicleId);
    createdRouteIds.push(res.body.id);
  });

  it('MANAGER cria rota com pointIds → 201 com routePoints em sequência', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/collection-routes')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Rota com Pontos',
        plannedDate: '2026-08-02',
        vehicleId,
        driverId: driverUserId,
        pointIds: [pointAId, pointBId],
      });

    expect(res.status).toBe(201);
    expect(res.body.routePoints).toHaveLength(2);
    expect(res.body.routePoints[0].collectionPoint.id).toBe(pointAId);
    expect(res.body.routePoints[0].sequence).toBe(1);
    expect(res.body.routePoints[1].sequence).toBe(2);
    createdRouteIds.push(res.body.id);
  });

  it('DRIVER criando rota → 403', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/collection-routes')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ name: 'X', plannedDate: '2026-08-01', vehicleId, driverId: driverUserId });

    expect(res.status).toBe(403);
  });

  it('SORTER criando rota → 403', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/collection-routes')
      .set('Authorization', `Bearer ${sorterToken}`)
      .send({ name: 'X', plannedDate: '2026-08-01', vehicleId, driverId: driverUserId });

    expect(res.status).toBe(403);
  });

  it('veículo inativo → 422 VEHICLE_INACTIVE', async () => {
    const inactiveVehicle = await prisma.vehicle.create({
      data: { plate: `INV-${Date.now()}`.slice(0, 10), type: 'VAN', model: 'Inactive', isActive: false },
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/collection-routes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'X', plannedDate: '2026-08-01', vehicleId: inactiveVehicle.id, driverId: driverUserId });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VEHICLE_INACTIVE');
    await prisma.vehicle.delete({ where: { id: inactiveVehicle.id } });
  });

  it('driver inativo → 422 DRIVER_INACTIVE', async () => {
    const hash = await bcrypt.hash('x', 10);
    const driverProfile = await prisma.profile.findFirst({ where: { type: 'DRIVER', isCustom: false } });
    const inactiveDriver = await prisma.user.create({
      data: {
        email: `inactive-driver-${Date.now()}@ecocoop.local`,
        passwordHash: hash,
        profileId: driverProfile!.id,
        isActive: false,
      },
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/collection-routes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'X', plannedDate: '2026-08-01', vehicleId, driverId: inactiveDriver.id });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('DRIVER_INACTIVE');
    await prisma.user.delete({ where: { id: inactiveDriver.id } });
  });

  it('usuário sem perfil DRIVER → 422 DRIVER_PROFILE_REQUIRED', async () => {
    const managerUser = await prisma.user.findFirst({
      where: { email: 'gestor@ecocoop.local' },
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/collection-routes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'X', plannedDate: '2026-08-01', vehicleId, driverId: managerUser!.id });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('DRIVER_PROFILE_REQUIRED');
  });

  it('ponto inativo em pointIds → 422 COLLECTION_POINT_INACTIVE', async () => {
    const inactivePoint = await prisma.collectionPoint.create({
      data: { name: 'Inativo', address: 'Rua X', isActive: false },
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/collection-routes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'X',
        plannedDate: '2026-08-01',
        vehicleId,
        driverId: driverUserId,
        pointIds: [inactivePoint.id],
      });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('COLLECTION_POINT_INACTIVE');
    await prisma.collectionPoint.delete({ where: { id: inactivePoint.id } });
  });

  // ─── GET /collection-routes ────────────────────────────────────────────────

  it('MANAGER lista rotas → 200 com envelope paginado', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/collection-routes')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('page');
    expect(res.body).toHaveProperty('limit');
  });

  it('DRIVER vê apenas rotas próprias', async () => {
    const otherVehicle = await prisma.vehicle.create({
      data: { plate: `OTH-${Date.now()}`.slice(0, 10), type: 'VAN', model: 'Other', isActive: true },
    });
    const adminUser = await prisma.user.findFirst({ where: { email: 'admin@ecocoop.local' } });
    const driverProfile = await prisma.profile.findFirst({ where: { type: 'DRIVER', isCustom: false } });
    const hash = await bcrypt.hash('x', 10);
    const otherDriver = await prisma.user.create({
      data: { email: `other-driver-${Date.now()}@ecocoop.local`, passwordHash: hash, profileId: driverProfile!.id },
    });
    void adminUser;

    const otherRoute = await prisma.collectionRoute.create({
      data: {
        name: 'Rota de Outro Motorista',
        plannedDate: new Date('2026-09-01'),
        vehicleId: otherVehicle.id,
        driverId: otherDriver.id,
        status: 'PLANEJADA',
      },
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/collection-routes')
      .set('Authorization', `Bearer ${driverToken}`);

    expect(res.status).toBe(200);
    const ids = res.body.data.map((r: { id: string }) => r.id);
    expect(ids).not.toContain(otherRoute.id);

    await prisma.collectionRoute.delete({ where: { id: otherRoute.id } });
    await prisma.user.delete({ where: { id: otherDriver.id } });
    await prisma.vehicle.delete({ where: { id: otherVehicle.id } });
  });

  // ─── GET /collection-routes/:id ───────────────────────────────────────────

  it('GET /:id → 200 com routePoints e teamMembers', async () => {
    const route = await prisma.collectionRoute.create({
      data: {
        name: 'Rota Detail',
        plannedDate: new Date('2026-08-10'),
        vehicleId,
        driverId: driverUserId,
        status: 'PLANEJADA',
        routePoints: {
          create: [{ collectionPointId: pointAId, sequence: 1 }],
        },
      },
    });
    createdRouteIds.push(route.id);

    const res = await request(app.getHttpServer())
      .get(`/api/v1/collection-routes/${route.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.routePoints).toHaveLength(1);
    expect(res.body.teamMembers).toBeDefined();
  });

  it('GET /:id inexistente → 404 COLLECTION_ROUTE_NOT_FOUND', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/collection-routes/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('COLLECTION_ROUTE_NOT_FOUND');
  });

  // ─── PATCH /collection-routes/:id ─────────────────────────────────────────

  it('PATCH rota PLANEJADA → 200', async () => {
    const route = await prisma.collectionRoute.create({
      data: { name: 'Rota Patch', plannedDate: new Date('2026-08-15'), vehicleId, driverId: driverUserId, status: 'PLANEJADA' },
    });
    createdRouteIds.push(route.id);

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/collection-routes/${route.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Rota Patch Atualizada' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Rota Patch Atualizada');
  });

  it('PATCH rota EM_ANDAMENTO → 409 ROUTE_NOT_EDITABLE', async () => {
    const route = await prisma.collectionRoute.create({
      data: { name: 'Rota Em Andamento', plannedDate: new Date('2026-08-20'), vehicleId, driverId: driverUserId, status: 'EM_ANDAMENTO' },
    });
    createdRouteIds.push(route.id);

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/collection-routes/${route.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Tentativa' });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('ROUTE_NOT_EDITABLE');
  });

  // ─── POST /:id/points ─────────────────────────────────────────────────────

  it('adicionar ponto → 200 com sequência correta', async () => {
    const route = await prisma.collectionRoute.create({
      data: { name: 'Rota Pontos', plannedDate: new Date('2026-08-25'), vehicleId, driverId: driverUserId, status: 'PLANEJADA' },
    });
    createdRouteIds.push(route.id);

    const res = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${route.id}/points`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ collectionPointId: pointAId });

    expect(res.status).toBe(201);
    expect(res.body.routePoints).toHaveLength(1);
    expect(res.body.routePoints[0].sequence).toBe(1);
  });

  it('adicionar ponto duplicado → 409 POINT_ALREADY_IN_ROUTE', async () => {
    const route = await prisma.collectionRoute.create({
      data: {
        name: 'Rota Dup',
        plannedDate: new Date('2026-08-26'),
        vehicleId,
        driverId: driverUserId,
        status: 'PLANEJADA',
        routePoints: { create: [{ collectionPointId: pointBId, sequence: 1 }] },
      },
    });
    createdRouteIds.push(route.id);

    const res = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${route.id}/points`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ collectionPointId: pointBId });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('POINT_ALREADY_IN_ROUTE');
  });

  it('adicionar ponto inativo → 422 COLLECTION_POINT_INACTIVE', async () => {
    const inactivePoint = await prisma.collectionPoint.create({
      data: { name: 'Inativo2', address: 'Rua Y', isActive: false },
    });
    const route = await prisma.collectionRoute.create({
      data: { name: 'Rota Inativo', plannedDate: new Date('2026-08-27'), vehicleId, driverId: driverUserId, status: 'PLANEJADA' },
    });
    createdRouteIds.push(route.id);

    const res = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${route.id}/points`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ collectionPointId: inactivePoint.id });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('COLLECTION_POINT_INACTIVE');
    await prisma.collectionPoint.delete({ where: { id: inactivePoint.id } });
  });

  // ─── DELETE /:id/points/:pointId ──────────────────────────────────────────

  it('remover ponto → 200 com lista atualizada', async () => {
    const route = await prisma.collectionRoute.create({
      data: {
        name: 'Rota Remove',
        plannedDate: new Date('2026-08-28'),
        vehicleId,
        driverId: driverUserId,
        status: 'PLANEJADA',
        routePoints: {
          create: [
            { collectionPointId: pointAId, sequence: 1 },
            { collectionPointId: pointBId, sequence: 2 },
          ],
        },
      },
    });
    createdRouteIds.push(route.id);

    const res = await request(app.getHttpServer())
      .delete(`/api/v1/collection-routes/${route.id}/points/${pointAId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.routePoints).toHaveLength(1);
    expect(res.body.routePoints[0].collectionPoint.id).toBe(pointBId);
  });

  // ─── PATCH /:id/points/reorder ────────────────────────────────────────────

  it('reordenar pontos → sequência persiste corretamente', async () => {
    const route = await prisma.collectionRoute.create({
      data: {
        name: 'Rota Reorder',
        plannedDate: new Date('2026-08-29'),
        vehicleId,
        driverId: driverUserId,
        status: 'PLANEJADA',
        routePoints: {
          create: [
            { collectionPointId: pointAId, sequence: 1 },
            { collectionPointId: pointBId, sequence: 2 },
          ],
        },
      },
    });
    createdRouteIds.push(route.id);

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/collection-routes/${route.id}/points/reorder`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ orderedPointIds: [pointBId, pointAId] });

    expect(res.status).toBe(200);
    expect(res.body.routePoints[0].collectionPoint.id).toBe(pointBId);
    expect(res.body.routePoints[0].sequence).toBe(1);
    expect(res.body.routePoints[1].collectionPoint.id).toBe(pointAId);
    expect(res.body.routePoints[1].sequence).toBe(2);
  });

  it('reordenar com IDs inválidos → 422 INVALID_POINT_ORDER', async () => {
    const route = await prisma.collectionRoute.create({
      data: {
        name: 'Rota Reorder Fail',
        plannedDate: new Date('2026-08-30'),
        vehicleId,
        driverId: driverUserId,
        status: 'PLANEJADA',
        routePoints: { create: [{ collectionPointId: pointAId, sequence: 1 }] },
      },
    });
    createdRouteIds.push(route.id);

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/collection-routes/${route.id}/points/reorder`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ orderedPointIds: [pointBId] }); // ID errado

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('INVALID_POINT_ORDER');
  });

  // ─── POST /:id/suggest-sequence ───────────────────────────────────────────

  it('suggest-sequence com ponto sem coords → excludedPoints preenchido', async () => {
    const route = await prisma.collectionRoute.create({
      data: {
        name: 'Rota Suggest',
        plannedDate: new Date('2026-09-01'),
        vehicleId,
        driverId: driverUserId,
        status: 'PLANEJADA',
        routePoints: {
          create: [
            { collectionPointId: pointAId, sequence: 1 },
            { collectionPointId: pointNoCoordsId, sequence: 2 },
          ],
        },
      },
    });
    createdRouteIds.push(route.id);

    const res = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${route.id}/suggest-sequence`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.suggestedOrder).toContain(pointAId);
    expect(res.body.excludedPoints).toHaveLength(1);
    expect(res.body.excludedPoints[0].id).toBe(pointNoCoordsId);
    expect(res.body.excludedPoints[0].reason).toBe('locationPending');
    expect(res.body.warning).toBeTruthy();
  });

  // ─── POST /:id/team + DELETE /:id/team/:userId ────────────────────────────

  it('adicionar e remover membro da equipe', async () => {
    const route = await prisma.collectionRoute.create({
      data: { name: 'Rota Equipe', plannedDate: new Date('2026-09-05'), vehicleId, driverId: driverUserId, status: 'PLANEJADA' },
    });
    createdRouteIds.push(route.id);

    const addRes = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${route.id}/team`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userIds: [driverUserId] });

    expect(addRes.status).toBe(201);
    expect(addRes.body.teamMembers.some((m: { userId: string }) => m.userId === driverUserId)).toBe(true);

    const removeRes = await request(app.getHttpServer())
      .delete(`/api/v1/collection-routes/${route.id}/team/${driverUserId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(removeRes.status).toBe(200);
    expect(removeRes.body.teamMembers.some((m: { userId: string }) => m.userId === driverUserId)).toBe(false);
  });

  it('remover membro inexistente → 404 TEAM_MEMBER_NOT_FOUND', async () => {
    const route = await prisma.collectionRoute.create({
      data: { name: 'Rota No Team', plannedDate: new Date('2026-09-06'), vehicleId, driverId: driverUserId, status: 'PLANEJADA' },
    });
    createdRouteIds.push(route.id);

    const res = await request(app.getHttpServer())
      .delete(`/api/v1/collection-routes/${route.id}/team/00000000-0000-0000-0000-000000000000`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('TEAM_MEMBER_NOT_FOUND');
  });
});
