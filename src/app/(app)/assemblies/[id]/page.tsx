'use client';
import { useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardBody, CardHeader, CardFooter } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatDate, formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  ChevronLeft, FileText, MessageSquare, CheckCircle2,
  AlertCircle, Clock, Users, Download, ThumbsUp, ThumbsDown, Minus
} from 'lucide-react';
import Link from 'next/link';

const ASSEMBLY = {
  id: '1',
  title: 'Ремонт кровли дома №12',
  status: 'VOTING',
  type: 'async',
  description: 'Плановый капитальный ремонт кровли по решению общего собрания. Смета согласована с подрядчиком ООО "СтройКомфорт".',
  startDate: new Date('2026-05-20'),
  deadline: new Date('2026-06-01'),
  votedCount: 47,
  totalCount: 120,
  quorumHeads: 50,
  quorumArea: 50,
  items: [
    {
      id: 'q1',
      order: 1,
      title: 'Утвердить план работ по ремонту кровли',
      description: 'Ремонт кровли дома №12 в объёме согласно сметной документации. Подрядчик — ООО "СтройКомфорт", срок — июль 2026.',
      docs: [{ name: 'Смета 2026.pdf', size: '1.2 МБ' }, { name: 'Договор_подряда.pdf', size: '800 КБ' }],
      myVote: null as 'FOR' | 'AGAINST' | 'ABSTAIN' | null,
    },
    {
      id: 'q2',
      order: 2,
      title: 'Утвердить мандатный сбор 1 500 руб./кв.м',
      description: `Сбор на ремонт кровли из расчёта ${formatCurrency(1500)} с квадратного метра площади квартиры. Срок уплаты — до 15.06.2026.`,
      docs: [{ name: 'Расчёт взносов.xlsx', size: '250 КБ' }],
      myVote: null as 'FOR' | 'AGAINST' | 'ABSTAIN' | null,
    },
    {
      id: 'q3',
      order: 3,
      title: 'Назначить казначея для контроля расходов',
      description: 'Назначить Петрову Ирину Алексеевну (кв. 23) ответственным казначеем сбора с правом подписи платёжных поручений.',
      docs: [],
      myVote: null as 'FOR' | 'AGAINST' | 'ABSTAIN' | null,
    },
  ],
};

type VoteAnswer = 'FOR' | 'AGAINST' | 'ABSTAIN';

const VOTE_OPTIONS: { value: VoteAnswer; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'FOR',     label: 'За',           icon: ThumbsUp,   color: 'border-emerald-400 bg-emerald-50 text-emerald-700' },
  { value: 'AGAINST', label: 'Против',       icon: ThumbsDown, color: 'border-red-400 bg-red-50 text-red-700' },
  { value: 'ABSTAIN', label: 'Воздержался',  icon: Minus,      color: 'border-gray-300 bg-gray-50 text-gray-600' },
];

