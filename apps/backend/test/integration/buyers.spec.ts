import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma.service';

// CNPJ reference table (modulo-11 validated):
//   11.222.333/0001-81  →  VALID   (primary ADMIN-created buyer)
//   11.222.333/0001-80  →  INVALID (last check digit wrong by 1)
//   22.333.444/0001-81  →  VALID   (MANAGER-created buyer)
//   33.444.555/0001-39  →  VALID   (duplicate test / link-user tests)
// CPF for PF buyer:
//   529.982.247-25      →  VALID   (CPF buyer create test)
//   529.982.247-26      →  INVALID (invalid CPF check digit)

describe('Buyers (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let managerToken: string;
  let buyerToken: string;

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
  });

  afterAll(async () => {
    await prisma.buyer.deleteMany({
      where: {
        documentNumber: {
          in: [
            '11.222.333/0001-81',
            '22.333.444/0001-81',
            '33.444.555/0001-39',
            '529.982.247-25',
          ],
        },
      },
    });
    await app.close();
  });

  const validCnpjBuyer = () => ({
    legalName: 'Test-Recicla Mais Ltda',
    documentType: 'CNPJ',
    documentNumber: '11.222.333/0001-81',
    phone: '(11) 3456-7890',
    email: 'contato@reciclamais.com',
  });

  it('ADMIN POST /buyers — creates buyer (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/buyers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validCnpjBuyer());

    expect(res.status).toBe(201);
    expect(res.body.legalName).toBe('Test-Recicla Mais Ltda');
    expect(res.body.documentType).toBe('CNPJ');
    expect(res.body.isActive).toBe(true);
  });

  it('POST /buyers — duplicate documentNumber returns 409 BUYER_DOCUMENT_CONFLICT', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/buyers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validCnpjBuyer());

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('BUYER_DOCUMENT_CONFLICT');
  });

  it('POST /buyers — invalid CNPJ check digit returns 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/buyers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...validCnpjBuyer(), documentNumber: '11.222.333/0001-80' });

    expect(res.status).toBe(400);
  });

  it('POST /buyers — invalid CPF check digit returns 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/buyers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        legalName: 'Test-José PF',
        documentType: 'CPF',
        documentNumber: '529.982.247-26',
      });

    expect(res.status).toBe(400);
  });

  it('MANAGER POST /buyers — creates buyer (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/buyers')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        legalName: 'Test-Comprador Gestor',
        documentType: 'CNPJ',
        documentNumber: '22.333.444/0001-81',
      });

    expect(res.status).toBe(201);
  });

  it('POST /buyers — user without BUYERS permission returns 403', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/buyers')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send(validCnpjBuyer());

    expect(res.status).toBe(403);
  });

  it('GET /buyers — returns paginated envelope {data, total, page, limit}', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/buyers')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('page', 1);
    expect(res.body).toHaveProperty('limit', 20);
  });

  it('PATCH /buyers/:id — inactivation removes from ?status=active list (SC-002)', async () => {
    const buyer = await prisma.buyer.findFirst({ where: { documentNumber: '11.222.333/0001-81' } });
    expect(buyer).not.toBeNull();

    await request(app.getHttpServer())
      .patch(`/api/v1/buyers/${buyer!.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });

    const listRes = await request(app.getHttpServer())
      .get('/api/v1/buyers?status=active')
      .set('Authorization', `Bearer ${adminToken}`);

    const ids = (listRes.body.data as { id: string }[]).map((b) => b.id);
    expect(ids).not.toContain(buyer!.id);
  });

  it('PATCH /buyers/:id — previousState non-null in AuditLog (SC-004)', async () => {
    const buyer = await prisma.buyer.findFirst({ where: { documentNumber: '22.333.444/0001-81' } });
    expect(buyer).not.toBeNull();

    await request(app.getHttpServer())
      .patch(`/api/v1/buyers/${buyer!.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notes: 'Atualizado em teste' });

    await new Promise((r) => setTimeout(r, 150));

    const log = await prisma.auditLog.findFirst({
      where: { entityType: 'buyer', entityId: buyer!.id, action: 'UPDATE' },
      orderBy: { createdAt: 'desc' },
    });

    expect(log).toBeDefined();
    expect(log!.previousState).not.toBeNull();
    expect(log!.newState).not.toBeNull();
  });

  it('PATCH /buyers/:id/link-user — non-BUYER profile returns 422 USER_NOT_BUYER_PROFILE', async () => {
    const buyer = await prisma.buyer.create({
      data: {
        legalName: 'Test-Link User PJ',
        documentType: 'CNPJ',
        documentNumber: '33.444.555/0001-39',
      },
    });

    const managerUser = await prisma.user.findUnique({ where: { email: 'gestor@ecocoop.local' } });

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/buyers/${buyer.id}/link-user`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: managerUser!.id });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('USER_NOT_BUYER_PROFILE');
  });

  it('PATCH /buyers/:id/link-user — user already linked to another buyer returns 409 USER_ALREADY_LINKED', async () => {
    const buyerUser = await prisma.user.findUnique({ where: { email: 'comprador@ecocoop.local' } });

    // Link buyer user to first buyer (reactivate first)
    const firstBuyer = await prisma.buyer.findFirst({ where: { documentNumber: '11.222.333/0001-81' } });
    await prisma.buyer.update({ where: { id: firstBuyer!.id }, data: { userId: buyerUser!.id } });

    // Try to link same user to another buyer
    const secondBuyer = await prisma.buyer.findFirst({ where: { documentNumber: '33.444.555/0001-39' } });

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/buyers/${secondBuyer!.id}/link-user`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: buyerUser!.id });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('USER_ALREADY_LINKED');

    // cleanup
    await prisma.buyer.update({ where: { id: firstBuyer!.id }, data: { userId: null } });
  });
});
