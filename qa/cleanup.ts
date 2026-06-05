/** Removes all QA-namespaced data. Run: source .env then `npx tsx qa/cleanup.ts`. */
import { initEnv } from './lib/env'

async function main() {
  const { prisma } = await initEnv()
  const orgs = await prisma.organization.findMany({ where: { slug: { startsWith: 'qa-' } }, select: { id: true } })
  const orgIds = orgs.map(o => o.id)
  const users = await prisma.user.findMany({ where: { email: { endsWith: '@test.local' } }, select: { id: true } })
  const userIds = users.map(u => u.id)

  const petitions = await prisma.petition.findMany({ where: { orgId: { in: orgIds } }, select: { id: true } })
  const pIds = petitions.map(p => p.id)

  await prisma.generatedDocument.deleteMany({ where: { OR: [{ petitionId: { in: pIds } }, { userId: { in: userIds } }] } })
  await prisma.petitionSignature.deleteMany({ where: { petitionId: { in: pIds } } })
  await prisma.petitionReaction.deleteMany({ where: { petitionId: { in: pIds } } })
  await prisma.petitionComment.deleteMany({ where: { petitionId: { in: pIds } } })
  await prisma.petitionAIRevision.deleteMany({ where: { petitionId: { in: pIds } } })
  await prisma.petition.deleteMany({ where: { id: { in: pIds } } })

  await prisma.propertyOwnership.deleteMany({ where: { userId: { in: userIds } } })
  await prisma.ownershipDeclaration.deleteMany({ where: { userId: { in: userIds } } })
  await prisma.membership.deleteMany({ where: { OR: [{ orgId: { in: orgIds } }, { userId: { in: userIds } }] } })
  await prisma.apartment.deleteMany({ where: { building: { orgId: { in: orgIds } } } })
  await prisma.building.deleteMany({ where: { OR: [{ orgId: { in: orgIds } }, { createdBy: { in: userIds } }] } })

  const groups = await prisma.orgGroup.findMany({ where: { name: { startsWith: 'QA ' } }, select: { id: true } })
  const gIds = groups.map(g => g.id)
  await prisma.orgGroupMembership.deleteMany({ where: { OR: [{ orgGroupId: { in: gIds } }, { organizationId: { in: orgIds } }] } })
  await prisma.orgGroup.deleteMany({ where: { id: { in: gIds } } })

  await prisma.user.deleteMany({ where: { id: { in: userIds } } })
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } })

  console.error(`Cleaned: ${orgIds.length} orgs, ${userIds.length} users, ${pIds.length} petitions.`)
  await prisma.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
