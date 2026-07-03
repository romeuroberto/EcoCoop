import { PrismaClient, ProfileType, RouteStatus, VehicleType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const PHASE1_MODULES = ['COOPERATIVE', 'USERS', 'PROFILES', 'PERMISSIONS', 'AUDIT', 'DASHBOARD'];

const PHASE2_ADMIN_MODULES = [
  'MEMBER_ROLES',
  'MEMBERS',
  'MATERIALS',
  'UNITS',
  'BUYERS',
  'VEHICLES',
  'EPI_TYPES',
  'COST_CENTERS',
];

const PHASE2_MANAGER_MANAGE_MODULES = ['MEMBERS', 'BUYERS', 'VEHICLES'];
const PHASE2_MANAGER_READ_MODULES = ['MEMBER_ROLES', 'MATERIALS', 'UNITS', 'EPI_TYPES', 'COST_CENTERS'];

// Phase 3 modules
const PHASE3_ADMIN_MANAGE_MODULES = [
  'COLLECTION_POINTS',
  'COLLECTION_ROUTES',
  'ROUTE_TEMPLATES',
  'RAW_MATERIAL_ENTRIES',
  'RAW_MATERIAL_BALANCE',
];
const PHASE3_MANAGER_MANAGE_MODULES = ['COLLECTION_POINTS', 'COLLECTION_ROUTES', 'ROUTE_TEMPLATES', 'RAW_MATERIAL_ENTRIES'];
const PHASE3_MANAGER_READ_MODULES = ['RAW_MATERIAL_BALANCE'];

// Feature 006 — Triagem e Estoque Pronto
// READ + CREATE on SORTING: SORTER, MANAGER, ADMIN
// CANCEL on SORTING + CREATE_ADJUSTMENT on READY_STOCK: MANAGER, ADMIN only
const PHASE6_SORTER_PERMS = [
  { module: 'SORTING', action: 'READ' },
  { module: 'SORTING', action: 'CREATE' },
  { module: 'READY_STOCK', action: 'READ' },
];
const PHASE6_MANAGER_EXTRA_PERMS = [
  { module: 'SORTING', action: 'CANCEL' },
  { module: 'READY_STOCK', action: 'CREATE_ADJUSTMENT' },
];

// Feature 007 — Vendas Operacionais
const PHASE7_SALES_READ_PERMS = [
  { module: 'SALES', action: 'READ' },
];
const PHASE7_ACCOUNTS_RECEIVABLE_READ_PERMS = [
  { module: 'ACCOUNTS_RECEIVABLE', action: 'READ' },
];
const PHASE7_SALES_MANAGE_PERMS = [
  ...PHASE7_SALES_READ_PERMS,
  ...PHASE7_ACCOUNTS_RECEIVABLE_READ_PERMS,
  { module: 'SALES', action: 'CREATE' },
  { module: 'SALES', action: 'DELIVER' },
  { module: 'SALES', action: 'CANCEL' },
];

interface ProfileSeed {
  name: string;
  type: ProfileType;
  permissions: { module: string; action: string }[];
}

const PROFILES: ProfileSeed[] = [
  {
    name: 'Administrador',
    type: ProfileType.ADMIN,
    permissions: [
      ...PHASE1_MODULES.map((m) => ({ module: m, action: 'MANAGE' })),
      ...PHASE2_ADMIN_MODULES.map((m) => ({ module: m, action: 'MANAGE' })),
      ...PHASE3_ADMIN_MANAGE_MODULES.map((m) => ({ module: m, action: 'MANAGE' })),
      ...PHASE6_SORTER_PERMS,
      ...PHASE6_MANAGER_EXTRA_PERMS,
      ...PHASE7_SALES_MANAGE_PERMS,
    ],
  },
  {
    name: 'Gestor',
    type: ProfileType.MANAGER,
    permissions: [
      { module: 'COOPERATIVE', action: 'READ' },
      { module: 'USERS', action: 'READ' },
      { module: 'DASHBOARD', action: 'READ' },
      ...PHASE2_MANAGER_MANAGE_MODULES.map((m) => ({ module: m, action: 'MANAGE' })),
      ...PHASE2_MANAGER_READ_MODULES.map((m) => ({ module: m, action: 'READ' })),
      ...PHASE3_MANAGER_MANAGE_MODULES.map((m) => ({ module: m, action: 'MANAGE' })),
      ...PHASE3_MANAGER_READ_MODULES.map((m) => ({ module: m, action: 'READ' })),
      ...PHASE6_SORTER_PERMS,
      ...PHASE6_MANAGER_EXTRA_PERMS,
      ...PHASE7_SALES_MANAGE_PERMS,
    ],
  },
  {
    name: 'Triador',
    type: ProfileType.SORTER,
    permissions: [
      { module: 'DASHBOARD', action: 'READ' },
      ...PHASE6_SORTER_PERMS,
      ...PHASE7_SALES_READ_PERMS,
    ],
  },
  {
    name: 'Motorista',
    type: ProfileType.DRIVER,
    permissions: [
      { module: 'DASHBOARD', action: 'READ' },
      { module: 'COLLECTION_ROUTES', action: 'READ' },
      { module: 'COLLECTION_ROUTES', action: 'EXECUTE' },
      { module: 'RAW_MATERIAL_ENTRIES', action: 'CREATE' },
      ...PHASE7_SALES_READ_PERMS,
    ],
  },
  {
    name: 'Cooperado',
    type: ProfileType.MEMBER,
    permissions: [{ module: 'DASHBOARD', action: 'READ' }],
  },
  {
    name: 'Comprador',
    type: ProfileType.BUYER,
    permissions: [{ module: 'DASHBOARD', action: 'READ' }],
  },
];

const DEFAULT_MEMBER_ROLES = ['Triador', 'Motorista', 'Cooperado Geral', 'Coordenador', 'Outro'];

interface UnitSeed {
  name: string;
  symbol: string;
  aliases?: string[];
  baseSymbol?: string;
  conversionFactor?: number;
}

const DEFAULT_UNITS: UnitSeed[] = [
  { name: 'Quilograma', symbol: 'kg', aliases: ['Kg'] },
  { name: 'Grama', symbol: 'g', baseSymbol: 'kg', conversionFactor: 0.001 },
  { name: 'Tonelada', symbol: 't', baseSymbol: 'kg', conversionFactor: 1000 },
  { name: 'Litro', symbol: 'L' },
  { name: 'Mililitro', symbol: 'mL', baseSymbol: 'L', conversionFactor: 0.001 },
  { name: 'Metro cubico', symbol: 'm3' },
  { name: 'Unidade', symbol: 'un' },
];

const CRATEUS_ROUTE_POINTS = [
  {
    name: 'TEST-SEED Crateus 01 - Praca Gentil Cardoso',
    address: 'Praca Gentil Cardoso, Centro, Crateus-CE',
    latitude: -5.1787,
    longitude: -40.6775,
  },
  {
    name: 'TEST-SEED Crateus 02 - Igreja Matriz',
    address: 'Rua Dom Pedro II, Centro, Crateus-CE',
    latitude: -5.1779,
    longitude: -40.6758,
  },
  {
    name: 'TEST-SEED Crateus 03 - Mercado Central',
    address: 'Rua Coronel Zeze, Centro, Crateus-CE',
    latitude: -5.1806,
    longitude: -40.6751,
  },
  {
    name: 'TEST-SEED Crateus 04 - Rodoviaria',
    address: 'Avenida Sargento Herminio, Crateus-CE',
    latitude: -5.1819,
    longitude: -40.6712,
  },
  {
    name: 'TEST-SEED Crateus 05 - Bairro Sao Vicente',
    address: 'Rua Sao Vicente, Crateus-CE',
    latitude: -5.1851,
    longitude: -40.6694,
  },
  {
    name: 'TEST-SEED Crateus 06 - Bairro Fatima',
    address: 'Rua Frei Vidal, Fatima, Crateus-CE',
    latitude: -5.1883,
    longitude: -40.6732,
  },
  {
    name: 'TEST-SEED Crateus 07 - Bairro Venancios',
    address: 'Rua Jose Sabino, Venancios, Crateus-CE',
    latitude: -5.1872,
    longitude: -40.6803,
  },
  {
    name: 'TEST-SEED Crateus 08 - Bairro Cidade Nova',
    address: 'Avenida Edilberto Frota, Cidade Nova, Crateus-CE',
    latitude: -5.1835,
    longitude: -40.6849,
  },
  {
    name: 'TEST-SEED Crateus 09 - Bairro Planalto',
    address: 'Rua Planalto, Crateus-CE',
    latitude: -5.1768,
    longitude: -40.6868,
  },
  {
    name: 'TEST-SEED Crateus 10 - Universidade',
    address: 'Avenida Geraldo Marques Barbosa, Crateus-CE',
    latitude: -5.1729,
    longitude: -40.6816,
  },
];

async function seedProfiles(): Promise<Record<ProfileType, string>> {
  const profileMap = {} as Record<ProfileType, string>;

  for (const p of PROFILES) {
    let profile = await prisma.profile.findFirst({ where: { type: p.type, isCustom: false } });

    if (!profile) {
      profile = await prisma.profile.create({
        data: {
          name: p.name,
          type: p.type,
          isCustom: false,
          permissions: { create: p.permissions },
        },
      });
      console.log(`  Created profile: ${p.name}`);
    } else {
      for (const perm of p.permissions) {
        await prisma.profilePermission.upsert({
          where: {
            profileId_module_action: { profileId: profile.id, module: perm.module, action: perm.action },
          },
          create: { profileId: profile.id, module: perm.module, action: perm.action },
          update: {},
        });
      }
      console.log(`  Profile exists (permissions synced): ${p.name}`);
    }

    profileMap[p.type] = profile.id;
  }

  return profileMap;
}

async function removeRestrictedSalesPermissions(profileMap: Record<ProfileType, string>) {
  await prisma.profilePermission.deleteMany({
    where: {
      module: 'ACCOUNTS_RECEIVABLE',
      action: 'READ',
      profileId: {
        in: [profileMap[ProfileType.SORTER], profileMap[ProfileType.DRIVER]],
      },
    },
  });
}

async function seedMemberRoles() {
  console.log('Seeding default member roles...');
  for (const name of DEFAULT_MEMBER_ROLES) {
    const existing = await prisma.memberRole.findUnique({ where: { name } });
    if (!existing) {
      await prisma.memberRole.create({ data: { name, isDefault: true } });
      console.log(`  Created member role: ${name}`);
    } else {
      console.log(`  Member role exists: ${name}`);
    }
  }
}

async function seedUnits() {
  console.log('Seeding default units...');
  const unitBySymbol = new Map<string, string>();

  for (const unit of DEFAULT_UNITS.filter((u) => !u.baseSymbol)) {
    const existing = await prisma.unitOfMeasure.findFirst({
      where: { OR: [{ name: unit.name }, { symbol: { in: [unit.symbol, ...(unit.aliases ?? [])] } }] },
    });

    const saved = existing
      ? await prisma.unitOfMeasure.update({
          where: { id: existing.id },
          data: {
            name: unit.name,
            symbol: unit.symbol,
            baseUnitId: null,
            conversionFactor: null,
            isActive: true,
          },
        })
      : await prisma.unitOfMeasure.create({
          data: { name: unit.name, symbol: unit.symbol, isActive: true },
        });

    unitBySymbol.set(unit.symbol, saved.id);
    console.log(`  Unit ready: ${unit.name} (${unit.symbol})`);
  }

  for (const unit of DEFAULT_UNITS.filter((u) => u.baseSymbol)) {
    const baseUnitId = unitBySymbol.get(unit.baseSymbol!);
    if (!baseUnitId) throw new Error(`Base unit not found for ${unit.symbol}`);

    const existing = await prisma.unitOfMeasure.findFirst({
      where: { OR: [{ name: unit.name }, { symbol: { in: [unit.symbol, ...(unit.aliases ?? [])] } }] },
    });

    const saved = existing
      ? await prisma.unitOfMeasure.update({
          where: { id: existing.id },
          data: {
            name: unit.name,
            symbol: unit.symbol,
            baseUnitId,
            conversionFactor: unit.conversionFactor,
            isActive: true,
          },
        })
      : await prisma.unitOfMeasure.create({
          data: {
            name: unit.name,
            symbol: unit.symbol,
            baseUnitId,
            conversionFactor: unit.conversionFactor,
            isActive: true,
          },
        });

    unitBySymbol.set(unit.symbol, saved.id);
    console.log(`  Unit ready: ${unit.name} (${unit.symbol})`);
  }
}

async function seedCrateusRoute(profileMap: Record<ProfileType, string>) {
  console.log('Seeding Crateus test route...');

  const driverEmail = 'test.driver@ecocoop.local';
  let driver = await prisma.user.findUnique({ where: { email: driverEmail } });
  if (!driver) {
    const hash = await bcrypt.hash('driver123', 10);
    driver = await prisma.user.create({
      data: { email: driverEmail, passwordHash: hash, profileId: profileMap[ProfileType.DRIVER] },
    });
    console.log(`  Created driver: ${driverEmail}`);
  } else {
    console.log(`  Driver exists: ${driverEmail}`);
  }

  const vehicle = await prisma.vehicle.upsert({
    where: { plate: 'CRT0010' },
    create: {
      plate: 'CRT0010',
      type: VehicleType.VAN,
      model: 'TEST-SEED Van Crateus',
      isActive: true,
    },
    update: {
      type: VehicleType.VAN,
      model: 'TEST-SEED Van Crateus',
      isActive: true,
    },
  });
  console.log(`  Vehicle ready: ${vehicle.plate}`);

  const collectionPoints = [];
  for (const point of CRATEUS_ROUTE_POINTS) {
    const existing = await prisma.collectionPoint.findFirst({ where: { name: point.name } });
    const saved = existing
      ? await prisma.collectionPoint.update({
          where: { id: existing.id },
          data: {
            address: point.address,
            latitude: point.latitude,
            longitude: point.longitude,
            locationPending: false,
            isActive: true,
          },
        })
      : await prisma.collectionPoint.create({
          data: {
            name: point.name,
            address: point.address,
            latitude: point.latitude,
            longitude: point.longitude,
            locationPending: false,
            isActive: true,
          },
        });

    collectionPoints.push(saved);
  }
  console.log(`  Collection points ready: ${collectionPoints.length}`);

  const routeName = 'TEST-SEED Rota Crateus com 10 pontos';
  const plannedDate = new Date('2026-07-02T00:00:00.000Z');
  const existingRoute = await prisma.collectionRoute.findFirst({ where: { name: routeName } });

  const route = existingRoute
    ? await prisma.collectionRoute.update({
        where: { id: existingRoute.id },
        data: {
          plannedDate,
          status: RouteStatus.PLANEJADA,
          vehicleId: vehicle.id,
          driverId: driver.id,
          notes: 'Rota de teste para validar visualizacao de varios pontos no mapa.',
          routePoints: { deleteMany: {} },
        },
      })
    : await prisma.collectionRoute.create({
        data: {
          name: routeName,
          plannedDate,
          status: RouteStatus.PLANEJADA,
          vehicleId: vehicle.id,
          driverId: driver.id,
          notes: 'Rota de teste para validar visualizacao de varios pontos no mapa.',
        },
      });

  await prisma.routePoint.createMany({
    data: collectionPoints.map((point, index) => ({
      routeId: route.id,
      collectionPointId: point.id,
      sequence: index + 1,
    })),
  });

  console.log(`  Route ready: ${routeName}`);
}

async function main() {
  console.log('Seeding database...');

  let coop = await prisma.cooperative.findFirst();
  if (!coop) {
    coop = await prisma.cooperative.create({
      data: {
        name: 'EcoCoop',
        cnpj: '00.000.000/0001-00',
        settings: { create: { attendanceEnabled: false, rejectAlertDaysWithoutStatus: 30 } },
      },
    });
    console.log(`Created cooperative: ${coop.name}`);
  } else {
    console.log(`Cooperative exists: ${coop.name}`);
  }

  console.log('Seeding profiles...');
  const profileMap = await seedProfiles();
  await removeRestrictedSalesPermissions(profileMap);

  console.log('Seeding users...');
  const users = [
    { email: 'admin@ecocoop.local', password: 'admin123', profileType: ProfileType.ADMIN },
    { email: 'gestor@ecocoop.local', password: 'gestor123', profileType: ProfileType.MANAGER },
    { email: 'comprador@ecocoop.local', password: 'comprador123', profileType: ProfileType.BUYER },
  ];

  for (const u of users) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (!existing) {
      const hash = await bcrypt.hash(u.password, 10);
      await prisma.user.create({
        data: { email: u.email, passwordHash: hash, profileId: profileMap[u.profileType] },
      });
      console.log(`  Created user: ${u.email}`);
    } else {
      console.log(`  User exists: ${u.email}`);
    }
  }

  await seedMemberRoles();
  await seedUnits();
  await seedCrateusRoute(profileMap);

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
