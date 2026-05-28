import prisma from './prisma'

export type QuestionResult = {
  questionId: string
  text: string
  order: number
  requiredMajorityPct: number
  forArea: number
  againstArea: number
  abstainArea: number
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
  const totalEligibleArea = eligibleMemberships
    .filter(m => m.isOwner)
    .reduce((sum, m) => sum + (m.areaSqm ?? 0), 0)

  const allVotes = await prisma.assemblyVote.findMany({
    where: { question: { assemblyId } },
    select: { questionId: true, choice: true, areaSqm: true, userId: true, isOwner: true },
  })

  const uniqueVoterAreas = new Map<string, number>()
  for (const v of allVotes) {
    if (v.isOwner) uniqueVoterAreas.set(v.userId, v.areaSqm)
  }
  const totalVotedArea = Array.from(uniqueVoterAreas.values()).reduce((s, a) => s + a, 0)
  const quorumPct = totalEligibleArea > 0 ? (totalVotedArea / totalEligibleArea) * 100 : 0
  const quorumReached = quorumPct >= assembly.quorumPercent

  const questions: QuestionResult[] = assembly.questions.map(q => {
    const qVotes = allVotes.filter(v => v.questionId === q.id && v.isOwner)
    const forArea = qVotes.filter(v => v.choice === 'FOR').reduce((s, v) => s + v.areaSqm, 0)
    const againstArea = qVotes.filter(v => v.choice === 'AGAINST').reduce((s, v) => s + v.areaSqm, 0)
    const abstainArea = qVotes.filter(v => v.choice === 'ABSTAIN').reduce((s, v) => s + v.areaSqm, 0)
    const totalVoted = forArea + againstArea + abstainArea
    const forPct = totalVoted > 0 ? (forArea / totalVoted) * 100 : 0
    const passed = quorumReached && forPct >= q.requiredMajorityPct
    return {
      questionId: q.id,
      text: q.text,
      order: q.order,
      requiredMajorityPct: q.requiredMajorityPct,
      forArea, againstArea, abstainArea,
      totalVoted: qVotes.length,
      totalEligible: eligibleMemberships.filter(m => m.isOwner).length,
      passed, forPct,
    }
  })

  return {
    assemblyId,
    status: assembly.status,
    quorumPercent: assembly.quorumPercent,
    totalEligibleArea,
    totalVotedArea,
    quorumReached,
    quorumPct,
    questions,
  }
}
