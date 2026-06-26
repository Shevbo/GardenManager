import prisma from './prisma'
import { tallyAssembly, basisForThreshold, type TallyInput, type MajorityBasis } from './assembly-tally'

export type QuestionResult = {
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
  totalVoted: number
  totalEligible: number
  passed: boolean
  forPct: number
}

export type AssemblyResults = {
  assemblyId: string
  status: string
  quorumPercent: number
  totalEligibleArea: number
  totalVotedArea: number
  quorumReached: boolean
  quorumPct: number
  questions: QuestionResult[]
}

// DB-fetch wrapper around the pure `tallyAssembly` (the legally-critical core,
// covered by golden tests in assembly-tally.test.ts).
export async function computeResults(assemblyId: string): Promise<AssemblyResults | null> {
  const assembly = await prisma.assembly.findUnique({
    where: { id: assemblyId },
    include: {
      questions: { orderBy: { order: 'asc' } },
    },
  })
  if (!assembly) return null

  const eligibleMemberships = await prisma.membership.findMany({
    where: { orgId: assembly.orgId },
    select: { areaSqm: true, isOwner: true },
  })

  const allVotes = await prisma.assemblyVote.findMany({
    where: { question: { assemblyId } },
    select: { questionId: true, choice: true, areaSqm: true, userId: true, isOwner: true },
  })

  const input: TallyInput = {
    quorumPercent: assembly.quorumPercent,
    memberships: eligibleMemberships.map(m => ({ areaSqm: m.areaSqm, isOwner: m.isOwner })),
    votes: allVotes.map(v => ({
      questionId: v.questionId,
      userId: v.userId,
      choice: v.choice as 'FOR' | 'AGAINST' | 'ABSTAIN',
      areaSqm: v.areaSqm,
      isOwner: v.isOwner,
    })),
    // Legal basis (ЖК РФ ст.46): per Boris's ruling both ordinary and qualified
    // (>= 2/3) decisions are tallied on the PARTICIPATING owners (active voters);
    // owners who did not vote are reported only as a reference figure. The
    // `basisForThreshold` fallback returns PARTICIPATING; once an explicit
    // per-question `majorityBasis` column lands, read it here (falling back to
    // basisForThreshold for legacy rows).
    questions: assembly.questions.map(q => ({
      id: q.id,
      text: q.text,
      order: q.order,
      requiredMajorityPct: q.requiredMajorityPct,
      majorityBasis: basisForThreshold(q.requiredMajorityPct),
    })),
  }

  const t = tallyAssembly(input)

  return {
    assemblyId,
    status: assembly.status,
    quorumPercent: t.quorumPercent,
    totalEligibleArea: t.totalEligibleArea,
    totalVotedArea: t.totalVotedArea,
    quorumReached: t.quorumReached,
    quorumPct: t.quorumPct,
    questions: t.questions.map(q => ({
      questionId: q.questionId,
      text: q.text,
      order: q.order,
      requiredMajorityPct: q.requiredMajorityPct,
      majorityBasis: q.majorityBasis,
      forArea: q.forArea,
      againstArea: q.againstArea,
      abstainArea: q.abstainArea,
      notVotedArea: q.notVotedArea,
      notVotedCount: q.notVotedCount,
      totalVoted: q.totalVotedCount,
      totalEligible: q.totalEligibleCount,
      passed: q.passed,
      forPct: q.forPct,
    })),
  }
}
