import prisma from '@/lib/prisma'

export async function canInteractWithPetition(
  userId: string,
  petitionId: string
): Promise<boolean> {
  const petition = await prisma.petition.findUnique({
    where: { id: petitionId },
    select: { orgId: true, orgGroupId: true, activityId: true },
  })
  if (!petition) return false

  if (petition.activityId) {
    const m = await prisma.activityMembership.findUnique({
      where: { activityId_userId: { activityId: petition.activityId, userId } },
    })
    return !!m
  }

  if (petition.orgGroupId) {
    const groupOrgs = await prisma.orgGroupMembership.findMany({
      where: { orgGroupId: petition.orgGroupId },
      select: { organizationId: true },
    })
    const orgIds = groupOrgs.map(m => m.organizationId)
    const m = await prisma.membership.findFirst({
      where: { userId, orgId: { in: orgIds } },
    })
    return !!m
  }

  const m = await prisma.membership.findFirst({
    where: { userId, orgId: petition.orgId },
  })
  return !!m
}
