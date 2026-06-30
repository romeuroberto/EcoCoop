import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma.service';

// CPF reference table (all validated with modulo-11):
//   529.982.247-25  →  VALID   (primary ADMIN-created member)
//   529.982.247-26  →  INVALID (last check digit wrong by 1)
//   111.444.777-35  →  VALID   (MANAGER-created member)
//   340.536.244-01  →  VALID   (inactive-role test; member never persisted)

describe('Members (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let managerToken: string;
  let activeRoleId: string;

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

    const role = await prisma.memberRole.findFirst({ where: { isActive: true } });
    activeRoleId = role!.id;
  });

  afterAll(async () => {
    await prisma.member.deleteMany({ where: { cpf: { startsWith: '529.982.247' } } });
    await prisma.member.deleteMany({ where: { cpf: { startsWith: '111.444.777' } } });
    await prisma.member.deleteMany({ where: { name: { startsWith: 'Test-' } } });
    await app.close();
  });

  const validMember = () => ({
    name: 'Test-João Silva',
    cpf: '529.982.247-25',
    phone: '(11) 91234-5678',
    admittedAt: '2024-01-15',
    roleId: activeRoleId,
  });

  it('ADMIN POST /members — creates member (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/members')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validMember());

    expect(res.status).toBe(201);
    expect(res.body.cpf).toBe('529.982.247-25');
    expect(res.body.role).toBeDefined();
    expect(res.body.isActive).toBe(true);
  });

  it('POST /members — duplicate CPF returns 409 MEMBER_CPF_CONFLICT', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/members')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validMember());

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('MEMBER_CPF_CONFLICT');
  });

  // 529.982.247-26: last check digit is 6, but correct value is 5 → INVALID
  it('POST /members — invalid CPF check digit returns 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/members')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...validMember(), cpf: '529.982.247-26' });

    expect(res.status).toBe(400);
  });

  // 111.444.777-35: both check digits correct → VALID
  it('MANAGER POST /members — creates member (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/members')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ ...validMember(), cpf: '111.444.777-35', name: 'Test-Maria Santos' });

    expect(res.status).toBe(201);
  });

  // 340.536.244-01: valid CPF, but role is inactive → service throws MEMBER_ROLE_INACTIVE before persisting
  it('POST /members — inactive roleId returns 400 MEMBER_ROLE_INACTIVE', async () => {
    const inactiveRole = await prisma.memberRole.create({ data: { name: 'Test-Inativa-Tmp', isActive: false } });

    const res = await request(app.getHttpServer())
      .post('/api/v1/members')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...validMember(), cpf: '340.536.244-01', roleId: inactiveRole.id });

    await prisma.memberRole.delete({ where: { id: inactiveRole.id } });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('MEMBER_ROLE_INACTIVE');
  });

  it('POST /members without token — returns 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/members')
      .send(validMember());
    expect(res.status).toBe(401);
  });

  it('GET /members — returns paginated envelope', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/members')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('page', 1);
    expect(res.body).toHaveProperty('limit', 20);
  });

  it('PATCH /members/:id — inactivated member hidden from ?status=active (SC-002)', async () => {
    const member = await prisma.member.findFirst({ where: { cpf: '529.982.247-25' } });
    expect(member).not.toBeNull();

    await request(app.getHttpServer())
      .patch(`/api/v1/members/${member!.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });

    const listRes = await request(app.getHttpServer())
      .get('/api/v1/members?status=active')
      .set('Authorization', `Bearer ${adminToken}`);

    const ids = (listRes.body.data as { id: string }[]).map((m) => m.id);
    expect(ids).not.toContain(member!.id);
  });

  // Uses 111.444.777-35 member created by MANAGER above
  it('PATCH /members/:id — previousState non-null in AuditLog (SC-004)', async () => {
    const member = await prisma.member.findFirst({ where: { cpf: '111.444.777-35' } });
    expect(member).not.toBeNull();

    await request(app.getHttpServer())
      .patch(`/api/v1/members/${member!.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notes: 'Atualizado' });

    // Allow async tap in AuditInterceptor to flush
    await new Promise((r) => setTimeout(r, 150));

    const log = await prisma.auditLog.findFirst({
      where: { entityType: 'member', entityId: member!.id, action: 'UPDATE' },
      orderBy: { createdAt: 'desc' },
    });

    expect(log).toBeDefined();
    expect(log!.previousState).not.toBeNull();
    expect(log!.newState).not.toBeNull();
  });
});
