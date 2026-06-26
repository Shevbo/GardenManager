// Pure ОСС tally logic — no DB, no I/O. The legally-critical core (ЖК РФ),
// extracted so it can be covered by golden tests (GARD-2). `computeResults`
// in assembly-results.ts is a thin DB-fetch wrapper around `tallyAssembly`.
//
// Legal basis:
//  - Quorum (ЖК РФ ст.45 ч.3): share of owner area that participated must be
//    >= quorumPercent (default 50%). Only owners count; tenants never do.
//  - Ordinary decisions (ст.46 default): majority (>50%) of the votes of
//    PARTICIPATING owners (by area) — `majorityBasis: 'PARTICIPATING'`.
//  - Qualified decisions (ст.46 ч.1: reconstruction, capital-repair fund,
//    land-plot use, etc.): >= 2/3 of the votes of PARTICIPATING owners (by area).
//    Per Boris's ruling (2026-06) the denominator is the ACTIVE voters
//    (FOR + AGAINST + ABSTAIN); owners who did NOT vote are reported separately
//    as a reference figure (notVotedArea / notVotedCount) and are NEVER part of
//    the denominator. A question may still opt into the stricter 'TOTAL' (all
//    owners) basis explicitly for a more conservative reading.
//  - Abstentions count toward quorum (the owner participated) but never toward
//    "for"; they remain in the participating denominator.

export type MajorityBasis = 'PARTICIPATING' | 'TOTAL'

// "Two thirds" per ЖК РФ ст.46 ч.1 is exactly 2/3, and the law says "не менее
// двух третей" — i.e. exactly 2/3 PASSES. Store the precise value (66.666…),
// never a rounded 66.67 (which would wrongly reject an exact-2/3 vote).
export const TWO_THIRDS_PCT = 200 / 3

// Float tolerance so an exact boundary (e.g. 400/600 vs 200/3) is treated as met.
const EPSILON = 1e-9

// Default legal basis for a question that carries no explicit `majorityBasis`.
// Per Boris's ruling (2026-06) BOTH ordinary and qualified (>= 2/3) decisions are
// tallied on the PARTICIPATING owners (active voters: FOR + AGAINST + ABSTAIN);
// owners who did not vote are shown only as a reference figure. A question may
// still opt into the stricter 'TOTAL' (all owners) basis explicitly. The
// threshold is kept in the signature for call-site compatibility / future rules.
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
  forArea: number
  againstArea: number
  abstainArea: number
  notVotedArea: number // reference only — eligible owner area that did not vote
  notVotedCount: number // reference only — eligible owners who did not vote
  totalVotedCount: number
  totalEligibleCount: number
  forPct: number // computed against the basis denominator
  passed: boolean
}

export type AssemblyTally = {
  quorumPercent: number
  totalEligibleArea: number
  totalVotedArea: number
  quorumReached: boolean
  quorumPct: number
  questions: QuestionTally[]
}

export function tallyAssembly(input: TallyInput): AssemblyTally {
  const owners = input.memberships.filter(m => m.isOwner)
  const totalEligibleArea = owners.reduce((s, m) => s + (m.areaSqm ?? 0), 0)
  const totalEligibleCount = owners.length

  // Quorum: unique owner voters, area counted once even if they voted on many
  // questions. Non-owner votes are ignored entirely.
  const uniqueVoterAreas = new Map<string, number>()
  for (const v of input.votes) {
    if (v.isOwner) uniqueVoterAreas.set(v.userId, v.areaSqm)
  }
  const totalVotedArea = Array.from(uniqueVoterAreas.values()).reduce((s, a) => s + a, 0)
  const quorumPct = totalEligibleArea > 0 ? (totalVotedArea / totalEligibleArea) * 100 : 0
  const quorumReached = quorumPct >= input.quorumPercent

  const questions: QuestionTally[] = input.questions
    .slice()
    .sort((a, b) => a.order - b.order)
    .map(q => {
      const basis: MajorityBasis = q.majorityBasis ?? 'PARTICIPATING'
      const qVotes = input.votes.filter(v => v.questionId === q.id && v.isOwner)
      const forArea = sumArea(qVotes, 'FOR')
      const againstArea = sumArea(qVotes, 'AGAINST')
      const abstainArea = sumArea(qVotes, 'ABSTAIN')
      const participatingArea = forArea + againstArea + abstainArea

      // Reference figures only — owners who did not vote on this question.
      // Per Boris's ruling they are reported as "воздержавшиеся (не голосовали)"
      // справочно, and NEVER enter the majority denominator.
      const notVotedArea = totalEligibleArea - participatingArea
      const notVotedCount = totalEligibleCount - qVotes.length

      // Denominator depends on legal basis.
      const denom = basis === 'TOTAL' ? totalEligibleArea : participatingArea
      const forPct = denom > 0 ? (forArea / denom) * 100 : 0

      // A decision passes iff quorum reached AND threshold met on its basis.
      // "не менее" → >= with float tolerance so an exact boundary counts as met.
      const passed = quorumReached && forPct >= q.requiredMajorityPct - EPSILON

      return {
        questionId: q.id,
        text: q.text,
        order: q.order,
        requiredMajorityPct: q.requiredMajorityPct,
        majorityBasis: basis,
        forArea,
        againstArea,
        abstainArea,
        notVotedArea,
        notVotedCount,
        totalVotedCount: qVotes.length,
        totalEligibleCount,
        forPct,
        passed,
      }
    })

  return {
    quorumPercent: input.quorumPercent,
    totalEligibleArea,
    totalVotedArea,
    quorumReached,
    quorumPct,
    questions,
  }
}

function sumArea(votes: TallyVote[], choice: TallyVote['choice']): number {
  return votes.filter(v => v.choice === choice).reduce((s, v) => s + v.areaSqm, 0)
}
