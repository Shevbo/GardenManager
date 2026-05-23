import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: 'zhk-sad' },
    update: {},
    create: {
      slug: 'zhk-sad',
      name: 'ЖК Сад',
      type: 'zhk',
    },
  })
  console.log('Organization:', org.name)

  const admin = await prisma.user.upsert({
    where: { email: 'bshevelev75@gmail.com' },
    update: {},
    create: {
      email: 'bshevelev75@gmail.com',
      name: 'Борис Шевелёв',
      emailVerified: new Date(),
    },
  })

  await prisma.membership.upsert({
    where: { userId_orgId: { userId: admin.id, orgId: org.id } },
    update: {},
    create: {
      userId: admin.id,
      orgId: org.id,
      role: 'org_admin',
      isOwner: false,
    },
  })

  console.log('Admin:', admin.email)
  console.log('Seed complete.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
