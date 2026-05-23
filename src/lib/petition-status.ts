export type PetitionStatus =
  | 'DRAFT' | 'DISCUSSION' | 'AI_REVISION'
  | 'SIGNING' | 'CLOSED' | 'EXPORTED'

const TRANSITIONS: Record<PetitionStatus, PetitionStatus[]> = {
  DRAFT:       ['DISCUSSION'],
  DISCUSSION:  ['AI_REVISION'],
  AI_REVISION: ['SIGNING'],
  SIGNING:     ['CLOSED'],
  CLOSED:      ['EXPORTED'],
  EXPORTED:    [],
}

export function canTransition(from: PetitionStatus, to: PetitionStatus): boolean {
  return TRANSITIONS[from].includes(to)
}
