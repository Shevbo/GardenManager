// Pure ОСС/ГК tally logic — no DB, no I/O. The legally-critical core, extracted
// so it can be covered by golden tests (GARD-2). `computeResults` in
// assembly-results.ts is a thin DB-fetch wrapper around `tallyAssembly`.
//
// UNIT MODEL (Boris ruling 2026-06): the PRIMARY unit is ГОЛОСА (votes) —
// one owner = one vote. Quorum and majority are computed on the vote COUNT of
// owners. Area (м²) is carried alongside as a REFERENCE figure shown in
// parentheses ("N голосов (X м²)"), never as the threshold basis.
//
// Legal basis:
//  - Eligibility: only owners (isOwner) cast counted votes; tenants never do.
//  - Quorum: votedOwnerCount / totalEligibleOwnerCount >= quorumPercent
//    (default 50%). Each owner counts once even if voting on many questions.
//  - Ordinary decisions: majority (>50%) of PARTICIPATING votes.
//  - Qualified decisions (2/3): >= 2/3 of PARTICIPATING votes (active voters:
//    FOR+AGAINST+ABSTAIN). Owners who did not vote are reported separately as a
//    reference figure (notVotedCount / notVotedArea) and NEVER enter the
//    denominator. An explicit 'TOTAL' basis (of all eligible owners) is
//    available per question for a stricter reading.
//  - Abstentions count toward quorum (the owner participated) but never toward
//    "for"; they stay in the participating denominator.

export type MajorityBasis = 'PARTICIPATING' | 'TOTAL'

// "Two thirds" per ЖК РФ ст.46 ч.1 is exactly 2/3 ("не менее двух третей" →
// exactly 2/3 PASSES). Store the precise value, never a rounded 66.67.
export const TWO_THIRDS_PCT = 200 / 3

// Float tolerance so an exact boundary is treated as met.
const EPSILON = 1e-9

// Default legal basis when a question carries no explicit `majorityBasis`:
// PARTICIPATING (active voters). A question may opt into stricter 'TOTAL'.
export function basisForThreshold(_requiredMajorityPct: number): MajorityBasis {
  return 'PARTICIPATING'
}

export type TallyMembership = { areaSqm: number | null; isOwner: boolean }

export type TallyVote = {
  questionId: string
  userId: string
  choice: 'FOR' | 'AGAINST' | 'ABSTAIN'
  areaSqm: number
  isOwner: boolean
}

export type TallyQuestion = {
  id: string
  text: string
  order: number
  requiredMajorityPct: number
  majorityBasis?: MajorityBasis // default 'PARTICIPATING'
}

export type TallyInput = {
  quorumPercent: number
  memberships: TallyMembership[]
  votes: TallyVote[]
  questions: TallyQuestion[]
}

export type QuestionTally = {
  questionId: string
  text: string
  order: number
  requiredMajorityPct: number
  majorityBasis: MajorityBasis
  // PRIMARY unit — votes (one owner = one vote)
  forVotes: number
  againstVotes: number
  abstainVotes: number
  participatingVotes: number
  notVotedCount: number // reference — eligible owners who did not vote
  totalEligibleCount: number
  forPct: number // forVotes / denominator (votes) — the pass/fail basis
  // REFERENCE unit — area m² (shown in parentheses)
  forArea: number
  againstArea: number
  abstainArea: number
  notVotedArea: number
  forAreaPct: number // forArea / participating area — reference only
  passed: boolean
}

export type AssemblyTally = {
  quorumPercent: number
  // PRIMARY — votes
  totalEligibleCount: number
  votedCount: number
  quorumReached: boolean
  quorumPct: number // votedCount / totalEligibleCount
  // REFERENCE — area
  totalEligibleArea: number
  totalVotedArea: number
  quorumAreaPct: number
  questions: QuestionTally[]
}

export function tallyAssembly(input: TallyInput): AssemblyTally {
  const owners = input.memberships.filter(m => m.isOwner)
  const totalEligibleCount = owners.length
  const totalEligibleArea = owners.reduce((s, m) => s + (m.areaSqm ?? 0), 0)

  // Quorum: unique owner voters — counted once even if they voted on many
  // questions. Non-owner votes are ignored entirely.
  const uniqueVoterAreas = new Map<string, number>()
  for (const v of input.votes) {
    if (v.isOwner) uniqueVoterAreas.set(v.userId, v.areaSqm)
  }
  const votedCount = uniqueVoterAreas.size
  const totalVotedArea = Array.from(uniqueVoterAreas.values()).reduce((s, a) => s + a, 0)
  const quorumPct = totalEligibleCount > 0 ? (votedCount / totalEligibleCount) * 100 : 0
  const quorumAreaPct = totalEligibleArea > 0 ? (totalVotedArea / totalEligibleArea) * 100 : 0
  const quorumReached = quorumPct >= input.quorumPercent

  const questions: QuestionTally[] = input.questions
    .slice()
    .sort((a, b) => a.order - b.order)
    .map(q => {
      const basis: MajorityBasis = q.majorityBasis ?? 'PARTICIPATING'
      const qVotes = input.votes.filter(v => v.questionId === q.id && v.isOwner)

      const forVotes = countChoice(qVotes, 'FOR')
      const againstVotes = countChoice(qVotes, 'AGAINST')
      const abstainVotes = countChoice(qVotes, 'ABSTAIN')
      const participatingVotes = forVotes + againstVotes + abstainVotes
      const notVotedCount = totalEligibleCount - participatingVotes

      const forArea = sumArea(qVotes, 'FOR')
      const againstArea = sumArea(qVotes, 'AGAINST')
      const abstainArea = sumArea(qVotes, 'ABSTAIN')
      const participatingArea = forArea + againstArea + abstainArea
      const notVotedArea = totalEligibleArea - participatingArea

      // Denominator (VOTES) depends on legal basis. Pass/fail is by vote count.
      const denomVotes = basis === 'TOTAL' ? totalEligibleCount : participatingVotes
      const forPct = denomVotes > 0 ? (forVotes / denomVotes) * 100 : 0
      // Area percentage is reference only (shown in parentheses).
      const denomArea = basis === 'TOTAL' ? totalEligibleArea : participatingArea
      const forAreaPct = denomArea > 0 ? (forArea / denomArea) * 100 : 0

      const passed = quorumReached && forPct >= q.requiredMajorityPct - EPSILON

      return {
        questionId: q.id,
        text: q.text,
        order: q.order,
        requiredMajorityPct: q.requiredMajorityPct,
        majorityBasis: basis,
        forVotes,
        againstVotes,
        abstainVotes,
        participatingVotes,
        notVotedCount,
        totalEligibleCount,
        forPct,
        forArea,
        againstArea,
        abstainArea,
        notVotedArea,
        forAreaPct,
        passed,
      }
    })

  return {
    quorumPercent: input.quorumPercent,
    totalEligibleCount,
    votedCount,
    quorumReached,
    quorumPct,
    totalEligibleArea,
    totalVotedArea,
    quorumAreaPct,
    questions,
  }
}

function countChoice(votes: TallyVote[], choice: TallyVote['choice']): number {
  return votes.filter(v => v.choice === choice).length
}
function sumArea(votes: TallyVote[], choice: TallyVote['choice']): number {
  return votes.filter(v => v.choice === choice).reduce((s, v) => s + v.areaSqm, 0)
}
