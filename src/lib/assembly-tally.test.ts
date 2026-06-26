import { describe, it, expect } from 'vitest'
import { tallyAssembly, basisForThreshold, TWO_THIRDS_PCT, type TallyInput, type TallyVote, type TallyMembership, type TallyQuestion } from '@/lib/assembly-tally'

// --- fixture helpers ---
const owner = (areaSqm: number): TallyMembership => ({ areaSqm, isOwner: true })
const tenant = (areaSqm: number): TallyMembership => ({ areaSqm, isOwner: false })
const vote = (
  questionId: string,
  userId: string,
  choice: TallyVote['choice'],
  areaSqm: number,
  isOwner = true,
): TallyVote => ({ questionId, userId, choice, areaSqm, isOwner })
const q = (id: string, requiredMajorityPct: number, majorityBasis?: TallyQuestion['majorityBasis']): TallyQuestion =>
  ({ id, text: id, order: 1, requiredMajorityPct, majorityBasis })

describe('tallyAssembly — quorum (ЖК РФ ст.45)', () => {
  it('reaches quorum on owner area share, not headcount', () => {
    const input: TallyInput = {
      quorumPercent: 50,
      memberships: [owner(100), owner(100), owner(100), owner(100)], // 400 total
      votes: [vote('q1', 'u1', 'FOR', 100), vote('q1', 'u2', 'FOR', 100), vote('q1', 'u3', 'AGAINST', 100)], // 300 voted
      questions: [q('q1', 50)],
    }
    const r = tallyAssembly(input)
    expect(r.totalEligibleArea).toBe(400)
    expect(r.totalVotedArea).toBe(300)
    expect(r.quorumPct).toBeCloseTo(75)
    expect(r.quorumReached).toBe(true)
  })

  it('does NOT reach quorum when participating owner area < threshold', () => {
    const input: TallyInput = {
      quorumPercent: 50,
      memberships: [owner(100), owner(100), owner(100), owner(100)],
      votes: [vote('q1', 'u1', 'FOR', 100)], // only 100/400 = 25%
      questions: [q('q1', 50)],
    }
    const r = tallyAssembly(input)
    expect(r.quorumReached).toBe(false)
    // quorum not reached ⇒ nothing passes even at 100% for
    expect(r.questions[0].forPct).toBeCloseTo(100)
    expect(r.questions[0].passed).toBe(false)
  })

  it('counts each owner area once for quorum even if they vote on many questions', () => {
    const input: TallyInput = {
      quorumPercent: 50,
      memberships: [owner(100), owner(100)],
      votes: [vote('q1', 'u1', 'FOR', 100), vote('q2', 'u1', 'FOR', 100)], // same owner, 2 questions
      questions: [q('q1', 50), q('q2', 50)],
    }
    const r = tallyAssembly(input)
    expect(r.totalVotedArea).toBe(100) // u1 counted once, not 200
    expect(r.quorumPct).toBeCloseTo(50)
  })
})

describe('tallyAssembly — eligibility (only owners count)', () => {
  it('ignores non-owner votes in quorum and tally', () => {
    const input: TallyInput = {
      quorumPercent: 50,
      memberships: [owner(100), owner(100), tenant(1000)],
      votes: [
        vote('q1', 'u1', 'FOR', 100),
        vote('q1', 't1', 'FOR', 1000, false), // tenant — must be ignored
      ],
      questions: [q('q1', 50)],
    }
    const r = tallyAssembly(input)
    expect(r.totalEligibleArea).toBe(200) // tenant area excluded
    expect(r.totalVotedArea).toBe(100)
    expect(r.questions[0].forArea).toBe(100) // tenant FOR not counted
  })
})

describe('tallyAssembly — abstentions', () => {
  it('counts abstention toward quorum but never toward "for", and keeps it in the participating denominator', () => {
    const input: TallyInput = {
      quorumPercent: 50,
      memberships: [owner(100), owner(100), owner(100)], // 300
      votes: [
        vote('q1', 'u1', 'FOR', 100),
        vote('q1', 'u2', 'FOR', 100),
        vote('q1', 'u3', 'ABSTAIN', 100),
      ],
      questions: [q('q1', 50, 'PARTICIPATING')],
    }
    const r = tallyAssembly(input)
    expect(r.quorumReached).toBe(true) // all 3 participated
    expect(r.questions[0].abstainArea).toBe(100)
    expect(r.questions[0].forPct).toBeCloseTo(66.67, 1) // 200 / 300 participating
  })
})

