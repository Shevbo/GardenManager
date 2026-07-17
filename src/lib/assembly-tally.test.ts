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

// UNIT MODEL: PRIMARY = votes (one owner = one vote). Area is reference only.

describe('tallyAssembly — quorum by VOTE COUNT (area = reference)', () => {
  it('reaches quorum on owner vote count, not area', () => {
    const input: TallyInput = {
      quorumPercent: 50,
      memberships: [owner(100), owner(100), owner(100), owner(50)], // 4 owners
      votes: [vote('q1', 'u1', 'FOR', 100), vote('q1', 'u2', 'FOR', 100), vote('q1', 'u3', 'AGAINST', 100)], // 3 voted
      questions: [q('q1', 50)],
    }
    const r = tallyAssembly(input)
    expect(r.totalEligibleCount).toBe(4)
    expect(r.votedCount).toBe(3)
    expect(r.quorumPct).toBeCloseTo(75) // 3/4 votes
    expect(r.quorumReached).toBe(true)
    // area carried as reference
    expect(r.totalEligibleArea).toBe(350)
    expect(r.totalVotedArea).toBe(300)
    expect(r.quorumAreaPct).toBeCloseTo(85.71, 1)
  })

  it('does NOT reach quorum when too few owners vote (by count)', () => {
    const input: TallyInput = {
      quorumPercent: 50,
      memberships: [owner(100), owner(100), owner(100), owner(100)],
      votes: [vote('q1', 'u1', 'FOR', 100)], // 1/4 = 25%
      questions: [q('q1', 50)],
    }
    const r = tallyAssembly(input)
    expect(r.quorumPct).toBeCloseTo(25)
    expect(r.quorumReached).toBe(false)
    expect(r.questions[0].forPct).toBeCloseTo(100) // 1/1 for, but…
    expect(r.questions[0].passed).toBe(false) // …quorum not reached
  })

  it('counts each owner once for quorum even if they vote on many questions', () => {
    const input: TallyInput = {
      quorumPercent: 50,
      memberships: [owner(100), owner(100)],
      votes: [vote('q1', 'u1', 'FOR', 100), vote('q2', 'u1', 'FOR', 100)], // same owner, 2 questions
      questions: [q('q1', 50), q('q2', 50)],
    }
    const r = tallyAssembly(input)
    expect(r.votedCount).toBe(1) // u1 counted once
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
    expect(r.totalEligibleCount).toBe(2) // tenant excluded
    expect(r.votedCount).toBe(1)
    expect(r.questions[0].forVotes).toBe(1) // tenant FOR not counted
    expect(r.questions[0].forArea).toBe(100)
  })
})

describe('tallyAssembly — abstentions', () => {
  it('counts abstention toward quorum but never toward "for", and keeps it in the participating (votes) denominator', () => {
    const input: TallyInput = {
      quorumPercent: 50,
      memberships: [owner(100), owner(100), owner(100)],
      votes: [
        vote('q1', 'u1', 'FOR', 100),
        vote('q1', 'u2', 'FOR', 100),
        vote('q1', 'u3', 'ABSTAIN', 100),
      ],
      questions: [q('q1', 50, 'PARTICIPATING')],
    }
    const r = tallyAssembly(input)
    expect(r.quorumReached).toBe(true) // 3/3 participated
    const t = r.questions[0]
    expect(t.abstainVotes).toBe(1)
    expect(t.participatingVotes).toBe(3)
    expect(t.forPct).toBeCloseTo(66.67, 1) // 2/3 votes for
    expect(t.forAreaPct).toBeCloseTo(66.67, 1) // area reference matches here
  })
})

describe('tallyAssembly — non-voters reported as reference only', () => {
  it('reports notVotedCount/notVotedArea, NEVER in the denominator', () => {
    const input: TallyInput = {
      quorumPercent: 50,
      memberships: [owner(100), owner(100), owner(100), owner(100)], // 4 owners
      votes: [vote('q1', 'u1', 'FOR', 100), vote('q1', 'u2', 'AGAINST', 100)], // 2 voted; u3,u4 did not
      questions: [q('q1', 50, 'PARTICIPATING')],
    }
    const r = tallyAssembly(input)
    const t = r.questions[0]
    expect(t.notVotedCount).toBe(2)
    expect(t.notVotedArea).toBe(200)
    expect(t.participatingVotes).toBe(2)
    expect(t.forPct).toBeCloseTo(50) // 1/2 votes — non-voters excluded
  })
})

