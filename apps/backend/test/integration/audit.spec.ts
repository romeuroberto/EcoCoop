import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma.service';
import * as bcrypt from 'bcrypt';

describe('AuditInterceptor (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;

  const getToken = async (email: string, password: string): Promise<string> => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password });
    return (res.body as { accessToken: string }).accessToken;
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();
    prisma = app.get(PrismaService);
    adminToken = await getToken('admin@ecocoop.local', 'admin123');
  });

  afterAll(async () => {
    await prisma.user
      .deleteMany({ where: { email: { startsWith: 'audit.test.' } } })
      .catch(() => null);
    await app.close();
  });

  it('CREATE user — previousState is null, newState is populated', async () => {
    const profile = await prisma.profile.findFirst({ where: { isCustom: false } });
    expect(profile).toBeDefined();

    const res = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'audit.test.create@ecocoop.local',
        password: 'Test@123',
        profileId: profile!.id,
      });

    expect(res.status).toBe(201);
    const userId = (res.body as { id: string }).id;
    expect(userId).toBeDefined();

    // Allow async tap to flush
    await new Promise((r) => setTimeout(r, 150));

    const log = await prisma.auditLog.findFirst({
      where: { entityType: 'user', entityId: userId, action: 'CREATE' },
      orderBy: { createdAt: 'desc' },
    });

    expect(log).toBeDefined();
    expect(log!.previousState).toBeNull();
    expect(log!.newState).toBeDefined();
    expect(log!.newState).not.toBeNull();
  });

  it('PATCH user — previousState contains old email, newState contains new email', async () => {
    const profile = await prisma.profile.findFirst({ where: { isCustom: false } });
    const created = await prisma.user.create({
      data: {
        email: 'audit.test.patch.before@ecocoop.local',
        passwordHash: await bcrypt.hash('irrelevant', 4),
        profileId: profile!.id,
      },
    });

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/users/${created.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'audit.test.patch.after@ecocoop.local' });

    expect(res.status).toBe(200);

    await new Promise((r) => setTimeout(r, 150));

    const log = await prisma.auditLog.findFirst({
      where: { entityType: 'user', entityId: created.id, action: 'UPDATE' },
      orderBy: { createdAt: 'desc' },
    });

    expect(log).toBeDefined();
    expect(log!.previousState).not.toBeNull();
    const prev = log!.previousState as Record<string, unknown>;
    expect(prev['email']).toBe('audit.test.patch.before@ecocoop.local');
    expect(log!.newState).not.toBeNull();
    const next = log!.newState as Record<string, unknown>;
    expect(next['email']).toBe('audit.test.patch.after@ecocoop.local');
  });

  it('Auth login — POST /auth/login does not generate AuditLog', async () => {
    const countBefore = await prisma.auditLog.count();

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@ecocoop.local', password: 'admin123' });

    await new Promise((r) => setTimeout(r, 150));

    const countAfter = await prisma.auditLog.count();
    expect(countAfter).toBe(countBefore);
  });

  it('Auth refresh — POST /auth/refresh does not generate AuditLog', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@ecocoop.local', password: 'admin123' });
    const cookies = loginRes.headers['set-cookie'] as unknown as string[];
    const refreshCookie = Array.isArray(cookies) ? cookies[0] : (cookies as unknown as string);

    const countBefore = await prisma.auditLog.count();

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshCookie);

    await new Promise((r) => setTimeout(r, 150));

    const countAfter = await prisma.auditLog.count();
    expect(countAfter).toBe(countBefore);
  });
});
