import { PrismaClient, ProfileType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const PHASE1_MODULES = ['COOPERATIVE', 'USERS', 'PROFILES', 'PERMISSIONS', 'AUDIT', 'DASHBOARD'];

interface ProfileSeed {
  name: string;
  type: ProfileType;
  permissions: { module: string; action: string }[];
}

const PROFILES: ProfileSeed[] = [
  {
    name: 'Administrador',
    type: ProfileType.ADMIN,
    permissions: PHASE1_MODULES.map((m) => ({ module: m, action: 'MANAGE' })),
  },
  {
    name: 'Gestor',
    type: ProfileType.MANAGER,
    permissions: [
      { module: 'COOPERATIVE', action: 'READ' },
      { module: 'USERS', action: 'READ' },
      { module: 'DASHBOARD', action: 'READ' },
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
    permissions: [{ module: 'DASHBOARD', action: 'READ' }],
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
      console.log(`  Profile exists: ${p.name}`);
    }

    profileMap[p.type] = profile.id;
  }

  return profileMap;
}

async function main() {
  console.log('Seeding database...');

  // 1. Cooperative placeholder (singleton)
  let coop = await prisma.cooperative.findFirst();
  if (!coop) {
    coop = await prisma.cooperative.create({
      data: {
        name: 'EcoCoop',
        cnpj: '00.000.000/0001-00',
        settings: {
          create: {
            attendanceEnabled: false,
            rejectAlertDaysWithoutStatus: 30,
          },
        },
      },
    });
    console.log(`Created cooperative: ${coop.name}`);
  } else {
    console.log(`Cooperative exists: ${coop.name}`);
  }

  // 2. Profiles + Phase 1 permissions (no STOCK, SORTING, ROUTES, SALES, FINANCE, etc.)
  console.log('Seeding profiles...');
  const profileMap = await seedProfiles();

  // 3. Default users with bcrypt-hashed passwords — never plain text
  console.log('Seeding users...');
  const users = [
    { email: 'admin@ecocoop.local', password: 'admin123', profileType: ProfileType.ADMIN },
    { email: 'gestor@ecocoop.local', password: 'gestor123', profileType: ProfileType.MANAGER },
  ];

  for (const u of users) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (!existing) {
      const hash = await bcrypt.hash(u.password, 10);
      await prisma.user.create({
        data: {
          email: u.email,
          passwordHash: hash,
          profileId: profileMap[u.profileType],
        },
      });
      console.log(`  Created user: ${u.email}`);
    } else {
      console.log(`  User exists: ${u.email}`);
    }
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
