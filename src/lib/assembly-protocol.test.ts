import { describe, it, expect } from 'vitest'
import { validateProtocol, type ProtocolModel } from '@/lib/assembly-protocol'

const complete = (): ProtocolModel => ({
  number: '1',
  date: '2026-06-23',
  orgName: 'ТСЖ Садовое',
  address: 'г. Москва, ул. Садовая, д. 1',
  form: 'MIXED',
  initiator: 'Иванов И.И.',
  totalEligibleArea: 1000,
  votedArea: 700,
  quorumReached: true,
  agenda: [
    {
      order: 1,
      text: 'Выбор председателя',
      forArea: 500,
      againstArea: 100,
      abstainArea: 100,
      requiredMajorityPct: 50,
      decision: 'PASSED',
    },
  ],
  chairman: 'Иванов И.И.',
  secretary: 'Петрова А.А.',
})

describe('validateProtocol — ЖК РФ ст.46 ч.5 completeness', () => {
  it('accepts a complete protocol', () => {
    const r = validateProtocol(complete())
    expect(r.ok).toBe(true)
    expect(r.missing).toEqual([])
  })

  it('flags every missing required attribute', () => {
    const m = complete()
    m.number = ''
    m.address = '   '
    m.chairman = ''
    const r = validateProtocol(m)
    expect(r.ok).toBe(false)
    expect(r.missing).toEqual(expect.arrayContaining(['number', 'address', 'chairman']))
  })

  it('rejects an empty agenda', () => {
    const m = complete()
    m.agenda = []
    const r = validateProtocol(m)
    expect(r.ok).toBe(false)
    expect(r.missing).toContain('agenda')
  })

  it('rejects an agenda item missing its decision or tallies', () => {
    const m = complete()
    // @ts-expect-error — deliberately invalid decision for the test
    m.agenda[0].decision = 'MAYBE'
    m.agenda[0].forArea = Number.NaN
    const r = validateProtocol(m)
    expect(r.ok).toBe(false)
    expect(r.missing).toEqual(expect.arrayContaining(['agenda[0].decision', 'agenda[0].forArea']))
  })

  it('rejects an invalid meeting form', () => {
    const m = complete()
    // @ts-expect-error — invalid form
    m.form = 'TELEPATHY'
    const r = validateProtocol(m)
    expect(r.missing).toContain('form')
  })

  it('blocks a PASSED decision when quorum was not reached (legally void)', () => {
    const m = complete()
    m.quorumReached = false // agenda[0] still says PASSED
    const r = validateProtocol(m)
    expect(r.ok).toBe(false)
    expect(r.warnings).toContain('quorum-not-reached')
    expect(r.missing).toContain('decision-without-quorum')
  })

  it('allows a quorum-less protocol if it records no passed decisions', () => {
    const m = complete()
    m.quorumReached = false
    m.agenda[0].decision = 'NOT_PASSED'
    const r = validateProtocol(m)
    expect(r.ok).toBe(true)
    expect(r.warnings).toContain('quorum-not-reached')
  })
})
