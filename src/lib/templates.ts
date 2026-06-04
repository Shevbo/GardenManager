import type { TemplateVariable } from './pdf/types'

export type FieldValues = Record<string, string>

/** Replaces {{var}} with values; unknown/missing vars become ''. */
export function applyTemplate(body: string, values: FieldValues): string {
  return body.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => values[key] ?? '')
}

/** Returns labels of required variables that are empty/whitespace. */
export function missingRequired(variables: TemplateVariable[], values: FieldValues): string[] {
  return variables
    .filter(v => v.required && !(values[v.name] ?? '').trim())
    .map(v => v.label)
}

export interface ProfileLike {
  name?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
}

/** Well-known profile variable names → profile field. Extend as templates need. */
const PROFILE_FIELD: Record<string, keyof ProfileLike> = {
  applicant_name: 'name',
  applicant_phone: 'phone',
  applicant_email: 'email',
  applicant_address: 'address',
}

/** Pre-fills source='profile' variables from the user profile. */
export function profileVariableValues(variables: TemplateVariable[], profile: ProfileLike): FieldValues {
  const out: FieldValues = {}
  for (const v of variables) {
    if (v.source !== 'profile') continue
    const field = PROFILE_FIELD[v.name]
    const value = field ? profile[field] : null
    if (value) out[v.name] = value
  }
  return out
}
