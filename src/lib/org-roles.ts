import prisma from './prisma'
import type { OrgGovRole } from '@prisma/client'
import type { RoleHolder } from './org-roles-labels'

// Server-only helpers (import prisma). Pure labels/constants live in
// ./org-roles-labels so client components can use them without pulling prisma in.
export * from './org-roles-labels'

/** All governance assignments for an org, one entry per assigned role. */
export async function getOrgRoles(orgId: string): Promise<RoleHolder[]> {
  const rows = await prisma.orgRoleAssignment.findMany({
    where: { orgId },
    select: { role: true, userId: true, user: { select: { name: true } } },
  })
  return rows.map(r => ({ role: r.role, userId: r.userId, userName: r.user.name }))
}

/** Governance roles a user holds in a given org. */
export async function getUserGovRoles(userId: string, orgId: string): Promise<OrgGovRole[]> {
  const rows = await prisma.orgRoleAssignment.findMany({
    where: { orgId, userId },
    select: { role: true },
  })
  return rows.map(r => r.role)
}

export async function hasGovRole(userId: string, orgId: string, role: OrgGovRole): Promise<boolean> {
  const row = await prisma.orgRoleAssignment.findFirst({ where: { orgId, userId, role }, select: { id: true } })
  return !!row
}

/** Chairman or deputy — the two positions that APPROVE formal org actions. */
export async function isChairOrDeputy(userId: string, orgId: string): Promise<boolean> {
  const row = await prisma.orgRoleAssignment.findFirst({
    where: { orgId, userId, role: { in: ['chairman', 'vice_chairman'] } },
    select: { id: true },
  })
  return !!row
}

export async function isSecretary(userId: string, orgId: string): Promise<boolean> {
  return hasGovRole(userId, orgId, 'secretary')
}
