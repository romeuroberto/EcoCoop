import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma.service';

describe('Material Subcategories (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let managerToken: string;
  let categoryId: string;
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

    const cat = await prisma.materialCategory.create({ data: { name: 'Test-Sub-Categoria' } });
    categoryId = cat.id;

    const unit = await prisma.unitOfMeasure.create({ data: { name: 'Test-kg-sub', symbol: 'tkgs' } });
    unitId = unit.id;

    const inactiveUnit = await prisma.unitOfMeasure.create({ data: { name: 'Test-kg-inactive', symbol: 'tkgi', isActive: false } });
    inactiveUnitId = inactiveUnit.id;
  });

  afterAll(async () => {
    await prisma.materialSubcategory.deleteMany({ where: { categoryId } });
    await prisma.materialCategory.delete({ where: { id: categoryId } });
    await prisma.unitOfMeasure.deleteMany({ where: { id: { in: [unitId, inactiveUnitId] } } });
    await app.close();
  });

  it('ADMIN POST /material-subcategories — creates subcategory (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/material-subcategories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ categoryId, name: 'Test-PET', defaultUnitId: unitId, isSellable: true, acceptsStock: true });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test-PET');
    expect(res.body.category).toBeDefined();
    expect(res.body.defaultUnit).toBeDefined();
  });

  it('POST same name in different category is allowed', async () => {
    const cat2 = await prisma.materialCategory.create({ data: { name: 'Test-Sub-Cat2' } });

    const res = await request(app.getHttpServer())
      .post('/api/v1/material-subcategories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ categoryId: cat2.id, name: 'Test-PET', defaultUnitId: unitId, isSellable: true, acceptsStock: true });

    await prisma.materialSubcategory.deleteMany({ where: { categoryId: cat2.id } });
    await prisma.materialCategory.delete({ where: { id: cat2.id } });

    expect(res.status).toBe(201);
  });

  it('POST same name in same category returns 409 SUBCATEGORY_NAME_CONFLICT_IN_CATEGORY', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/material-subcategories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ categoryId, name: 'Test-PET', defaultUnitId: unitId, isSellable: true, acceptsStock: true });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('SUBCATEGORY_NAME_CONFLICT_IN_CATEGORY');
  });

  it('POST with inactive defaultUnitId returns 400 UNIT_INACTIVE', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/material-subcategories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ categoryId, name: 'Test-HDPE', defaultUnitId: inactiveUnitId, isSellable: true, acceptsStock: true });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('UNIT_INACTIVE');
  });

  it('MANAGER POST /material-subcategories — returns 403', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/material-subcategories')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ categoryId, name: 'Test-LDPE', defaultUnitId: unitId, isSellable: false, acceptsStock: true });

    expect(res.status).toBe(403);
  });

  it('GET /material-subcategories — returns paginated envelope', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/material-subcategories')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('page', 1);
    expect(res.body).toHaveProperty('limit', 20);
  });

  it('GET /material-subcategories?categoryId= filters by category', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/material-subcategories?categoryId=${categoryId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect((res.body.data as { categoryId: string }[]).every((s) => s.categoryId === categoryId)).toBe(true);
  });
});
