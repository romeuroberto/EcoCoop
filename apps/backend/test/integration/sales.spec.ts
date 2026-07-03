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
  let managerUserId: string;
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

  const deliverSale = (id: string, body: object = {}) =>
    request(app.getHttpServer())
      .patch(`/api/v1/sales/${id}/deliver`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send(body);

  const cancelSale = (id: string, body: object = {}) =>
    request(app.getHttpServer())
      .delete(`/api/v1/sales/${id}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send(body);

  const listSales = (query: Record<string, string | number> = {}) =>
    request(app.getHttpServer())
      .get('/api/v1/sales')
      .set('Authorization', `Bearer ${managerToken}`)
      .query(query);

  const getSale = (id: string) =>
    request(app.getHttpServer())
      .get(`/api/v1/sales/${id}`)
      .set('Authorization', `Bearer ${managerToken}`);

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
    const manager = await prisma.user.findUniqueOrThrow({
      where: { email: 'gestor@ecocoop.local' },
      select: { id: true },
    });
    managerUserId = manager.id;

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

  it('PATCH /sales/:id/deliver — confirma entrega sem alterar estoque nem conta a receber', async () => {
    const createRes = await createSale({
      buyerId,
      items: [{ subcategoryId, unitId, quantity: 7, unitPrice: 2 }],
    });
    expect(createRes.status).toBe(201);
    createdSaleIds.push(createRes.body.id as string);

    const saleId = createRes.body.id as string;
    const beforeBalance = await getBalance(subcategoryId);
    const beforeEventCount = await prisma.readyStockEvent.count({ where: { saleId } });
    const deliveredAt = '2026-08-20T14:30:00.000Z';

    const res = await deliverSale(saleId, { deliveredAt });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: saleId,
      status: 'ENTREGUE',
      deliveredAt,
      deliveredBy: { id: managerUserId, email: 'gestor@ecocoop.local' },
    });

    const sale = await prisma.sale.findUniqueOrThrow({
      where: { id: saleId },
      include: { accountReceivable: true },
    });
    expect(sale.status).toBe('ENTREGUE');
    expect(sale.deliveredAt?.toISOString()).toBe(deliveredAt);
    expect(sale.deliveredById).toBe(managerUserId);
    expect(sale.accountReceivable?.status).toBe('A_RECEBER');

    expect(await getBalance(subcategoryId)).toBeCloseTo(beforeBalance, 3);
    await expect(prisma.readyStockEvent.count({ where: { saleId } })).resolves.toBe(beforeEventCount);
  });

  it('PATCH /sales/:id/deliver — venda inexistente retorna 404 SALE_NOT_FOUND', async () => {
    const res = await deliverSale('00000000-0000-4000-8000-000000000002');

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('SALE_NOT_FOUND');
  });

  it('PATCH /sales/:id/deliver — venda já ENTREGUE retorna 409 SALE_NOT_DELIVERABLE', async () => {
    const createRes = await createSale({
      buyerId,
      items: [{ subcategoryId, unitId, quantity: 3, unitPrice: 1 }],
    });
    expect(createRes.status).toBe(201);
    createdSaleIds.push(createRes.body.id as string);

    const saleId = createRes.body.id as string;
    const firstRes = await deliverSale(saleId);
    expect(firstRes.status).toBe(200);

    const secondRes = await deliverSale(saleId);
    expect(secondRes.status).toBe(409);
    expect(secondRes.body.code).toBe('SALE_NOT_DELIVERABLE');
  });

  it('PATCH /sales/:id/deliver — venda CANCELADA retorna 409 SALE_NOT_DELIVERABLE', async () => {
    const createRes = await createSale({
      buyerId,
      items: [{ subcategoryId, unitId, quantity: 4, unitPrice: 1 }],
    });
    expect(createRes.status).toBe(201);
    createdSaleIds.push(createRes.body.id as string);

    const saleId = createRes.body.id as string;
    await prisma.sale.update({
      where: { id: saleId },
      data: {
        status: 'CANCELADA',
        cancelReason: 'Preparação de cenário de teste',
        cancelledAt: new Date(),
        cancelledById: managerUserId,
      },
    });

    const res = await deliverSale(saleId);

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('SALE_NOT_DELIVERABLE');
  });

  it('DELETE /sales/:id — cancela venda, estorna estoque e cancela conta a receber', async () => {
    const createRes = await createSale({
      buyerId,
      items: [
        { subcategoryId, unitId, quantity: 8, unitPrice: 2 },
        { subcategoryId: secondSubcategoryId, unitId, quantity: 5, unitPrice: 3 },
      ],
    });
    expect(createRes.status).toBe(201);
    createdSaleIds.push(createRes.body.id as string);

    const saleId = createRes.body.id as string;
    const firstBalanceBeforeCancel = await getBalance(subcategoryId);
    const secondBalanceBeforeCancel = await getBalance(secondSubcategoryId);

    const res = await cancelSale(saleId, { cancelReason: 'Comprador desistiu da compra' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: saleId,
      status: 'CANCELADA',
      cancelReason: 'Comprador desistiu da compra',
      cancelledBy: { id: managerUserId, email: 'gestor@ecocoop.local' },
    });
    expect(res.body.cancelledAt).toBeDefined();

    const sale = await prisma.sale.findUniqueOrThrow({
      where: { id: saleId },
      include: { accountReceivable: true },
    });
    expect(sale.status).toBe('CANCELADA');
    expect(sale.cancelReason).toBe('Comprador desistiu da compra');
    expect(sale.cancelledAt).toBeDefined();
    expect(sale.cancelledById).toBe(managerUserId);
    expect(sale.accountReceivable?.status).toBe('CANCELADA');

    const reversalEvents = await prisma.readyStockEvent.findMany({
      where: { saleId, type: 'ESTORNO_VENDA' },
      orderBy: { createdAt: 'asc' },
    });
    expect(reversalEvents).toHaveLength(2);
    expect(reversalEvents.map((event) => Number(event.quantity)).sort((a, b) => a - b)).toEqual([
      5,
      8,
    ]);

    expect(await getBalance(subcategoryId)).toBeCloseTo(firstBalanceBeforeCancel + 8, 3);
    expect(await getBalance(secondSubcategoryId)).toBeCloseTo(secondBalanceBeforeCancel + 5, 3);

    await expect(prisma.sale.findUnique({ where: { id: saleId } })).resolves.toBeDefined();
    await expect(prisma.accountReceivable.findUnique({ where: { saleId } })).resolves.toBeDefined();
  });

  it('DELETE /sales/:id — motivo ausente ou em branco retorna 422 CANCEL_REASON_REQUIRED', async () => {
    const createRes = await createSale({
      buyerId,
      items: [{ subcategoryId, unitId, quantity: 2, unitPrice: 1 }],
    });
    expect(createRes.status).toBe(201);
    createdSaleIds.push(createRes.body.id as string);

    const saleId = createRes.body.id as string;

    const missingReason = await cancelSale(saleId, {});
    expect(missingReason.status).toBe(422);
    expect(missingReason.body.code).toBe('CANCEL_REASON_REQUIRED');

    const blankReason = await cancelSale(saleId, { cancelReason: '   ' });
    expect(blankReason.status).toBe(422);
    expect(blankReason.body.code).toBe('CANCEL_REASON_REQUIRED');
  });

  it('DELETE /sales/:id — venda inexistente retorna 404 SALE_NOT_FOUND', async () => {
    const res = await cancelSale('00000000-0000-4000-8000-000000000003', {
      cancelReason: 'Teste',
    });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('SALE_NOT_FOUND');
  });

  it('DELETE /sales/:id — venda ENTREGUE retorna 409 SALE_NOT_CANCELLABLE', async () => {
    const createRes = await createSale({
      buyerId,
      items: [{ subcategoryId, unitId, quantity: 2, unitPrice: 1 }],
    });
    expect(createRes.status).toBe(201);
    createdSaleIds.push(createRes.body.id as string);

    const saleId = createRes.body.id as string;
    await deliverSale(saleId);

    const res = await cancelSale(saleId, { cancelReason: 'Tentativa inválida' });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('SALE_NOT_CANCELLABLE');
  });

  it('DELETE /sales/:id — venda já CANCELADA retorna 409 SALE_NOT_CANCELLABLE', async () => {
    const createRes = await createSale({
      buyerId,
      items: [{ subcategoryId, unitId, quantity: 2, unitPrice: 1 }],
    });
    expect(createRes.status).toBe(201);
    createdSaleIds.push(createRes.body.id as string);

    const saleId = createRes.body.id as string;
    const firstCancel = await cancelSale(saleId, { cancelReason: 'Primeiro cancelamento' });
    expect(firstCancel.status).toBe(200);

    const secondCancel = await cancelSale(saleId, { cancelReason: 'Segundo cancelamento' });

    expect(secondCancel.status).toBe(409);
    expect(secondCancel.body.code).toBe('SALE_NOT_CANCELLABLE');
  });

  it('GET /sales — retorna lista paginada com campos básicos', async () => {
    const createRes = await createSale({
      buyerId,
      items: [{ subcategoryId, unitId, quantity: 2, unitPrice: 4 }],
    });
    expect(createRes.status).toBe(201);
    createdSaleIds.push(createRes.body.id as string);

    const res = await listSales({ page: 1, limit: 5 });

    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(5);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(res.body.data)).toBe(true);
    const sale = res.body.data.find((item: { id: string }) => item.id === createRes.body.id);
    expect(sale).toMatchObject({
      id: createRes.body.id,
      buyer: { id: buyerId },
      status: 'PENDENTE_ENTREGA',
      totalAmount: '8.00',
      itemsCount: 1,
      user: { email: 'gestor@ecocoop.local' },
    });
    expect(sale.createdAt).toBeDefined();
  });

  it('GET /sales — filtra por buyerId, status, subcategoryId e período', async () => {
    const pendingRes = await createSale({
      buyerId,
      items: [{ subcategoryId, unitId, quantity: 2, unitPrice: 1 }],
    });
    expect(pendingRes.status).toBe(201);
    createdSaleIds.push(pendingRes.body.id as string);

    const deliveredRes = await createSale({
      buyerId,
      items: [{ subcategoryId: secondSubcategoryId, unitId, quantity: 2, unitPrice: 1 }],
    });
    expect(deliveredRes.status).toBe(201);
    createdSaleIds.push(deliveredRes.body.id as string);
    await deliverSale(deliveredRes.body.id as string);

    const cancelledRes = await createSale({
      buyerId,
      items: [{ subcategoryId, unitId, quantity: 2, unitPrice: 1 }],
    });
    expect(cancelledRes.status).toBe(201);
    createdSaleIds.push(cancelledRes.body.id as string);
    await cancelSale(cancelledRes.body.id as string, { cancelReason: 'Filtro de teste' });

    const byBuyer = await listSales({ buyerId, limit: 100 });
    expect(byBuyer.status).toBe(200);
    expect(byBuyer.body.data.every((sale: { buyer: { id: string } }) => sale.buyer.id === buyerId)).toBe(true);

    const byStatus = await listSales({ status: 'ENTREGUE', limit: 100 });
    expect(byStatus.status).toBe(200);
    expect(byStatus.body.data.some((sale: { id: string }) => sale.id === deliveredRes.body.id)).toBe(true);
    expect(byStatus.body.data.every((sale: { status: string }) => sale.status === 'ENTREGUE')).toBe(true);

    const bySubcategory = await listSales({ subcategoryId: secondSubcategoryId, limit: 100 });
    expect(bySubcategory.status).toBe(200);
    expect(bySubcategory.body.data.some((sale: { id: string }) => sale.id === deliveredRes.body.id)).toBe(true);
    expect(bySubcategory.body.data.every((sale: { id: string }) => sale.id !== pendingRes.body.id)).toBe(true);

    const byPeriod = await listSales({ from: '2000-01-01', to: '2100-01-01', limit: 100 });
    expect(byPeriod.status).toBe(200);
    expect(byPeriod.body.data.some((sale: { id: string }) => sale.id === pendingRes.body.id)).toBe(true);
  });

  it('GET /sales/:id — retorna detalhe completo com timeline pendente', async () => {
    const createRes = await createSale({
      buyerId,
      notes: 'Detalhe pendente',
      items: [{ subcategoryId, unitId, quantity: 3, unitPrice: 2 }],
    });
    expect(createRes.status).toBe(201);
    createdSaleIds.push(createRes.body.id as string);

    const res = await getSale(createRes.body.id as string);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: createRes.body.id,
      buyer: { id: buyerId, documentNumber: expect.any(String) },
      status: 'PENDENTE_ENTREGA',
      totalAmount: '6.00',
      notes: 'Detalhe pendente',
      deliveredAt: null,
      deliveredBy: null,
      cancelReason: null,
      cancelledAt: null,
      cancelledBy: null,
      user: { email: 'gestor@ecocoop.local' },
      accountReceivable: { amount: '6.00', status: 'A_RECEBER' },
    });
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({
      subcategory: { id: subcategoryId },
      unit: { id: unitId },
      quantity: '3.000',
      unitPrice: '2.0000',
      subtotal: '6.00',
    });
    expect(res.body.timeline).toEqual([
      { event: 'CREATED', at: expect.any(String), by: { id: managerUserId, email: 'gestor@ecocoop.local' } },
      { event: 'DELIVERED', at: null, by: null },
      { event: 'CANCELLED', at: null, by: null },
    ]);
  });

  it('GET /sales/:id — timeline reflete entrega e cancelamento quando ocorrerem', async () => {
    const deliveredRes = await createSale({
      buyerId,
      items: [{ subcategoryId, unitId, quantity: 2, unitPrice: 2 }],
    });
    expect(deliveredRes.status).toBe(201);
    createdSaleIds.push(deliveredRes.body.id as string);
    await deliverSale(deliveredRes.body.id as string, { deliveredAt: '2026-08-21T10:00:00.000Z' });

    const deliveredDetail = await getSale(deliveredRes.body.id as string);
    expect(deliveredDetail.status).toBe(200);
    expect(deliveredDetail.body.timeline[1]).toEqual({
      event: 'DELIVERED',
      at: '2026-08-21T10:00:00.000Z',
      by: { id: managerUserId, email: 'gestor@ecocoop.local' },
    });
    expect(deliveredDetail.body.timeline[2]).toEqual({ event: 'CANCELLED', at: null, by: null });

    const cancelledRes = await createSale({
      buyerId,
      items: [{ subcategoryId, unitId, quantity: 2, unitPrice: 2 }],
    });
    expect(cancelledRes.status).toBe(201);
    createdSaleIds.push(cancelledRes.body.id as string);
    await cancelSale(cancelledRes.body.id as string, { cancelReason: 'Timeline cancelada' });

    const cancelledDetail = await getSale(cancelledRes.body.id as string);
    expect(cancelledDetail.status).toBe(200);
    expect(cancelledDetail.body.cancelReason).toBe('Timeline cancelada');
    expect(cancelledDetail.body.accountReceivable.status).toBe('CANCELADA');
    expect(cancelledDetail.body.timeline[1]).toEqual({ event: 'DELIVERED', at: null, by: null });
    expect(cancelledDetail.body.timeline[2]).toMatchObject({
      event: 'CANCELLED',
      at: expect.any(String),
      by: { id: managerUserId, email: 'gestor@ecocoop.local' },
    });
  });

  it('GET /sales/:id — venda inexistente retorna 404 SALE_NOT_FOUND', async () => {
    const res = await getSale('00000000-0000-4000-8000-000000000004');

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('SALE_NOT_FOUND');
  });
});
