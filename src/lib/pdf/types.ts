export type LayoutKey = 'official-letter' | 'police-statement' | 'explanation'
export type TemplateScope = 'collective' | 'individual'
export type VariableType = 'text' | 'multiline' | 'date' | 'select'
export type VariableSource = 'profile' | 'manual'

export interface TemplateVariable {
  name: string
  label: string
  type: VariableType
  required: boolean
  source: VariableSource
  options?: string[] // for type 'select'
}

/** Row of the signatory registry. */
export interface RegistryRow {
  num: number
  name: string
  apartment: string
  org: string
  signedAt: string
  verifiedVia: string
}

/** Viewer context controls PII masking. */
export interface ViewerContext {
  viewerUserId: string | null
  isAdmin: boolean
}
