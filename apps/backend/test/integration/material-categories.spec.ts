import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma.service';

describe('Material Categories (integration)', () => {
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

    // Pre-clean any leftover state from previous aborted runs
    await prisma.materialSubcategory.deleteMany({ where: { name: { startsWith: 'Test-' } } });
    await prisma.materialCategory.deleteMany({ where: { name: { startsWith: 'Test-' } } });
    await prisma.unitOfMeasure.deleteMany({ where: { name: 'Test-kg-cat' } });
  });

  afterAll(async () => {
    await prisma.materialSubcategory.deleteMany({ where: { category: { name: { startsWith: 'Test-' } } } });
    await prisma.materialCategory.deleteMany({ where: { name: { startsWith: 'Test-' } } });
    await prisma.unitOfMeasure.deleteMany({ where: { name: 'Test-kg-cat' } });
    await app.close();
  });

  it('ADMIN POST /material-categories — creates category (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/material-categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test-Plástico', description: 'Materiais plásticos' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test-Plástico');
    expect(res.body.isActive).toBe(true);
  });

  it('POST /material-categories — duplicate name returns 409 CATEGORY_NAME_CONFLICT', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/material-categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test-Plástico' });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CATEGORY_NAME_CONFLICT');
  });

  it('MANAGER POST /material-categories — returns 403', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/material-categories')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ name: 'Test-Qualquer' });

    expect(res.status).toBe(403);
  });

  it('PATCH /material-categories/:id — deactivate with active subcategories returns 422', async () => {
    // upsert avoids unique constraint if a previous run left this unit in the DB
    const unit = await prisma.unitOfMeasure.upsert({
      where: { name: 'Test-kg-cat' },
      create: { name: 'Test-kg-cat', symbol: 'tkg' },
      update: {},
    });
    const cat = await prisma.materialCategory.findFirst({ where: { name: 'Test-Plástico' } });
    await prisma.materialSubcategory.upsert({
      where: { categoryId_name: { categoryId: cat!.id, name: 'Test-PET' } },
      create: { categoryId: cat!.id, name: 'Test-PET', defaultUnitId: unit.id, isSellable: true, acceptsStock: true },
      update: { isActive: true },
    });

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/material-categories/${cat!.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('CANNOT_DEACTIVATE_CATEGORY_WITH_ACTIVE_SUBCATEGORIES');
    expect(Array.isArray(res.body.details)).toBe(true);
    expect(res.body.details).toContain('Test-PET');

    // Cleanup inline so subsequent tests are not affected
    await prisma.materialSubcategory.deleteMany({ where: { categoryId: cat!.id } });
    await prisma.unitOfMeasure.delete({ where: { id: unit.id } });
  });

  it('PATCH /material-categories/:id — deactivate without active subcategories succeeds (200)', async () => {
    const cat2 = await prisma.materialCategory.create({ data: { name: 'Test-Vidro' } });

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/material-categories/${cat2.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });

    expect(res.status).toBe(200);
    expect(res.body.isActive).toBe(false);
  });

  it('PATCH /material-categories/:id — previousState non-null in AuditLog (SC-004)', async () => {
    const cat = await prisma.materialCategory.findFirst({ where: { name: 'Test-Plástico' } });
    expect(cat).not.toBeNull();

    const patchRes = await request(app.getHttpServer())
      .patch(`/api/v1/material-categories/${cat!.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ description: 'Atualizado' });

    expect(patchRes.status).toBe(200);

    // Allow async tap in AuditInterceptor to flush
    await new Promise((r) => setTimeout(r, 150));

    const log = await prisma.auditLog.findFirst({
      where: { entityType: 'materialCategory', entityId: cat!.id, action: 'UPDATE' },
      orderBy: { createdAt: 'desc' },
    });

    expect(log).toBeDefined();
    expect(log!.previousState).not.toBeNull();
    expect(log!.newState).not.toBeNull();
  });

  it('GET /material-categories — returns paginated envelope', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/material-categories')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('page', 1);
    expect(res.body).toHaveProperty('limit', 20);
  });
});
