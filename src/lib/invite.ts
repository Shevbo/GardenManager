export interface InviteRecord {
  usedBy: string | null
  expiresAt: Date | null
}

export type InviteValidationResult =
  | { valid: true }
  | { valid: false; reason: 'used' | 'expired' | 'not_found' }

export function validateInvite(invite: InviteRecord | null): InviteValidationResult {
  if (!invite) return { valid: false, reason: 'not_found' }
  if (invite.usedBy) return { valid: false, reason: 'used' }
  if (invite.expiresAt && invite.expiresAt < new Date()) return { valid: false, reason: 'expired' }
  return { valid: true }
}
