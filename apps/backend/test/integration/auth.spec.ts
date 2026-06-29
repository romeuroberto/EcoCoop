import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma.service';

describe('Auth (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/v1/auth/login — correct credentials returns accessToken + profile + redirectTo', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@ecocoop.local', password: 'admin123' });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.profile).toBe('ADMIN');
    expect(res.body.redirectTo).toBe('/dashboard');
  });

  it('POST /api/v1/auth/login — wrong password returns 401 INVALID_CREDENTIALS', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@ecocoop.local', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('POST /api/v1/auth/login — unknown email returns 401 INVALID_CREDENTIALS', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@ecocoop.local', password: 'anypassword' });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('GET /api/v1/auth/me — expired/missing token returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalidtoken');

    expect(res.status).toBe(401);
  });

  it('POST /api/v1/auth/refresh — valid cookie returns new accessToken', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@ecocoop.local', password: 'admin123' });

    const cookies = loginRes.headers['set-cookie'] as unknown as string[];
    expect(cookies).toBeDefined();

    const refreshCookie = Array.isArray(cookies) ? cookies[0] : (cookies as unknown as string);

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshCookie);

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });

  it('POST /api/v1/auth/refresh — invalid/missing cookie returns 401', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/auth/refresh');
    expect(res.status).toBe(401);
  });

  it('POST /api/v1/auth/login — inactive user returns 401 ACCOUNT_DISABLED', async () => {
    // Deactivate the gestor user temporarily
    const user = await prisma.user.findUnique({ where: { email: 'gestor@ecocoop.local' } });
    if (user) {
      await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });
    }

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'gestor@ecocoop.local', password: 'gestor123' });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('ACCOUNT_DISABLED');

    // Restore
    if (user) {
      await prisma.user.update({ where: { id: user.id }, data: { isActive: true } });
    }
  });

  it('GET /api/v1/auth/me — returns authenticated user data', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@ecocoop.local', password: 'admin123' });

    const { accessToken } = loginRes.body as { accessToken: string };

    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('admin@ecocoop.local');
    expect(res.body.passwordHash).toBeUndefined();
  });
});
