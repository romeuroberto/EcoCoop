import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma.service';

describe('Vehicles (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let managerToken: string;
  let buyerToken: string;
  let unitId: string;
  let inactiveUnitId: string;

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
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
    prisma = app.get(PrismaService);

    adminToken = await login('admin@ecocoop.local', 'admin123');
    managerToken = await login('gestor@ecocoop.local', 'gestor123');
    buyerToken = await login('comprador@ecocoop.local', 'comprador123');

    const unit = await prisma.unitOfMeasure.create({
      data: { name: 'Test-Quilograma', symbol: 'kg-test', isActive: true },
    });
    unitId = unit.id;

    const inactiveUnit = await prisma.unitOfMeasure.create({
      data: { name: 'Test-Unidade Inativa', symbol: 'inact-test', isActive: false },
    });
    inactiveUnitId = inactiveUnit.id;
  });

  afterAll(async () => {
    await prisma.vehicle.deleteMany({
      where: {
        plate: {
          in: ['TST-0001', 'TST-0002', 'TST-0003', 'TST-0004'],
        },
      },
    });
    await prisma.unitOfMeasure.deleteMany({
      where: { id: { in: [unitId, inactiveUnitId] } },
    });
    await app.close();
  });

  it('ADMIN POST /vehicles — creates vehicle without capacity (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ plate: 'TST-0001', type: 'TRUCK', model: 'Volvo FH' });

    expect(res.status).toBe(201);
    expect(res.body.plate).toBe('TST-0001');
    expect(res.body.type).toBe('TRUCK');
    expect(res.body.isActive).toBe(true);
    expect(res.body.capacityUnit).toBeNull();
  });

  it('ADMIN POST /vehicles — creates vehicle with capacity pair (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        plate: 'TST-0002',
        type: 'VAN',
        model: 'Mercedes Sprinter',
        capacityValue: 1500,
        capacityUnitId: unitId,
      });

    expect(res.status).toBe(201);
    expect(res.body.capacityValue).toBeDefined();
    expect(res.body.capacityUnit).toMatchObject({ id: unitId, symbol: 'kg-test' });
  });

  it('POST /vehicles — duplicate plate returns 409 VEHICLE_PLATE_CONFLICT', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ plate: 'TST-0001', type: 'PICKUP', model: 'Ford Ranger' });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('VEHICLE_PLATE_CONFLICT');
  });

  it('POST /vehicles — capacityValue without capacityUnitId returns 400 CAPACITY_UNIT_REQUIRED_WITH_VALUE', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ plate: 'TST-0099', type: 'TRUCK', model: 'Scania', capacityValue: 500 });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('CAPACITY_UNIT_REQUIRED_WITH_VALUE');
  });

  it('POST /vehicles — inactive unit as capacityUnitId returns 400 UNIT_INACTIVE', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        plate: 'TST-0098',
        type: 'TRUCK',
        model: 'DAF',
        capacityValue: 500,
        capacityUnitId: inactiveUnitId,
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('UNIT_INACTIVE');
  });

  it('POST /vehicles — invalid plate format returns 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ plate: 'INVALID_PLATE', type: 'TRUCK', model: 'Test' });

    expect(res.status).toBe(400);
  });

  it('MANAGER POST /vehicles — creates vehicle (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ plate: 'TST-0003', type: 'MOTORCYCLE', model: 'Honda CG' });

    expect(res.status).toBe(201);
  });

  it('POST /vehicles — user without VEHICLES permission returns 403', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ plate: 'TST-9999', type: 'VAN', model: 'Test' });

    expect(res.status).toBe(403);
  });

  it('GET /vehicles — returns paginated envelope {data, total, page, limit}', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/vehicles')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('page', 1);
    expect(res.body).toHaveProperty('limit', 20);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /vehicles/:id — returns single vehicle with capacityUnit', async () => {
    const vehicle = await prisma.vehicle.findFirst({ where: { plate: 'TST-0002' } });
    expect(vehicle).not.toBeNull();

    const res = await request(app.getHttpServer())
      .get(`/api/v1/vehicles/${vehicle!.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.plate).toBe('TST-0002');
    expect(res.body.capacityUnit).toMatchObject({ symbol: 'kg-test' });
  });

  it('GET /vehicles/:id — missing vehicle returns 404 VEHICLE_NOT_FOUND', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/vehicles/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('VEHICLE_NOT_FOUND');
  });

  it('PATCH /vehicles/:id — inactivation removes vehicle from active list', async () => {
    const vehicle = await prisma.vehicle.findFirst({ where: { plate: 'TST-0001' } });
    expect(vehicle).not.toBeNull();

    await request(app.getHttpServer())
      .patch(`/api/v1/vehicles/${vehicle!.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });

    const listRes = await request(app.getHttpServer())
      .get('/api/v1/vehicles?status=active')
      .set('Authorization', `Bearer ${adminToken}`);

    const ids = (listRes.body.data as { id: string }[]).map((v) => v.id);
    expect(ids).not.toContain(vehicle!.id);
  });

  it('PATCH /vehicles/:id — previousState non-null in AuditLog', async () => {
    const vehicle = await prisma.vehicle.create({
      data: { plate: 'TST-0004', type: 'VAN', model: 'Fiat Ducato' },
    });

    await request(app.getHttpServer())
      .patch(`/api/v1/vehicles/${vehicle.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notes: 'Auditado' });

    await new Promise((r) => setTimeout(r, 150));

    const log = await prisma.auditLog.findFirst({
      where: { entityType: 'vehicle', entityId: vehicle.id, action: 'UPDATE' },
      orderBy: { createdAt: 'desc' },
    });

    expect(log).toBeDefined();
    expect(log!.previousState).not.toBeNull();
    expect(log!.newState).not.toBeNull();
  });
});
