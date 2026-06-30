import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { GEOCODING_PROVIDER } from '../../src/common/providers/geocoding/geocoding.provider';
import { PrismaService } from '../../src/common/prisma.service';

describe('CollectionPoints (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let managerToken: string;
  let driverToken: string;
  let sorterToken: string;
  const createdIds: string[] = [];

  const login = async (email: string, password: string) => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password });
    return (res.body as { accessToken: string }).accessToken;
  };

  const mockGeocodingProvider = {
    geocode: jest.fn().mockResolvedValue({ lat: -23.5505, lng: -46.6333 }),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(GEOCODING_PROVIDER)
      .useValue(mockGeocodingProvider)
      .compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
    prisma = app.get(PrismaService);

    adminToken = await login('admin@ecocoop.local', 'admin123');
    managerToken = await login('gestor@ecocoop.local', 'gestor123');

    // Create a DRIVER user for tests
    const driverProfile = await prisma.profile.findFirst({ where: { type: 'DRIVER', isCustom: false } });
    const hash = await bcrypt.hash('driver123', 10);
    await prisma.user.upsert({
      where: { email: 'driver-test@ecocoop.local' },
      create: { email: 'driver-test@ecocoop.local', passwordHash: hash, profileId: driverProfile!.id },
      update: {},
    });
    driverToken = await login('driver-test@ecocoop.local', 'driver123');

    // Create a SORTER user for tests
    const sorterProfile = await prisma.profile.findFirst({ where: { type: 'SORTER', isCustom: false } });
    const sorterUser = await prisma.user.upsert({
      where: { email: 'sorter-test@ecocoop.local' },
      create: { email: 'sorter-test@ecocoop.local', passwordHash: hash, profileId: sorterProfile!.id },
      update: {},
    });
    void sorterUser;
    sorterToken = await login('sorter-test@ecocoop.local', 'driver123');
  });

  afterAll(async () => {
    await prisma.collectionPoint.deleteMany({ where: { id: { in: createdIds } } });
    await prisma.user.deleteMany({ where: { email: { in: ['driver-test@ecocoop.local', 'sorter-test@ecocoop.local'] } } });
    await app.close();
  });

  // ─── POST ─────────────────────────────────────────────────────────────────

  it('ADMIN POST — creates point without coords → locationPending=true (201)', async () => {
    mockGeocodingProvider.geocode.mockResolvedValueOnce(null); // simulate failure

    const res = await request(app.getHttpServer())
      .post('/api/v1/collection-points')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Ponto Teste A', address: 'Endereço Inválido XYZ 999' });

    expect(res.status).toBe(201);
    expect(res.body.locationPending).toBe(true);
    expect(res.body.latitude).toBeNull();
    expect(res.body.longitude).toBeNull();
    createdIds.push(res.body.id);
  });

  it('ADMIN POST — creates point with manual coords → locationPending=false (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/collection-points')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Ponto Teste B', address: 'Rua das Flores, 100', latitude: -23.5505, longitude: -46.6333 });

    expect(res.status).toBe(201);
    expect(res.body.locationPending).toBe(false);
    expect(parseFloat(res.body.latitude)).toBeCloseTo(-23.5505, 4);
    expect(parseFloat(res.body.longitude)).toBeCloseTo(-46.6333, 4);
    createdIds.push(res.body.id);
  });

  it('MANAGER POST — creates point successfully (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/collection-points')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ name: 'Ponto Gestor C', address: 'Av. Paulista, 1000, São Paulo, SP' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Ponto Gestor C');
    createdIds.push(res.body.id);
  });

  it('DRIVER POST — receives 403', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/collection-points')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ name: 'Ponto Driver', address: 'Rua X, 1' });

    expect(res.status).toBe(403);
  });

  it('SORTER POST — receives 403', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/collection-points')
      .set('Authorization', `Bearer ${sorterToken}`)
      .send({ name: 'Ponto Sorter', address: 'Rua Y, 2' });

    expect(res.status).toBe(403);
  });

  it('POST — missing address → 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/collection-points')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Ponto Sem Endereço' });

    expect(res.status).toBe(400);
  });

  it('POST — missing name → 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/collection-points')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ address: 'Rua Z, 10' });

    expect(res.status).toBe(400);
  });

  // ─── GET list ─────────────────────────────────────────────────────────────

  it('GET /collection-points — returns paginated envelope', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/collection-points')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('page');
    expect(res.body).toHaveProperty('limit');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET — search by name filters results', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/collection-points?search=Ponto+Teste+A')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.some((p: { name: string }) => p.name === 'Ponto Teste A')).toBe(true);
  });

  it('GET — status=inactive returns only inactive points', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/collection-points?status=inactive')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.every((p: { isActive: boolean }) => !p.isActive)).toBe(true);
  });

  it('GET — locationPending=true returns only pending points', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/collection-points?locationPending=true&status=all')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.every((p: { locationPending: boolean }) => p.locationPending === true)).toBe(true);
  });

  // ─── GET :id ──────────────────────────────────────────────────────────────

  it('GET /collection-points/:id — returns 404 for nonexistent id', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/collection-points/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('COLLECTION_POINT_NOT_FOUND');
  });

  // ─── PATCH ────────────────────────────────────────────────────────────────

  it('PATCH — update coords → locationPending=false + audit generated', async () => {
    // Use the point created without coords (Ponto Teste A)
    const pointId = createdIds[0];

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/collection-points/${pointId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ latitude: -23.5505, longitude: -46.6333 });

    expect(res.status).toBe(200);
    expect(res.body.locationPending).toBe(false);
    expect(parseFloat(res.body.latitude)).toBeCloseTo(-23.5505, 4);

    // Verify audit log was created
    const audit = await prisma.auditLog.findFirst({
      where: { entityType: 'collectionPoint', entityId: pointId, action: 'UPDATE' },
      orderBy: { createdAt: 'desc' },
    });
    expect(audit).toBeTruthy();
    expect((audit!.previousState as Record<string, unknown>)?.locationPending).toBe(true);
    expect((audit!.newState as Record<string, unknown>)?.locationPending).toBe(false);
  });

  it('PATCH — isActive=false → 200 + audit with previousState.isActive=true', async () => {
    const pointId = createdIds[1]; // Ponto Teste B (active)

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/collection-points/${pointId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });

    expect(res.status).toBe(200);
    expect(res.body.isActive).toBe(false);

    const audit = await prisma.auditLog.findFirst({
      where: { entityType: 'collectionPoint', entityId: pointId, action: 'UPDATE' },
      orderBy: { createdAt: 'desc' },
    });
    expect(audit).toBeTruthy();
    expect((audit!.previousState as Record<string, unknown>)?.isActive).toBe(true);
    expect((audit!.newState as Record<string, unknown>)?.isActive).toBe(false);
  });

  it('DRIVER PATCH — receives 403', async () => {
    const pointId = createdIds[0];
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/collection-points/${pointId}`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ name: 'Tentativa Driver' });

    expect(res.status).toBe(403);
  });

  it('SORTER PATCH — receives 403', async () => {
    const pointId = createdIds[0];
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/collection-points/${pointId}`)
      .set('Authorization', `Bearer ${sorterToken}`)
      .send({ name: 'Tentativa Sorter' });

    expect(res.status).toBe(403);
  });

  it('PATCH — nonexistent id → 404', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/v1/collection-points/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Não existe' });

    expect(res.status).toBe(404);
  });

  // ─── Geocoding mock failure ───────────────────────────────────────────────

  it('POST with geocoding provider returning null → point saved with locationPending=true, lat/lng null', async () => {
    mockGeocodingProvider.geocode.mockResolvedValueOnce(null);

    const res = await request(app.getHttpServer())
      .post('/api/v1/collection-points')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Ponto Geocoding Falho', address: 'Endereço que não existe de jeito nenhum 99999' });

    expect(res.status).toBe(201);
    expect(res.body.locationPending).toBe(true);
    expect(res.body.latitude).toBeNull();
    expect(res.body.longitude).toBeNull();
    createdIds.push(res.body.id);
  });
});
