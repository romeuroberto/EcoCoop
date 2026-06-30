import { PrismaClient, ProfileType } from '@prisma/client';
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
  'RAW_MATERIAL_ENTRIES',
  'RAW_MATERIAL_BALANCE',
];
const PHASE3_MANAGER_MANAGE_MODULES = ['COLLECTION_POINTS', 'COLLECTION_ROUTES', 'RAW_MATERIAL_ENTRIES'];
const PHASE3_MANAGER_READ_MODULES = ['RAW_MATERIAL_BALANCE'];

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
    ],
  },
  {
    name: 'Triador',
    type: ProfileType.SORTER,
    permissions: [{ module: 'DASHBOARD', action: 'READ' }],
  },
  {
    name: 'Motorista',
    type: ProfileType.DRIVER,
    permissions: [
      { module: 'DASHBOARD', action: 'READ' },
      { module: 'COLLECTION_ROUTES', action: 'READ' },
      { module: 'COLLECTION_ROUTES', action: 'EXECUTE' },
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

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
