// Очистка тестовых данных Garden Manager перед production-запуском.
// Usage:  DATABASE_URL='postgresql://...' npx tsx scripts/cleanup-test-data.ts
//
// Удаляет:
//  - тестовых пользователей test1..test5@garden.local + их membership/верификации/реакции/подписи/декларации
//  - тестовый Building "test-bld-1" + Apartment в нём
//  - орг-цию "ЖК Тестовый" (slug=zhk-test) если у неё нет других участников/петиций
// НЕ удаляет: bshevelev@mail.ru, bshevelev75@gmail.com и связанные с ними orgs (это могут быть боевые данные).

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const TEST_EMAILS = [
  'test1@garden.local',
  'test2@garden.local',
  'test3@garden.local',
  'test4@garden.local',
  'test5@garden.local',
]

async function main() {
  console.log('=== Cleanup test data ===\n')

  // Stage 1 — collect ids
  const users = await prisma.user.findMany({ where: { email: { in: TEST_EMAILS } } })
  console.log(`Test users: ${users.length}`)
  if (users.length === 0) {
    console.log('(nothing to do)')
    return
  }

  const userIds = users.map(u => u.id)

  // Stage 2 — wipe per-user trails
  const ownsDel = await prisma.ownershipDeclaration.deleteMany({ where: { userId: { in: userIds } } })
  const reactionsDel1 = await prisma.petitionReaction.deleteMany({ where: { userId: { in: userIds } } })
  const reactionsDel2 = await prisma.commentReaction.deleteMany({ where: { userId: { in: userIds } } })
  const commentsDel = await prisma.petitionComment.deleteMany({ where: { userId: { in: userIds } } })
  const sigsDel = await prisma.petitionSignature.deleteMany({ where: { userId: { in: userIds } } })
  const votesDel = await prisma.assemblyVote.deleteMany({ where: { userId: { in: userIds } } })
  const actMemDel = await prisma.activityMembership.deleteMany({ where: { userId: { in: userIds } } })
  const pendDel = await prisma.pendingRegistration.deleteMany({ where: { userId: { in: userIds } } })
  const chatsDel = await prisma.chatMessage.deleteMany({ where: { userId: { in: userIds } } })
  const membDel = await prisma.membership.deleteMany({ where: { userId: { in: userIds } } })
  const vtDel = await prisma.verificationToken.deleteMany({ where: { identifier: { in: TEST_EMAILS } } })

  console.log({ ownsDel, reactionsDel1, reactionsDel2, commentsDel, sigsDel, votesDel, actMemDel, pendDel, chatsDel, membDel, vtDel })

  const usersDel = await prisma.user.deleteMany({ where: { id: { in: userIds } } })
  console.log(`Users deleted: ${usersDel.count}`)

  // Stage 3 — test building
  const testBld = await prisma.building.findUnique({ where: { id: 'test-bld-1' } })
  if (testBld) {
    await prisma.apartment.deleteMany({ where: { buildingId: 'test-bld-1' } })
    await prisma.building.delete({ where: { id: 'test-bld-1' } })
    console.log('Building test-bld-1 + its apartments — removed')
  }

  // Stage 4 — test org (only if empty)
  const org = await prisma.organization.findUnique({
    where: { slug: 'zhk-test' },
    include: {
      _count: { select: { memberships: true, petitions: true, assemblies: true, buildings: true } },
    },
  })
  if (org) {
    const c = org._count
    const orgEmpty = c.memberships === 0 && c.petitions === 0 && c.assemblies === 0 && c.buildings === 0
    if (orgEmpty) {
      await prisma.organization.delete({ where: { id: org.id } })
      console.log('Organization "ЖК Тестовый" (slug=zhk-test) — removed')
    } else {
      console.log(`Organization "ЖК Тестовый" left intact (still has: ${JSON.stringify(c)})`)
    }
  }

  console.log('\nDone.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