export default function AssemblyDetailPage() {
  const [votes, setVotes] = useState<Record<string, VoteAnswer | null>>(
    Object.fromEntries(ASSEMBLY.items.map((i) => [i.id, i.myVote]))
  );
  const [confirmStep, setConfirmStep] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const allVoted = ASSEMBLY.items.every((item) => votes[item.id] !== null);

  async function handleSubmit() {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1200));
    setSubmitting(false);
    setSubmitted(true);
  }

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title={ASSEMBLY.title}
        subtitle={`ОСС · Заочное`}
        actions={
          <Link href="/assemblies">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ChevronLeft size={14} /> Назад
            </Button>
          </Link>
        }
      />

      <div className="flex-1 px-6 py-5">
        <div className="grid grid-cols-12 gap-4">

          {/* Main column */}
          <div className="col-span-8 space-y-4">

            {/* Meta card */}
            <Card>
              <CardBody className="flex flex-wrap gap-5">
                <div className="flex items-center gap-2.5">
                  <StatusBadge status={ASSEMBLY.status} />
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock size={14} className="text-ink-soft" />
                  <span className="text-ink-soft">Голосование до</span>
                  <span className="font-semibold">{formatDate(ASSEMBLY.deadline)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users size={14} className="text-ink-soft" />
                  <span className="text-ink-soft">{ASSEMBLY.votedCount} из {ASSEMBLY.totalCount} проголосовали</span>
                </div>
              </CardBody>
              <div className="px-5 pb-4">
                <ProgressBar
                  value={ASSEMBLY.votedCount}
                  max={ASSEMBLY.totalCount}
                  variant="amber"
                />
              </div>
            </Card>

            {/* Voting form */}
            {!submitted ? (
              <div className="space-y-3">
                <h2 className="font-display text-base font-bold text-ink">Анкета голосования</h2>

                {ASSEMBLY.items.map((item) => (
                  <Card key={item.id}>
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-lg bg-forest text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {item.order}
                        </span>
                        <h3 className="font-display text-sm font-bold text-ink leading-tight">
                          {item.title}
                        </h3>
                      </div>
                    </CardHeader>
                    <CardBody className="space-y-3">
                      <p className="text-sm text-ink-mid leading-relaxed">{item.description}</p>

                      {item.docs.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {item.docs.map((doc) => (
                            <button
                              key={doc.name}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-cream-dark rounded-lg text-xs text-ink-mid hover:bg-cream transition-colors"
                            >
                              <FileText size={12} />
                              <span>{doc.name}</span>
                              <span className="text-ink-soft ml-1">{doc.size}</span>
                              <Download size={11} className="ml-1 text-ink-soft" />
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Vote buttons */}
                      <div className="flex gap-2 pt-1">
                        {VOTE_OPTIONS.map(({ value, label, icon: Icon, color }) => {
                          const selected = votes[item.id] === value;
                          return (
                            <button
                              key={value}
                              onClick={() => setVotes((v) => ({ ...v, [item.id]: value }))}
                              className={cn(
                                'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-medium transition-all duration-150',
                                selected ? color : 'border-[#D6D0C4] bg-white text-ink-soft hover:border-forest/40',
                                'active:scale-[0.97]'
                              )}
                            >
                              <Icon size={15} />
                              {label}
                            </button>
                          );
                        })}
                      </div>

                      <button className="flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink transition-colors">
                        <MessageSquare size={12} />
                        Обсудить (4 комментария)
                      </button>
                    </CardBody>
                  </Card>
                ))}

                {/* Submit */}
                {!confirmStep ? (
                  <Button
                    variant="amber"
                    className="w-full"
                    disabled={!allVoted}
                    onClick={() => setConfirmStep(true)}
                  >
                    {allVoted ? 'Подтвердить голос через НКЭП (SMS)' : `Ответьте на все ${ASSEMBLY.items.length} вопроса`}
                  </Button>
                ) : (
                  <Card>
                    <CardBody className="space-y-3">
                      <div className="flex items-start gap-3">
                        <AlertCircle size={16} className="text-amber shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-ink">Подтверждение голоса через НКЭП</p>
                          <p className="text-xs text-ink-soft mt-1">
                            На ваш телефон +7 (999) ••• ••-00 придёт SMS с кодом подписи.
                            После подтверждения голос нельзя изменить.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="secondary" className="flex-1" onClick={() => setConfirmStep(false)}>
                          Пересмотреть
                        </Button>
                        <Button variant="primary" className="flex-1" loading={submitting} onClick={handleSubmit}>
                          Отправить SMS
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                )}
              </div>
            ) : (
              <Card>
                <CardBody className="text-center py-8 space-y-3">
                  <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto">
                    <CheckCircle2 size={28} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold text-ink">Голос учтён</h3>
                    <p className="text-sm text-ink-soft mt-1">Подписан через НКЭП. Спасибо за участие!</p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 pt-1">
                    {ASSEMBLY.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-1.5 text-xs bg-cream-dark px-2.5 py-1 rounded-full">
                        <span className="text-ink-soft">Вопрос {item.order}:</span>
                        <span className={cn(
                          'font-medium',
                          votes[item.id] === 'FOR'     && 'text-emerald-600',
                          votes[item.id] === 'AGAINST' && 'text-red-500',
                          votes[item.id] === 'ABSTAIN' && 'text-gray-500',
                        )}>
                          {votes[item.id] === 'FOR' ? 'ЗА' : votes[item.id] === 'AGAINST' ? 'ПРОТИВ' : 'ВОЗДЕРЖАЛСЯ'}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="col-span-4 space-y-3">
            <Card>
              <CardHeader className="py-3">
                <h4 className="font-display text-xs font-bold text-ink">Кворум</h4>
              </CardHeader>
              <CardBody className="space-y-3 py-3">
                <ProgressBar
                  value={ASSEMBLY.votedCount}
                  max={ASSEMBLY.totalCount}
                  label="По головам"
                  sublabel={`${Math.round((ASSEMBLY.votedCount / ASSEMBLY.totalCount) * 100)}% / 50%`}
                  variant={ASSEMBLY.votedCount / ASSEMBLY.totalCount >= 0.5 ? 'emerald' : 'amber'}
                />
                <ProgressBar
                  value={34}
                  max={100}
                  label="По площади"
                  sublabel="34% / 50%"
                  variant="amber"
                />
                <p className="text-xs text-ink-soft bg-cream-dark rounded-lg p-2.5">
                  Для принятия решений необходимо &gt;50% участников и &gt;50% площади
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardHeader className="py-3">
                <h4 className="font-display text-xs font-bold text-ink">Документы</h4>
              </CardHeader>
              <CardBody className="py-2 space-y-1">
                {['Повестка ОСС.pdf', 'Уведомление.pdf'].map((doc) => (
                  <button
                    key={doc}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-cream-dark transition-colors text-sm"
                  >
                    <FileText size={13} className="text-forest shrink-0" />
                    <span className="flex-1 text-left text-xs text-ink truncate">{doc}</span>
                    <Download size={11} className="text-ink-soft shrink-0" />
                  </button>
                ))}
              </CardBody>
            </Card>

            <Card>
              <CardHeader className="py-3">
                <h4 className="font-display text-xs font-bold text-ink">Хронология</h4>
              </CardHeader>
              <CardBody className="py-2">
                <div className="space-y-2">
                  {[
                    { date: '20 мая', label: 'Опубликована повестка', done: true },
                    { date: '20–27 мая', label: 'Период обсуждения', done: true },
                    { date: '27 мая', label: 'Открыто голосование', done: true, active: true },
                    { date: '1 июня', label: 'Закрытие голосования', done: false },
                    { date: 'После', label: 'Генерация протокола', done: false },
                    { date: 'После', label: 'Подпись через НКЭП', done: false },
                  ].map(({ date, label, done, active }) => (
                    <div key={label} className="flex items-start gap-2.5">
                      <div className={cn(
                        'w-2 h-2 rounded-full mt-1.5 shrink-0',
                        active ? 'bg-amber ring-2 ring-amber/30' : done ? 'bg-forest' : 'bg-cream-dark border border-[#D6D0C4]'
                      )} />
                      <div>
                        <p className={cn('text-xs font-medium', done ? 'text-ink' : 'text-ink-soft')}>{label}</p>
                        <p className="text-[10px] text-ink-soft/60">{date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