describe('tallyAssembly — non-voters reported as reference only', () => {
  it('reports notVotedArea/notVotedCount for owners who did not vote, NEVER in the denominator', () => {
    const input: TallyInput = {
      quorumPercent: 50,
      memberships: [owner(100), owner(100), owner(100), owner(100)], // 400, 4 owners
      votes: [
        vote('q1', 'u1', 'FOR', 100),
        vote('q1', 'u2', 'AGAINST', 100), // participating 200; u3,u4 did not vote
      ],
      questions: [q('q1', 50, 'PARTICIPATING')],
    }
    const r = tallyAssembly(input)
    const t = r.questions[0]
    expect(t.notVotedArea).toBe(200) // u3 + u4
    expect(t.notVotedCount).toBe(2)
    expect(t.forPct).toBeCloseTo(50) // 100 / 200 participating — non-voters excluded from denominator
  })
})

describe('tallyAssembly — majority basis (ЖК РФ ст.46)', () => {
  it('ordinary question: simple majority of participants passes at >50%', () => {
    const input: TallyInput = {
      quorumPercent: 50,
      memberships: [owner(100), owner(100), owner(100), owner(100)],
      votes: [
        vote('q1', 'u1', 'FOR', 100),
        vote('q1', 'u2', 'FOR', 100),
        vote('q1', 'u3', 'AGAINST', 100), // participating 300, for 200 = 66.7%
      ],
      questions: [q('q1', 50, 'PARTICIPATING')],
    }
    const r = tallyAssembly(input)
    expect(r.questions[0].passed).toBe(true)
  })

  it('Boris ruling: qualified 2/3 on the ACTIVE base passes; non-voters are reference-only', () => {
    // 100 owners, 1 area each (total 100). Qualified question (2/3), DEFAULT basis.
    // Active: 40 FOR, 5 AGAINST, 5 ABSTAIN (participating = 50). 50 did not vote.
    const memberships: TallyMembership[] = Array.from({ length: 100 }, () => owner(1))
    const votes: TallyVote[] = [
      ...Array.from({ length: 40 }, (_, i) => vote('q1', `for${i}`, 'FOR', 1)),
      ...Array.from({ length: 5 }, (_, i) => vote('q1', `ag${i}`, 'AGAINST', 1)),
      ...Array.from({ length: 5 }, (_, i) => vote('q1', `ab${i}`, 'ABSTAIN', 1)),
    ]
    // No explicit majorityBasis → defaults to PARTICIPATING per Boris ruling.
    const r = tallyAssembly({ quorumPercent: 50, memberships, votes, questions: [q('q1', TWO_THIRDS_PCT)] })
    const t = r.questions[0]
    expect(r.quorumReached).toBe(true) // 50/100 = 50% participated
    expect(t.majorityBasis).toBe('PARTICIPATING')
    expect(t.forPct).toBeCloseTo(80, 5) // 40 / 50 active ≥ 66.67
    expect(t.passed).toBe(true)
    expect(t.notVotedArea).toBe(50) // reference only
    expect(t.notVotedCount).toBe(50)
    // Same vote under the stricter explicit TOTAL basis would FAIL (40/100 = 40%).
    const rTotal = tallyAssembly({ quorumPercent: 50, memberships, votes, questions: [q('q1', TWO_THIRDS_PCT, 'TOTAL')] })
    expect(rTotal.questions[0].forPct).toBeCloseTo(40, 5)
    expect(rTotal.questions[0].passed).toBe(false)
  })

  it('the two bases differ: a 2/3 question can pass on participants but FAIL on total owners', () => {
    // 6 owners, 600 total area. Participants: o1,o2,o3 (450 area). FOR = o1+o2 = 350, AGAINST = o3 = 100.
    //  participating basis: 350/450 = 77.8% ≥ 66.67 → PASS
    //  total basis:         350/600 = 58.3% < 66.67  → FAIL
    const memberships = [owner(200), owner(150), owner(100), owner(50), owner(50), owner(50)] // 600
    const votes: TallyVote[] = [
      vote('qp', 'o1', 'FOR', 200), vote('qp', 'o2', 'FOR', 150), vote('qp', 'o3', 'AGAINST', 100),
      vote('qt', 'o1', 'FOR', 200), vote('qt', 'o2', 'FOR', 150), vote('qt', 'o3', 'AGAINST', 100),
    ]
    const r = tallyAssembly({
      quorumPercent: 50,
      memberships,
      votes,
      questions: [q('qp', 66.67, 'PARTICIPATING'), q('qt', 66.67, 'TOTAL')],
    })
    expect(r.quorumReached).toBe(true) // 450/600 = 75%
    const part = r.questions.find(x => x.questionId === 'qp')!
    const total = r.questions.find(x => x.questionId === 'qt')!
    expect(part.forPct).toBeCloseTo(77.78, 1)
    expect(part.passed).toBe(true)
    expect(total.forPct).toBeCloseTo(58.33, 1)
    expect(total.passed).toBe(false)
  })

  it('explicit TOTAL basis: exactly 2/3 of ALL owner area PASSES ("не менее двух третей")', () => {
    const memberships = [owner(100), owner(100), owner(100), owner(100), owner(100), owner(100)] // 600
    const votes: TallyVote[] = [
      vote('q1', 'o1', 'FOR', 100), vote('q1', 'o2', 'FOR', 100), vote('q1', 'o3', 'FOR', 100),
      vote('q1', 'o4', 'FOR', 100), vote('q1', 'o5', 'AGAINST', 100), // FOR 400/600 = exactly 2/3
    ]
    const r = tallyAssembly({ quorumPercent: 50, memberships, votes, questions: [q('q1', TWO_THIRDS_PCT, 'TOTAL')] })
    expect(r.questions[0].forPct).toBeCloseTo(66.67, 1)
    expect(r.questions[0].passed).toBe(true) // exact 2/3 must pass
  })

  it('explicit TOTAL basis: just under 2/3 of ALL owner area FAILS', () => {
    const memberships = [owner(100), owner(100), owner(100), owner(100), owner(100), owner(150)] // 650
    const votes: TallyVote[] = [
      vote('q1', 'o1', 'FOR', 100), vote('q1', 'o2', 'FOR', 100), vote('q1', 'o3', 'FOR', 100),
      vote('q1', 'o4', 'FOR', 100), vote('q1', 'o6', 'AGAINST', 150), // FOR 400/650 = 61.5% < 2/3
    ]
    const r = tallyAssembly({ quorumPercent: 50, memberships, votes, questions: [q('q1', TWO_THIRDS_PCT, 'TOTAL')] })
    expect(r.questions[0].forPct).toBeLessThan(66.67)
    expect(r.questions[0].passed).toBe(false)
  })

  it('basisForThreshold: default basis is PARTICIPATING for ALL thresholds (Boris ruling — active base)', () => {
    expect(basisForThreshold(50)).toBe('PARTICIPATING')
    expect(basisForThreshold(50.1)).toBe('PARTICIPATING')
    expect(basisForThreshold(66)).toBe('PARTICIPATING')
    expect(basisForThreshold(TWO_THIRDS_PCT)).toBe('PARTICIPATING') // qualified 2/3 now on active voters
    expect(basisForThreshold(66.67)).toBe('PARTICIPATING')
    expect(basisForThreshold(75)).toBe('PARTICIPATING')
    expect(basisForThreshold(100)).toBe('PARTICIPATING')
  })

  it('defaults to PARTICIPATING basis when none is specified (backward-compatible)', () => {
    const input: TallyInput = {
      quorumPercent: 50,
      memberships: [owner(100), owner(100)],
      votes: [vote('q1', 'u1', 'FOR', 100), vote('q1', 'u2', 'AGAINST', 100)],
      questions: [{ id: 'q1', text: 'q1', order: 1, requiredMajorityPct: 50 }], // no basis
    }
    const r = tallyAssembly(input)
    expect(r.questions[0].majorityBasis).toBe('PARTICIPATING')
    expect(r.questions[0].forPct).toBeCloseTo(50) // 100/200 participating
  })
})
