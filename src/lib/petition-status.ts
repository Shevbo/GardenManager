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

const BACK_TRANSITIONS: Record<PetitionStatus, PetitionStatus | null> = {
  DRAFT:       null,
  DISCUSSION:  'DRAFT',
  AI_REVISION: 'DISCUSSION',
  SIGNING:     'AI_REVISION',
  CLOSED:      null,
  EXPORTED:    null,
}

export function canTransition(from: PetitionStatus, to: PetitionStatus): boolean {
  return TRANSITIONS[from].includes(to)
}

export function canGoBack(from: PetitionStatus): PetitionStatus | null {
  return BACK_TRANSITIONS[from]
}
