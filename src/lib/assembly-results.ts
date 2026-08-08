import prisma from './prisma'
import { tallyAssembly, basisForThreshold, type TallyInput, type MajorityBasis } from './assembly-tally'

export type QuestionResult = {
  questionId: string
  text: string
  order: number
  requiredMajorityPct: number
  majorityBasis: MajorityBasis
  // PRIMARY — votes (голоса)
  forVotes: number
  againstVotes: number
  abstainVotes: number
  /** Из них «воздержался» дозаписан сервером за пустой ответ бюллетеня (справочно). */
  autoAbstainVotes: number
  participatingVotes: number
  notVotedCount: number // reference — eligible owners who did not vote
  totalEligible: number
  forPct: number // by votes — the pass/fail basis
  // REFERENCE — area m² (shown in parentheses)
  forArea: number
  againstArea: number
  abstainArea: number
  notVotedArea: number
  forAreaPct: number
  passed: boolean
}

export type AssemblyResults = {
  assemblyId: string
  status: string
  quorumPercent: number
  // PRIMARY — votes
  totalEligibleCount: number
  votedCount: number
  quorumReached: boolean
  quorumPct: number
  // REFERENCE — area
  totalEligibleArea: number
  totalVotedArea: number
  quorumAreaPct: number
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

  const eligibleRaw = await prisma.membership.findMany({
    where: { orgId: assembly.orgId },
    select: { userId: true, areaSqm: true, isOwner: true },
  })
  // One eligible entry per DISTINCT user — an owner holding several apartments is
  // still one owner/one vote (Boris ruling). Sum their area; owner if any is owner.
  const byUser = new Map<string, { areaSqm: number; isOwner: boolean }>()
  for (const m of eligibleRaw) {
    const e = byUser.get(m.userId) ?? { areaSqm: 0, isOwner: false }
    e.areaSqm += m.areaSqm ?? 0
    e.isOwner = e.isOwner || m.isOwner
    byUser.set(m.userId, e)
  }
  const eligibleMemberships = Array.from(byUser.values())

  const allVotes = await prisma.assemblyVote.findMany({
    where: { question: { assemblyId } },
    select: { questionId: true, choice: true, areaSqm: true, userId: true, isOwner: true, auto: true },
  })
  const autoAbstainByQuestion = new Map<string, number>()
  for (const v of allVotes) {
    if (v.auto && v.choice === 'ABSTAIN') {
      autoAbstainByQuestion.set(v.questionId, (autoAbstainByQuestion.get(v.questionId) ?? 0) + 1)
    }
  }

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
    totalEligibleCount: t.totalEligibleCount,
    votedCount: t.votedCount,
    quorumReached: t.quorumReached,
    quorumPct: t.quorumPct,
    totalEligibleArea: t.totalEligibleArea,
    totalVotedArea: t.totalVotedArea,
    quorumAreaPct: t.quorumAreaPct,
    questions: t.questions.map(q => ({
      questionId: q.questionId,
      text: q.text,
      order: q.order,
      requiredMajorityPct: q.requiredMajorityPct,
      majorityBasis: q.majorityBasis,
      forVotes: q.forVotes,
      againstVotes: q.againstVotes,
      abstainVotes: q.abstainVotes,
      autoAbstainVotes: autoAbstainByQuestion.get(q.questionId) ?? 0,
      participatingVotes: q.participatingVotes,
      notVotedCount: q.notVotedCount,
      totalEligible: q.totalEligibleCount,
      forPct: q.forPct,
      forArea: q.forArea,
      againstArea: q.againstArea,
      abstainArea: q.abstainArea,
      notVotedArea: q.notVotedArea,
      forAreaPct: q.forAreaPct,
      passed: q.passed,
    })),
  }
}