describe('tallyAssembly — majority by votes (ordinary + qualified)', () => {
  it('ordinary question: simple majority of participants passes at >50% votes', () => {
    const input: TallyInput = {
      quorumPercent: 50,
      memberships: [owner(100), owner(100), owner(100), owner(100)],
      votes: [
        vote('q1', 'u1', 'FOR', 100),
        vote('q1', 'u2', 'FOR', 100),
        vote('q1', 'u3', 'AGAINST', 100), // 2/3 for
      ],
      questions: [q('q1', 50, 'PARTICIPATING')],
    }
    const r = tallyAssembly(input)
    expect(r.questions[0].forPct).toBeCloseTo(66.67, 1)
    expect(r.questions[0].passed).toBe(true)
  })

  it('qualified 2/3: exactly 2/3 of participating votes PASSES', () => {
    const input: TallyInput = {
      quorumPercent: 50,
      memberships: [owner(100), owner(100), owner(100)],
      votes: [vote('q1', 'u1', 'FOR', 100), vote('q1', 'u2', 'FOR', 100), vote('q1', 'u3', 'AGAINST', 100)],
      questions: [q('q1', TWO_THIRDS_PCT, 'PARTICIPATING')],
    }
    const r = tallyAssembly(input)
    expect(r.questions[0].forPct).toBeCloseTo(66.67, 1) // 2/3 votes
    expect(r.questions[0].passed).toBe(true)
  })

  it('qualified 2/3: just under 2/3 of participating votes FAILS', () => {
    const input: TallyInput = {
      quorumPercent: 50,
      memberships: [owner(100), owner(100), owner(100), owner(100), owner(100)],
      votes: [
        vote('q1', 'u1', 'FOR', 100), vote('q1', 'u2', 'FOR', 100), vote('q1', 'u3', 'FOR', 100),
        vote('q1', 'u4', 'AGAINST', 100), vote('q1', 'u5', 'AGAINST', 100), // 3/5 = 60%
      ],
      questions: [q('q1', TWO_THIRDS_PCT, 'PARTICIPATING')],
    }
    const r = tallyAssembly(input)
    expect(r.questions[0].forPct).toBeCloseTo(60)
    expect(r.questions[0].passed).toBe(false)
  })

  it('area is REFERENCE only: a multi-area owner does not outweigh vote count', () => {
    // u1 owns a huge box (1000), u2 & u3 small (100). u1 FOR, u2+u3 AGAINST.
    // by votes: 1 FOR / 3 = 33% → FAIL. by area it would be 1000/1200=83% → but area is not the basis.
    const input: TallyInput = {
      quorumPercent: 50,
      memberships: [owner(1000), owner(100), owner(100), owner(100)],
      votes: [vote('q1', 'u1', 'FOR', 1000), vote('q1', 'u2', 'AGAINST', 100), vote('q1', 'u3', 'AGAINST', 100)],
      questions: [q('q1', 50, 'PARTICIPATING')],
    }
    const r = tallyAssembly(input)
    const t = r.questions[0]
    expect(t.forPct).toBeCloseTo(33.33, 1) // 1/3 votes → basis
    expect(t.passed).toBe(false)
    expect(t.forAreaPct).toBeCloseTo(83.33, 1) // reference only, does NOT decide
  })

  it('explicit TOTAL basis: denominator is ALL eligible owners (by count)', () => {
    const input: TallyInput = {
      quorumPercent: 50,
      memberships: [owner(100), owner(100), owner(100), owner(100), owner(100), owner(100)], // 6 owners
      votes: [
        vote('q1', 'o1', 'FOR', 100), vote('q1', 'o2', 'FOR', 100), vote('q1', 'o3', 'FOR', 100),
        vote('q1', 'o4', 'FOR', 100), vote('q1', 'o5', 'AGAINST', 100), // 4 FOR of 6 total = 66.7%
      ],
      questions: [q('q1', TWO_THIRDS_PCT, 'TOTAL')],
    }
    const r = tallyAssembly(input)
    expect(r.questions[0].forPct).toBeCloseTo(66.67, 1) // 4/6 by count
    expect(r.questions[0].passed).toBe(true)
  })

  it('basisForThreshold: default basis is PARTICIPATING for ALL thresholds', () => {
    expect(basisForThreshold(50)).toBe('PARTICIPATING')
    expect(basisForThreshold(TWO_THIRDS_PCT)).toBe('PARTICIPATING')
    expect(basisForThreshold(100)).toBe('PARTICIPATING')
  })

  it('defaults to PARTICIPATING basis when none specified', () => {
    const input: TallyInput = {
      quorumPercent: 50,
      memberships: [owner(100), owner(100)],
      votes: [vote('q1', 'u1', 'FOR', 100), vote('q1', 'u2', 'AGAINST', 100)],
      questions: [{ id: 'q1', text: 'q1', order: 1, requiredMajorityPct: 50 }],
    }
    const r = tallyAssembly(input)
    expect(r.questions[0].majorityBasis).toBe('PARTICIPATING')
    expect(r.questions[0].forPct).toBeCloseTo(50) // 1/2 votes
  })
})

describe('tallyAssembly — ГК «Щитовик» golden example (votes basis)', () => {
  // 50 owners (1 vote each). Persona votes on a qualified (2/3) question:
  //   FOR: P1(14)+P6(3)+P8(4)=21 ; ABSTAIN: P2(8)+P7(2)=10 ; AGAINST: P3(6)
  //   P4(8) & P5(5) do not vote on the qualified question.
  //   participating = 21+10+6 = 37 votes.  forPct = 21/37 = 56.8% < 66.67 → FAIL.
  it('qualified question fails at 56.8% of participating votes; non-voters reference-only', () => {
    const memberships: TallyMembership[] = Array.from({ length: 50 }, () => owner(18))
    const mk = (n: number, choice: TallyVote['choice'], from: number) =>
      Array.from({ length: n }, (_, i) => vote('q', `u${from + i}`, choice, 18))
    const votes = [...mk(21, 'FOR', 0), ...mk(10, 'ABSTAIN', 21), ...mk(6, 'AGAINST', 31)] // 37 participate; 13 don't
    const r = tallyAssembly({ quorumPercent: 50, memberships, votes, questions: [q('q', TWO_THIRDS_PCT)] })
    const t = r.questions[0]
    expect(r.quorumReached).toBe(true) // 37/50 = 74%
    expect(t.participatingVotes).toBe(37)
    expect(t.notVotedCount).toBe(13)
    expect(t.forPct).toBeCloseTo(56.76, 1)
    expect(t.passed).toBe(false)
  })
})
