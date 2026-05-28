import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const EMAILS = [
  'bshevelev@mail.ru',
  'bshevelev75@gmail.com',
  'test1@garden.local',
  'test2@garden.local',
  'test3@garden.local',
  'test4@garden.local',
  'test5@garden.local',
]

async function main() {
  for (const email of EMAILS) {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) { console.log(`  ${email}: not found, skipping`); continue }
    if (user.phoneVerified) { console.log(`  ${email}: already verified`); continue }
    await prisma.user.update({
      where: { id: user.id },
      data: {
        phone: user.phone ?? `+7900000000${EMAILS.indexOf(email)}`,
        phoneVerified: new Date(),
      },
    })
    console.log(`  ${email}: phone marked verified`)
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
