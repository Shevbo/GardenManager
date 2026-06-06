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

/** Row of the signatory registry. One row per shown property object (or one per signer if none). */
export interface RegistryRow {
  num: number
  name: string
  type: string      // «Собственник» (ownership SMS-confirmed) or «—»
  address: string   // property address (incl. apartment) or «—»
  signedAt: string
}

/** Viewer context controls PII masking. */
export interface ViewerContext {
  viewerUserId: string | null
  isAdmin: boolean
}
