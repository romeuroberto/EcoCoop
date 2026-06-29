import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma.service';
import * as bcrypt from 'bcrypt';
import { ProfileType } from '@prisma/client';

describe('RBAC Permissions Matrix (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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

    // Create test users for each profile type
    const profiles = await prisma.profile.findMany({ where: { isCustom: false } });
    for (const profile of profiles) {
      const email = `test.${profile.type.toLowerCase()}@ecocoop.local`;
      const existing = await prisma.user.findUnique({ where: { email } });
      if (!existing) {
        await prisma.user.create({
          data: {
            email,
            passwordHash: await bcrypt.hash('Test@123', 10),
            profileId: profile.id,
          },
        });
      }
    }
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { contains: 'test.' } },
    });
    await app.close();
  });

  it('ADMIN can access GET /api/v1/users', async () => {
    const token = await getToken('admin@ecocoop.local', 'admin123');
    const res = await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('ADMIN can access GET /api/v1/profiles', async () => {
    const token = await getToken('admin@ecocoop.local', 'admin123');
    const res = await request(app.getHttpServer())
      .get('/api/v1/profiles')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('SORTER receives 403 on POST /api/v1/users', async () => {
    const token = await getToken(`test.${ProfileType.SORTER.toLowerCase()}@ecocoop.local`, 'Test@123');
    const res = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'x@x.com', password: 'pass1234', profileId: '00000000-0000-0000-0000-000000000000' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('UNAUTHORIZED_PROFILE');
  });

  it('BUYER receives 403 on GET /api/v1/users', async () => {
    const token = await getToken(`test.${ProfileType.BUYER.toLowerCase()}@ecocoop.local`, 'Test@123');
    const res = await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('UNAUTHORIZED_PROFILE');
  });

  it('BUYER login returns redirectTo: "/portal"', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: `test.${ProfileType.BUYER.toLowerCase()}@ecocoop.local`, password: 'Test@123' });
    expect(res.status).toBe(200);
    expect(res.body.redirectTo).toBe('/portal');
  });

  it('unauthenticated request returns 401', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/users');
    expect(res.status).toBe(401);
  });

  it('MANAGER cannot POST /api/v1/users (no CREATE permission)', async () => {
    const token = await getToken(`test.${ProfileType.MANAGER.toLowerCase()}@ecocoop.local`, 'Test@123');
    const res = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'x2@x.com', password: 'pass1234', profileId: '00000000-0000-0000-0000-000000000000' });
    expect(res.status).toBe(403);
  });
});
