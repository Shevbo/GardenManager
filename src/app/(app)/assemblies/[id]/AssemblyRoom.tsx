'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ThumbsUp, ThumbsDown, Minus, Calendar, Users, FileText, Download } from 'lucide-react'
import { useConfirm } from '@/components/ui/dialog'
import type { QuestionResult, AssemblyResults } from '@/lib/assembly-results'

type Choice = 'FOR' | 'AGAINST' | 'ABSTAIN'

type Question = {
  id: string
  order: number
  text: string
  description: string | null
  requiredMajorityPct: number
}

type Assembly = {
  id: string
  title: string
  description: string | null
  type: 'online' | 'async_collect'
  status: 'DRAFT' | 'ANNOUNCED' | 'VOTING' | 'CLOSED'
  startsAt: string
  endsAt: string
  closedAt: string | null
  quorumPercent: number
  org: { id: string; name: string }
  createdByUser: { name: string | null }
  questions: Question[]
}

const STATUS_STYLE: Record<string, string> = {
  DRAFT:     'bg-gray-100 text-gray-600',
  ANNOUNCED: 'bg-amber/15 text-amber-700 border-amber/30',
  VOTING:    'bg-forest/10 text-forest border-forest/30',
  CLOSED:    'bg-blue-50 text-blue-700 border-blue-200',
}
const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Черновик', ANNOUNCED: 'Объявлено', VOTING: 'Идёт голосование', CLOSED: 'Закрыто',
}
const TYPE_LABEL: Record<string, string> = {
  online: 'Очное / онлайн',
  async_collect: 'Заочное (сбор бюллетеней)',
}
const CHOICE_LABEL: Record<Choice, string> = {
  FOR: 'За', AGAINST: 'Против', ABSTAIN: 'Воздержался',
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

type Props = {
  assembly: Assembly
  isAdmin: boolean
  canVote: boolean
  membership: { isOwner: boolean; areaSqm: number }
  myVotes: Array<{ questionId: string; choice: Choice; castAt: string }>
  results: AssemblyResults | null
}

export function AssemblyRoom({ assembly, isAdmin, canVote, membership, myVotes, results }: Props) {
  const router = useRouter()
  const confirm = useConfirm()
  const [choices, setChoices] = useState<Record<string, Choice>>(() => {
    const init: Record<string, Choice> = {}
    for (const v of myVotes) init[v.questionId] = v.choice
    return init
  })
  const [voting, setVoting] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const [error, setError] = useState('')

  const allAnswered = assembly.questions.every(q => choices[q.id])
  const hasExistingVote = myVotes.length > 0

  async function transition(status: Assembly['status']) {
    // GARD-3 HITL: closing is irreversible — confirm before acting.
    if (status === 'CLOSED') {
      const ok = await confirm({
        title: 'Закрыть собрание?',
        message: 'Действие необратимо: голосование завершится, и будет сформирован итоговый протокол.',
        confirmLabel: 'Закрыть собрание',
        tone: 'danger',
      })
      if (!ok) return
    }
    setTransitioning(true); setError('')
    try {
      const r = await fetch(`/api/assemblies/${assembly.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, ...(status === 'CLOSED' ? { confirm: true } : {}) }),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        setError(d.error || 'Не удалось')
        return
      }
      router.refresh()
    } finally { setTransitioning(false) }
  }

  async function submitVotes() {
    if (!allAnswered) { setError('Ответьте на все вопросы'); return }
    setVoting(true); setError('')
    try {
      const votes = assembly.questions.map(q => ({ questionId: q.id, choice: choices[q.id]! }))
      const r = await fetch(`/api/assemblies/${assembly.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ votes }),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        setError(d.error || 'Не удалось проголосовать')
        return
      }
      router.refresh()
    } finally { setVoting(false) }
  }

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 mb-2">
        <span className={`inline-block text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded border ${STATUS_STYLE[assembly.status]}`}>
          {STATUS_LABEL[assembly.status]}
        </span>
        <span className="text-xs text-ink/50">{TYPE_LABEL[assembly.type]}</span>
      </div>
      <h1 className="font-display text-2xl font-bold text-ink mb-2">{assembly.title}</h1>
      {assembly.description && (
        <p className="text-ink/70 text-sm mb-4 leading-relaxed">{assembly.description}</p>
      )}
      <div className="text-xs text-ink/50 flex gap-3 flex-wrap items-center mb-6">
        <span className="inline-flex items-center gap-1">
          <Users size={11} /> {assembly.org.name}
        </span>
        <span>·</span>
        <span className="inline-flex items-center gap-1">
          <Calendar size={11} />
          {formatDateTime(assembly.startsAt)} — {formatDateTime(assembly.endsAt)}
        </span>
        <span>·</span>
        <span>Кворум: {assembly.quorumPercent}%</span>
      </div>

      {/* Admin controls */}
      {isAdmin && (
        <div className="bg-amber/5 border border-amber/20 rounded-2xl p-4 mb-5 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-ink/70">
            <span className="font-medium">Управление:</span>{' '}
            {assembly.status === 'DRAFT' && 'Объявите собрание участникам, затем откройте голосование.'}
            {assembly.status === 'ANNOUNCED' && 'Откройте голосование в нужный момент.'}
            {assembly.status === 'VOTING' && 'Закройте голосование когда срок истёк или достигнут кворум.'}
            {assembly.status === 'CLOSED' && 'Собрание закрыто. Скачайте протокол.'}
          </p>
          <div className="flex gap-2">
            {assembly.status === 'DRAFT' && (
              <button onClick={() => transition('ANNOUNCED')} disabled={transitioning}
                className="px-3 py-1.5 bg-amber text-ink rounded-lg text-xs font-medium disabled:opacity-50">
                Объявить
              </button>
            )}
            {assembly.status === 'ANNOUNCED' && (
              <>
                <button onClick={() => transition('DRAFT')} disabled={transitioning}
                  className="px-3 py-1.5 border border-border rounded-lg text-xs">
                  Вернуть в черновик
                </button>
                <button onClick={() => transition('VOTING')} disabled={transitioning}
                  className="px-3 py-1.5 bg-forest text-white rounded-lg text-xs font-medium disabled:opacity-50">
                  Открыть голосование
                </button>
              </>
            )}
            {assembly.status === 'VOTING' && (
              <button onClick={() => transition('CLOSED')} disabled={transitioning}
                className="px-3 py-1.5 bg-ink text-white rounded-lg text-xs font-medium disabled:opacity-50">
                Закрыть голосование
              </button>
            )}
            {assembly.status === 'CLOSED' && (
              <a href={`/api/assemblies/${assembly.id}/protocol`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-forest text-white rounded-lg text-xs font-medium">
                <Download size={12} /> Протокол PDF
              </a>
            )}
          </div>
        </div>
      )}

      {/* Eligibility notice */}
      {!membership.isOwner && (
        <div className="bg-cream border border-border rounded-2xl p-4 mb-5 text-sm text-ink/60">
          Голосовать могут только собственники. Вы зарегистрированы как наниматель/прочий участник — у вас доступ только на просмотр.
        </div>
      )}
      {membership.isOwner && (!membership.areaSqm || membership.areaSqm <= 0) && (
        <div className="bg-amber/5 border border-amber/30 rounded-2xl p-4 mb-5 text-sm text-ink/70">
          Площадь вашего объекта не указана. Обратитесь к администратору ЖК для верификации — без площади голос не учитывается.
        </div>
      )}

      {/* Questions */}
      <div className="space-y-3">
        {assembly.questions.map(q => {
          const myChoice = choices[q.id]
          const result = results?.questions.find(r => r.questionId === q.id)
          return (
            <div key={q.id} className="bg-white border border-border rounded-2xl p-5">
              <div className="flex items-start gap-2 mb-3">
                <span className="text-sm font-bold text-ink/40 mt-0.5">#{q.order + 1}</span>
                <div className="flex-1">
                  <p className="text-ink font-medium">{q.text}</p>
                  {q.description && (
                    <p className="text-sm text-ink/60 mt-1">{q.description}</p>
                  )}
                  <p className="text-xs text-ink/40 mt-2">
                    Требуется голосов «за»: {q.requiredMajorityPct}%
                  </p>
                </div>
              </div>

              {/* Voting buttons */}
              {canVote && (
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {(['FOR', 'AGAINST', 'ABSTAIN'] as Choice[]).map(c => {
                    const selected = myChoice === c
                    const Icon = c === 'FOR' ? ThumbsUp : c === 'AGAINST' ? ThumbsDown : Minus
                    const color = c === 'FOR' ? 'forest' : c === 'AGAINST' ? 'red-500' : 'gray-400'
                    return (
                      <button key={c}
                        onClick={() => setChoices(p => ({ ...p, [q.id]: c }))}
                        className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all border-2 ${
                          selected
                            ? c === 'FOR' ? 'bg-forest text-white border-forest'
                              : c === 'AGAINST' ? 'bg-red-500 text-white border-red-500'
                              : 'bg-gray-400 text-white border-gray-400'
                            : 'bg-white border-border text-ink hover:border-ink/30'
                        }`}>
                        <Icon size={14} />
                        {CHOICE_LABEL[c]}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Read-only: user already voted (not in voting mode) */}
              {!canVote && myChoice && assembly.status !== 'CLOSED' && (
                <div className="text-sm text-ink/60 mt-2">
                  Ваш голос: <span className="font-medium">{CHOICE_LABEL[myChoice]}</span>
                </div>
              )}

              {/* Results after CLOSED */}
              {result && assembly.status === 'CLOSED' && (
                <div className="mt-4 pt-4 border-t border-border space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink/70">
                      «За» <span className="font-semibold">{result.forPct.toFixed(1)}%</span>
                      {' · '}
                      {result.forArea.toFixed(1)} м² из {(result.forArea + result.againstArea + result.abstainArea).toFixed(1)} м²
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      result.passed ? 'bg-forest/10 text-forest' : 'bg-red-50 text-red-700'
                    }`}>
                      {result.passed ? 'ПРИНЯТО' : 'НЕ ПРИНЯТО'}
                    </span>
                  </div>
                  <div className="text-xs text-ink/60 grid grid-cols-3 gap-2">
                    <div>За: {result.forArea.toFixed(1)} м²</div>
                    <div>Против: {result.againstArea.toFixed(1)} м²</div>
                    <div>Воздерж.: {result.abstainArea.toFixed(1)} м²</div>
                  </div>
                  <div className="text-xs text-ink/50">
                    {result.majorityBasis === 'TOTAL' ? 'Считается от всех собственников' : 'Считается от проголосовавших'}
                    {' · не голосовали (справочно): '}
                    {result.notVotedArea.toFixed(1)} м² · {result.notVotedCount} соб.
                  </div>
                  {myChoice && (
                    <div className="text-xs text-ink/50 pt-1">
                      Ваш голос: {CHOICE_LABEL[myChoice]}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Final results summary */}
      {results && assembly.status === 'CLOSED' && (
        <div className="bg-white border border-border rounded-2xl p-5 mt-5">
          <h3 className="font-display font-bold text-base mb-3">Итоги собрания</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-ink/50 text-xs uppercase tracking-wider mb-1">Кворум</p>
              <p className="font-semibold">
                {results.quorumPct.toFixed(1)}% / {assembly.quorumPercent}%{' '}
                <span className={results.quorumReached ? 'text-forest' : 'text-red-600'}>
                  ({results.quorumReached ? 'достигнут' : 'не достигнут'})
                </span>
              </p>
            </div>
            <div>
              <p className="text-ink/50 text-xs uppercase tracking-wider mb-1">Проголосовало площади</p>
              <p className="font-semibold">
                {results.totalVotedArea.toFixed(1)} м² из {results.totalEligibleArea.toFixed(1)} м²
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Vote submit */}
      {canVote && (
        <div className="sticky bottom-0 bg-cream/95 backdrop-blur border-t border-border -mx-8 px-8 py-3 mt-5 flex items-center justify-between gap-3">
          <p className="text-xs text-ink/60">
            Ваш голос: {membership.areaSqm} м²
            {hasExistingVote && ' · уже проголосовали — можно изменить'}
          </p>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button onClick={submitVotes} disabled={!allAnswered || voting}
            className="px-5 py-2.5 bg-forest text-white rounded-xl text-sm font-medium disabled:opacity-50">
            {voting ? 'Отправляем...' : hasExistingVote ? 'Изменить голос' : 'Проголосовать'}
          </button>
        </div>
      )}

      {error && !canVote && <p className="text-red-500 text-sm mt-3">{error}</p>}
    </div>
  )
}
