// Pure ОСС protocol completeness validation (ЖК РФ ст.46 ч.5 + Приказ Минстроя
// №44/пр требования к протоколу). No DB, no I/O — a guardrail so an incomplete
// or quorum-less protocol is never issued (see GARD-3 HITL). Covered by tests.

export type ProtocolQuestionRecord = {
  order: number
  text: string
  forArea: number
  againstArea: number
  abstainArea: number
  requiredMajorityPct: number
  decision: 'PASSED' | 'NOT_PASSED'
}

export type ProtocolModel = {
  number: string // протокол №
  date: string // дата проведения / подсчёта
  orgName: string
  address: string // адрес МКД
  form: 'IN_PERSON' | 'ABSENTEE' | 'MIXED' // очное / заочное / очно-заочное
  initiator: string
  totalEligibleArea: number
  votedArea: number
  quorumReached: boolean
  agenda: ProtocolQuestionRecord[]
  chairman: string // председатель
  secretary: string // секретарь
}

export type ProtocolValidation = { ok: boolean; missing: string[]; warnings: string[] }

const REQUIRED_STRING_FIELDS: (keyof ProtocolModel)[] = [
  'number', 'date', 'orgName', 'address', 'initiator', 'chairman', 'secretary',
]

// Validates that the protocol carries every mandatory attribute and is legally
// issuable. `missing` blocks issuance; `warnings` are advisory.
export function validateProtocol(model: ProtocolModel): ProtocolValidation {
  const missing: string[] = []
  const warnings: string[] = []

  for (const f of REQUIRED_STRING_FIELDS) {
    const v = model[f]
    if (typeof v !== 'string' || v.trim() === '') missing.push(String(f))
  }

  if (!['IN_PERSON', 'ABSENTEE', 'MIXED'].includes(model.form)) missing.push('form')

  if (!Number.isFinite(model.totalEligibleArea) || model.totalEligibleArea <= 0) {
    missing.push('totalEligibleArea')
  }
  if (!Number.isFinite(model.votedArea) || model.votedArea < 0) missing.push('votedArea')

  if (!Array.isArray(model.agenda) || model.agenda.length === 0) {
    missing.push('agenda')
  } else {
    model.agenda.forEach((q, i) => {
      if (!q.text || q.text.trim() === '') missing.push(`agenda[${i}].text`)
      for (const nf of ['forArea', 'againstArea', 'abstainArea', 'requiredMajorityPct'] as const) {
        if (!Number.isFinite(q[nf])) missing.push(`agenda[${i}].${nf}`)
      }
      if (q.decision !== 'PASSED' && q.decision !== 'NOT_PASSED') {
        missing.push(`agenda[${i}].decision`)
      }
    })
  }

  // A protocol without quorum records that no decisions were taken — it must not
  // carry any PASSED decision (legally void).
  if (!model.quorumReached) {
    warnings.push('quorum-not-reached')
    const wronglyPassed = (model.agenda ?? []).some(q => q.decision === 'PASSED')
    if (wronglyPassed) missing.push('decision-without-quorum')
  }

  return { ok: missing.length === 0, missing, warnings }
}
