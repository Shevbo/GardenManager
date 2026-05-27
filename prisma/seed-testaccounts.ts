import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const TEST_ORG_SLUG = 'zhk-test'
const ACCOUNTS = [
  { email: 'test1@garden.local', otp: '111111', name: 'Тестов Иван (председатель)',    role: 'org_admin' as const,      address: 'ул. Тестовая, 1, кв. 10' },
  { email: 'test2@garden.local', otp: '222222', name: 'Тестова Анна (член совета)',    role: 'council_member' as const, address: 'ул. Тестовая, 1, кв. 20' },
  { email: 'test3@garden.local', otp: '333333', name: 'Сидоров Пётр (собственник)',    role: 'owner' as const,          address: 'ул. Тестовая, 1, кв. 30' },
  { email: 'test4@garden.local', otp: '444444', name: 'Кузнецова Ольга (собственник)', role: 'owner' as const,          address: 'ул. Тестовая, 1, кв. 40' },
  { email: 'test5@garden.local', otp: '555555', name: 'Морозов Сергей (собственник)',  role: 'owner' as const,          address: 'ул. Тестовая, 1, кв. 50' },
]

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: TEST_ORG_SLUG },
    update: {},
    create: { slug: TEST_ORG_SLUG, name: 'ЖК Тестовый', type: 'zhk' },
  })
  console.log('Test org:', org.name, org.id)

  for (const acc of ACCOUNTS) {
    const user = await prisma.user.upsert({
      where: { email: acc.email },
      update: { name: acc.name, address: acc.address, emailVerified: new Date() },
      create: { email: acc.email, name: acc.name, address: acc.address, emailVerified: new Date() },
    })

    const existingMembership = await prisma.membership.findFirst({
      where: { userId: user.id, orgId: org.id },
    })
    if (!existingMembership) {
      await prisma.membership.create({
        data: { userId: user.id, orgId: org.id, role: acc.role, isOwner: acc.role === 'owner' },
      })
    } else if (existingMembership.role !== acc.role) {
      await prisma.membership.update({
        where: { id: existingMembership.id },
        data: { role: acc.role, isOwner: acc.role === 'owner' },
      })
    }

    await prisma.verificationToken.deleteMany({ where: { identifier: acc.email } })
    await prisma.verificationToken.create({
      data: {
        identifier: acc.email,
        token: acc.otp,
        expires: new Date('2099-12-31T23:59:59Z'),
      },
    })

    console.log(`  ${acc.email}  role=${acc.role}  otp=${acc.otp}`)
  }

  console.log('Test accounts seeded. Each user has a unique permanent OTP.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
