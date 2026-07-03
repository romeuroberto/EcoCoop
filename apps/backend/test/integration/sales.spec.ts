import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma.service';

describe('Sales (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let managerToken: string;
  let sorterUserId: string;
  let buyerId: string;
  let inactiveBuyerId: string;
  let subcategoryId: string;
  let secondSubcategoryId: string;
  let unitId: string;
  const createdSaleIds: string[] = [];

  const login = async (email: string, password: string) => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password });
    return (res.body as { accessToken: string }).accessToken;
  };

  const createSale = (body: object) =>
    request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${managerToken}`)
      .send(body);

  const seedReadyStock = async (subcategory: string, quantity: number) => {
    await prisma.readyStockEvent.create({
      data: {
        type: 'TRIAGEM_OUTPUT',
        subcategoryId: subcategory,
        unitId,
        quantity,
        userId: sorterUserId,
      },
    });
  };

  const getBalance = async (subcategory: string) => {
    const result = await prisma.readyStockEvent.aggregate({
      where: { subcategoryId: subcategory, unitId },
      _sum: { quantity: true },
    });
    return Number(result._sum.quantity ?? 0);
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();
    prisma = app.get(PrismaService);

    managerToken = await login('gestor@ecocoop.local', 'gestor123');

    const hash = await bcrypt.hash('pwd123', 10);
    const sorterProfile = await prisma.profile.findFirstOrThrow({
      where: { type: 'SORTER', isCustom: false },
    });
    const sorter = await prisma.user.upsert({
      where: { email: 'sorter-sales-test@ecocoop.local' },
      create: {
        email: 'sorter-sales-test@ecocoop.local',
        passwordHash: hash,
        profileId: sorterProfile.id,
      },
      update: {},
    });
    sorterUserId = sorter.id;

    const category = await prisma.materialCategory.findFirstOrThrow();
    const unit = await prisma.unitOfMeasure.findFirstOrThrow({ where: { isActive: true } });
    unitId = unit.id;

    const suffix = Date.now();
    const subcategory = await prisma.materialSubcategory.create({
      data: {
        name: `SALE-READY-${suffix}`,
        categoryId: category.id,
        defaultUnitId: unitId,
        isActive: true,
        isSellable: true,
        acceptsStock: true,
      },
    });
    subcategoryId = subcategory.id;

    const secondSubcategory = await prisma.materialSubcategory.create({
      data: {
        name: `SALE-READY-SECOND-${suffix}`,
        categoryId: category.id,
        defaultUnitId: unitId,
        isActive: true,
        isSellable: true,
        acceptsStock: true,
      },
    });
    secondSubcategoryId = secondSubcategory.id;

    const buyer = await prisma.buyer.create({
      data: {
        legalName: `SALE Buyer ${suffix}`,
        documentType: 'CNPJ',
        documentNumber: `SALE${suffix}`,
        isActive: true,
      },
    });
    buyerId = buyer.id;

    const inactiveBuyer = await prisma.buyer.create({
      data: {
        legalName: `SALE Inactive Buyer ${suffix}`,
        documentType: 'CNPJ',
        documentNumber: `SALE-INACTIVE-${suffix}`,
        isActive: false,
      },
    });
    inactiveBuyerId = inactiveBuyer.id;

    await seedReadyStock(subcategoryId, 300);
    await seedReadyStock(secondSubcategoryId, 120);
  });

  afterAll(async () => {
    if (!prisma) {
      if (app) await app.close();
      return;
    }

    await prisma.auditLog.deleteMany({ where: { entityId: { in: createdSaleIds } } });
    await prisma.accountReceivable.deleteMany({ where: { saleId: { in: createdSaleIds } } });
    await prisma.readyStockEvent.deleteMany({
      where: {
        OR: [
          { saleId: { in: createdSaleIds } },
          { subcategoryId: { in: [subcategoryId, secondSubcategoryId].filter(Boolean) } },
        ],
      },
    });
    await prisma.saleItem.deleteMany({ where: { saleId: { in: createdSaleIds } } });
    await prisma.sale.deleteMany({ where: { id: { in: createdSaleIds } } });
    await prisma.buyer.deleteMany({
      where: { id: { in: [buyerId, inactiveBuyerId].filter(Boolean) } },
    });
    await prisma.materialSubcategory.deleteMany({
      where: { id: { in: [subcategoryId, secondSubcategoryId].filter(Boolean) } },
    });
    await prisma.auditLog.deleteMany({ where: { userId: sorterUserId } });
    await prisma.user.deleteMany({ where: { id: sorterUserId } });
    await app.close();
  });

  it('POST /sales — cria venda com 1 item, baixa estoque pronto e cria conta a receber', async () => {
    const beforeBalance = await getBalance(subcategoryId);

    const res = await createSale({
      buyerId,
      notes: 'Venda operacional de teste',
      items: [{ subcategoryId, unitId, quantity: 25, unitPrice: 2.5 }],
    });

    expect(res.status).toBe(201);
    createdSaleIds.push(res.body.id as string);
    expect(res.body.status).toBe('PENDENTE_ENTREGA');
    expect(res.body.buyer).toMatchObject({ id: buyerId });
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({
      subcategory: { id: subcategoryId },
      unit: { id: unitId },
      quantity: '25.000',
      unitPrice: '2.5000',
      subtotal: '62.50',
    });
    expect(res.body.totalAmount).toBe('62.50');
    expect(res.body.accountReceivable).toMatchObject({
      amount: '62.50',
      status: 'A_RECEBER',
    });

    const sale = await prisma.sale.findUnique({
      where: { id: res.body.id as string },
      include: { items: true, accountReceivable: true, readyStockEvents: true },
    });
    expect(sale).toBeDefined();
    expect(sale!.items).toHaveLength(1);
    expect(sale!.accountReceivable).toBeDefined();
    expect(sale!.readyStockEvents).toHaveLength(1);
    expect(sale!.readyStockEvents[0].type).toBe('VENDA');
    expect(Number(sale!.readyStockEvents[0].quantity)).toBeCloseTo(-25, 3);

    const afterBalance = await getBalance(subcategoryId);
    expect(afterBalance).toBeCloseTo(beforeBalance - 25, 3);
  });

  it('POST /sales — cria venda com múltiplos itens e soma subtotais', async () => {
    const res = await createSale({
      buyerId,
      dueDate: '2026-08-15',
      items: [
        { subcategoryId, unitId, quantity: 10, unitPrice: 1.25 },
        { subcategoryId: secondSubcategoryId, unitId, quantity: 12, unitPrice: 3 },
      ],
    });

    expect(res.status).toBe(201);
    createdSaleIds.push(res.body.id as string);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.totalAmount).toBe('48.50');
    expect(res.body.accountReceivable).toMatchObject({
      amount: '48.50',
      dueDate: '2026-08-15',
      status: 'A_RECEBER',
    });

    const events = await prisma.readyStockEvent.findMany({
      where: { saleId: res.body.id as string },
      orderBy: { createdAt: 'asc' },
    });
    expect(events).toHaveLength(2);
    expect(events.every((event) => event.type === 'VENDA')).toBe(true);
    expect(events.map((event) => Number(event.quantity)).sort((a, b) => a - b)).toEqual([-12, -10]);
  });

  it('POST /sales — permite unitPrice igual a zero', async () => {
    const res = await createSale({
      buyerId,
      items: [{ subcategoryId, unitId, quantity: 1, unitPrice: 0 }],
    });

    expect(res.status).toBe(201);
    createdSaleIds.push(res.body.id as string);
    expect(res.body.items[0].unitPrice).toBe('0.0000');
    expect(res.body.items[0].subtotal).toBe('0.00');
    expect(res.body.totalAmount).toBe('0.00');
  });

  it('POST /sales — buyer inexistente retorna 404 BUYER_NOT_FOUND', async () => {
    const res = await createSale({
      buyerId: '00000000-0000-4000-8000-000000000001',
      items: [{ subcategoryId, unitId, quantity: 5, unitPrice: 1 }],
    });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('BUYER_NOT_FOUND');
  });

  it('POST /sales — buyer inativo retorna 409 BUYER_INACTIVE', async () => {
    const res = await createSale({
      buyerId: inactiveBuyerId,
      items: [{ subcategoryId, unitId, quantity: 5, unitPrice: 1 }],
    });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('BUYER_INACTIVE');
  });

  it('POST /sales — saldo insuficiente retorna 409 INSUFFICIENT_READY_STOCK', async () => {
    const beforeBalance = await getBalance(subcategoryId);

    const res = await createSale({
      buyerId,
      items: [{ subcategoryId, unitId, quantity: 9999, unitPrice: 1 }],
    });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('INSUFFICIENT_READY_STOCK');
    expect(res.body.details.subcategoryId).toBe(subcategoryId);
    expect(await getBalance(subcategoryId)).toBeCloseTo(beforeBalance, 3);
  });

  it('POST /sales — saldo insuficiente em 1 de 2 itens não altera saldos', async () => {
    const beforeFirstBalance = await getBalance(subcategoryId);
    const beforeSecondBalance = await getBalance(secondSubcategoryId);

    const res = await createSale({
      buyerId,
      items: [
        { subcategoryId, unitId, quantity: 5, unitPrice: 1 },
        { subcategoryId: secondSubcategoryId, unitId, quantity: 9999, unitPrice: 1 },
      ],
    });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('INSUFFICIENT_READY_STOCK');
    expect(await getBalance(subcategoryId)).toBeCloseTo(beforeFirstBalance, 3);
    expect(await getBalance(secondSubcategoryId)).toBeCloseTo(beforeSecondBalance, 3);
  });
});
