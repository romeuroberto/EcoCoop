import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma.service';

describe('Member Roles (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let managerToken: string;

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
  });

  afterAll(async () => {
    await prisma.memberRole.deleteMany({ where: { isDefault: false, name: { startsWith: 'Test-' } } });
    await app.close();
  });

  it('GET /member-roles — returns paginated envelope with active roles', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/member-roles')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('page', 1);
    expect(res.body).toHaveProperty('limit', 20);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('ADMIN POST /member-roles — creates new role (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/member-roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test-Administrativo' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test-Administrativo');
    expect(res.body.isDefault).toBe(false);
  });

  it('ADMIN POST /member-roles — duplicate name returns 409 MEMBER_ROLE_NAME_CONFLICT', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/member-roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test-Administrativo' });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('MEMBER_ROLE_NAME_CONFLICT');
  });

  it('MANAGER POST /member-roles — returns 403', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/member-roles')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ name: 'Test-Qualquer' });

    expect(res.status).toBe(403);
  });

  it('ADMIN PATCH isDefault role name — returns 422 MEMBER_ROLE_DEFAULT_RENAME_BLOCKED', async () => {
    const listRes = await request(app.getHttpServer())
      .get('/api/v1/member-roles?status=all')
      .set('Authorization', `Bearer ${adminToken}`);
    const defaultRole = (listRes.body.data as { isDefault: boolean; id: string }[]).find((r) => r.isDefault);
    expect(defaultRole).toBeDefined();

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/member-roles/${defaultRole!.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'NomeNovo' });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('MEMBER_ROLE_DEFAULT_RENAME_BLOCKED');
  });

  it('ADMIN PATCH /member-roles/:id — inactivate role sets isActive false', async () => {
    const listRes = await request(app.getHttpServer())
      .get('/api/v1/member-roles?search=Test-Administrativo&status=all')
      .set('Authorization', `Bearer ${adminToken}`);
    const role = (listRes.body.data as { id: string }[])[0];

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/member-roles/${role.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });

    expect(res.status).toBe(200);
    expect(res.body.isActive).toBe(false);
  });
});
