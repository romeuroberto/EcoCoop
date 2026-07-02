import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma.service';

describe('CollectionRoutes — Execution (integration)', () => {
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
  const createdRouteIds: string[] = [];

  const login = async (email: string, password: string) => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password });
    return (res.body as { accessToken: string }).accessToken;
  };

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const createRoute = async (status: 'PLANEJADA' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA') => {
    const route = await prisma.collectionRoute.create({
      data: {
        name: `Exec Route ${status} ${Date.now()} ${Math.random()}`,
        plannedDate: new Date('2026-09-10'),
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

    const hash = await bcrypt.hash('driver123', 10);
    const driverProfile = await prisma.profile.findFirst({
      where: { type: 'DRIVER', isCustom: false },
    });
    const sorterProfile = await prisma.profile.findFirst({
      where: { type: 'SORTER', isCustom: false },
    });

    await prisma.profilePermission.upsert({
      where: {
        profileId_module_action: {
          profileId: driverProfile!.id,
          module: 'COLLECTION_ROUTES',
          action: 'EXECUTE',
        },
      },
      create: {
        profileId: driverProfile!.id,
        module: 'COLLECTION_ROUTES',
        action: 'EXECUTE',
      },
      update: {},
    });

    const driver = await prisma.user.upsert({
      where: { email: 'driver-execution-test@ecocoop.local' },
      create: {
        email: 'driver-execution-test@ecocoop.local',
        passwordHash: hash,
        profileId: driverProfile!.id,
      },
      update: {},
    });
    driverUserId = driver.id;
    driverToken = await login('driver-execution-test@ecocoop.local', 'driver123');

    const otherDriver = await prisma.user.upsert({
      where: { email: 'other-driver-execution-test@ecocoop.local' },
      create: {
        email: 'other-driver-execution-test@ecocoop.local',
        passwordHash: hash,
        profileId: driverProfile!.id,
      },
      update: {},
    });
    otherDriverUserId = otherDriver.id;
    otherDriverToken = await login('other-driver-execution-test@ecocoop.local', 'driver123');

    const sorter = await prisma.user.upsert({
      where: { email: 'sorter-execution-test@ecocoop.local' },
      create: {
        email: 'sorter-execution-test@ecocoop.local',
        passwordHash: hash,
        profileId: sorterProfile!.id,
      },
      update: {},
    });
    sorterUserId = sorter.id;
    sorterToken = await login('sorter-execution-test@ecocoop.local', 'driver123');

    const unitForCapacity = await prisma.unitOfMeasure.findFirst();
    const vehicle = await prisma.vehicle.create({
      data: {
        plate: `EXE-${Math.random().toString(36).slice(2, 8)}`.toUpperCase(),
        type: 'VAN',
        model: 'Execution Test Van',
        isActive: true,
        capacityUnitId: unitForCapacity?.id,
      },
    });
    vehicleId = vehicle.id;
  });

  afterAll(async () => {
    if (!prisma) {
      if (app) await app.close();
      return;
    }

    await prisma.auditLog.deleteMany({
      where: {
        OR: [
          { entityType: 'collectionRoute', entityId: { in: createdRouteIds } },
          { userId: { in: [driverUserId, otherDriverUserId, sorterUserId] } },
        ],
      },
    });
    await prisma.collectionRoute.deleteMany({ where: { id: { in: createdRouteIds } } });
    await prisma.vehicle.deleteMany({ where: { id: vehicleId } });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'driver-execution-test@ecocoop.local',
            'other-driver-execution-test@ecocoop.local',
            'sorter-execution-test@ecocoop.local',
          ],
        },
      },
    });
    await app.close();
  });

  it('DRIVER executa PLANEJADA→EM_ANDAMENTO→CONCLUIDA com timestamps e version', async () => {
    const route = await createRoute('PLANEJADA');

    const startRes = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${route.id}/start`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({});

    expect(startRes.status).toBe(200);
    expect(startRes.body.status).toBe('EM_ANDAMENTO');
    expect(startRes.body.startedAt).toBeTruthy();
    expect(startRes.body.version).toBe(route.version + 1);

    const completeRes = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${route.id}/complete`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({});

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.status).toBe('CONCLUIDA');
    expect(completeRes.body.completedAt).toBeTruthy();
    expect(completeRes.body.version).toBe(route.version + 2);
  });

  it('POST /start audita transição como UPDATE com previousState e newState', async () => {
    const route = await createRoute('PLANEJADA');

    const res = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${route.id}/start`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({});

    expect(res.status).toBe(200);
    await sleep(80);

    const audit = await prisma.auditLog.findFirst({
      where: { entityType: 'collectionRoute', entityId: route.id, action: 'UPDATE' },
      orderBy: { createdAt: 'desc' },
    });

    expect(audit).toBeTruthy();
    expect((audit!.previousState as { status?: string }).status).toBe('PLANEJADA');
    expect((audit!.newState as { status?: string }).status).toBe('EM_ANDAMENTO');

    const createAuditCount = await prisma.auditLog.count({
      where: { entityType: 'collectionRoute', entityId: route.id, action: 'CREATE' },
    });
    expect(createAuditCount).toBe(0);
  });

  it('ADMIN cancela rota PLANEJADA persistindo cancelReason', async () => {
    const route = await createRoute('PLANEJADA');

    const res = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${route.id}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Veículo indisponível' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('CANCELADA');
    expect(res.body.cancelReason).toBe('Veículo indisponível');

    const rows = await prisma.$queryRaw<Array<{ cancelReason: string | null }>>`
      SELECT "cancelReason" FROM "CollectionRoute" WHERE "id" = ${route.id}
    `;
    expect(rows[0]?.cancelReason).toBe('Veículo indisponível');
  });

  it('MANAGER cancela rota EM_ANDAMENTO', async () => {
    const route = await createRoute('EM_ANDAMENTO');

    const res = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${route.id}/cancel`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ reason: 'Chuva forte', confirmInProgress: true });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('CANCELADA');
    expect(res.body.cancelReason).toBe('Chuva forte');
  });

  it('cancelamento de CONCLUIDA → 409 INVALID_ROUTE_TRANSITION', async () => {
    const route = await createRoute('CONCLUIDA');

    const res = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${route.id}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Não permitido' });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('INVALID_ROUTE_TRANSITION');
  });

  it('complete em rota CANCELADA → 409 INVALID_ROUTE_TRANSITION', async () => {
    const route = await createRoute('CANCELADA');

    const res = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${route.id}/complete`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({});

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('INVALID_ROUTE_TRANSITION');
  });

  it('DRIVER não atribuído em start/complete → 403', async () => {
    const planned = await createRoute('PLANEJADA');
    const ongoing = await createRoute('EM_ANDAMENTO');

    const startRes = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${planned.id}/start`)
      .set('Authorization', `Bearer ${otherDriverToken}`)
      .send({});
    expect(startRes.status).toBe(403);

    const completeRes = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${ongoing.id}/complete`)
      .set('Authorization', `Bearer ${otherDriverToken}`)
      .send({});
    expect(completeRes.status).toBe(403);
  });

  it('DRIVER não pode cancelar rota', async () => {
    const route = await createRoute('PLANEJADA');

    const res = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${route.id}/cancel`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ reason: 'Tentativa indevida' });

    expect(res.status).toBe(403);
  });

  it('SORTER tentando start/complete/cancel → 403', async () => {
    const plannedForStart = await createRoute('PLANEJADA');
    const ongoingForComplete = await createRoute('EM_ANDAMENTO');
    const plannedForCancel = await createRoute('PLANEJADA');

    const startRes = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${plannedForStart.id}/start`)
      .set('Authorization', `Bearer ${sorterToken}`)
      .send({});
    expect(startRes.status).toBe(403);

    const completeRes = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${ongoingForComplete.id}/complete`)
      .set('Authorization', `Bearer ${sorterToken}`)
      .send({});
    expect(completeRes.status).toBe(403);

    const cancelRes = await request(app.getHttpServer())
      .post(`/api/v1/collection-routes/${plannedForCancel.id}/cancel`)
      .set('Authorization', `Bearer ${sorterToken}`)
      .send({ reason: 'Tentativa sorter' });
    expect(cancelRes.status).toBe(403);
  });

  it('edição estrutural em CONCLUIDA → 422 ROUTE_NOT_EDITABLE', async () => {
    const route = await createRoute('CONCLUIDA');

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/collection-routes/${route.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Tentativa concluída' });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('ROUTE_NOT_EDITABLE');
  });

  it('duplo start concorrente retorna exatamente um sucesso e um 409', async () => {
    const route = await createRoute('PLANEJADA');

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post(`/api/v1/collection-routes/${route.id}/start`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({}),
      request(app.getHttpServer())
        .post(`/api/v1/collection-routes/${route.id}/start`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({}),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([200, 409]);

    const conflict = first.status === 409 ? first : second;
    expect(['ROUTE_CONCURRENT_MODIFICATION', 'INVALID_ROUTE_TRANSITION']).toContain(conflict.body.code);
  });
});
