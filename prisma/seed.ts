import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: 'zhk-sad' },
    update: {},
    create: {
      slug: 'zhk-sad',
      name: 'ЖК Сад',
      type: 'жк',
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
  .catch(console.error)
  .finally(() => prisma.$disconnect())
