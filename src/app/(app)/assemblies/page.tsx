import { Topbar } from '@/components/layout/Topbar';
import { Card, CardBody } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatDate } from '@/lib/utils';
import { Plus, Vote, Calendar, Users, FileText } from 'lucide-react';
import Link from 'next/link';

const ASSEMBLIES = [
  {
    id: '1',
    title: 'Ремонт кровли дома №12',
    status: 'VOTING',
    type: 'async',
    itemsCount: 3,
    votedCount: 47,
    totalCount: 120,
    startDate: new Date('2026-05-20'),
    deadline: new Date('2026-06-01'),
    myVoted: false,
  },
  {
    id: '2',
    title: 'Выбор управляющей компании на 2027 год',
    status: 'DISCUSSION',
    type: 'async',
    itemsCount: 5,
    votedCount: 0,
    totalCount: 120,
    startDate: new Date('2026-05-15'),
    deadline: new Date('2026-06-15'),
    myVoted: false,
  },
  {
    id: '3',
    title: 'Внеочередное ОСС — установка шлагбаума',
    status: 'ANNOUNCED',
    type: 'online',
    itemsCount: 2,
    votedCount: 0,
    totalCount: 120,
    startDate: new Date('2026-06-10'),
    deadline: new Date('2026-06-10'),
    myVoted: false,
  },
  {
    id: '4',
    title: 'Годовое ОСС 2025 — благоустройство',
    status: 'ARCHIVED',
    type: 'async',
    itemsCount: 7,
    votedCount: 98,
    totalCount: 120,
    startDate: new Date('2026-03-01'),
    deadline: new Date('2026-03-31'),
    myVoted: true,
  },
];

const STATUS_ORDER = ['VOTING', 'DISCUSSION', 'ANNOUNCED', 'CLOSED', 'SIGNED', 'ARCHIVED', 'DRAFT'];

export default function AssembliesPage() {
  const sorted = [...ASSEMBLIES].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
  );

  return (
    <div className="flex flex-col flex-1 overflow-y-auto">
      <Topbar
        title="Собрания"
        subtitle={`${ASSEMBLIES.filter(a => a.status !== 'ARCHIVED').length} активных`}
        actions={
          <Button variant="primary" size="sm" className="gap-1.5">
            <Plus size={14} />
            Созвать ОСС
          </Button>
        }
      />

      <div className="flex-1 px-6 py-5 space-y-3">

        {/* Status filter tabs */}
        <div className="flex gap-1.5">
          {['Все', 'Активные', 'Завершённые'].map((tab) => (
            <button
              key={tab}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                tab === 'Все'
                  ? 'bg-forest text-white font-medium'
                  : 'bg-white border border-[#D6D0C4] text-ink-mid hover:border-forest'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {sorted.map((a) => (
          <Link key={a.id} href={`/assemblies/${a.id}`}>
            <Card hover className="group">
              <CardBody className="py-4">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    a.type === 'online' ? 'bg-indigo-100' : 'bg-amber/10'
                  }`}>
                    {a.type === 'online'
                      ? <Vote size={18} className="text-indigo-600" />
                      : <FileText size={18} className="text-amber" />
                    }
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display text-sm font-bold text-ink leading-tight">
                        {a.title}
                      </h3>
                      <div className="flex items-center gap-2 shrink-0">
                        {!a.myVoted && a.status === 'VOTING' && (
                          <span className="text-[10px] font-bold text-amber bg-amber/10 px-2 py-0.5 rounded-full">
                            Нужен голос
                          </span>
                        )}
                        <StatusBadge status={a.status} />
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-ink-soft">
                      <span className="flex items-center gap-1">
                        <FileText size={11} />
                        {a.itemsCount} вопросов
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={11} />
                        {a.totalCount} участников
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={11} />
                        до {formatDate(a.deadline)}
                      </span>
                      <span className="text-ink-soft/60">
                        {a.type === 'online' ? 'Онлайн (ВКС)' : 'Заочное'}
                      </span>
                    </div>

                    {(a.status === 'VOTING' || a.status === 'CLOSED' || a.status === 'ARCHIVED') && (
                      <ProgressBar
                        value={a.votedCount}
                        max={a.totalCount}
                        label={`${a.votedCount} проголосовали`}
                        variant={a.status === 'ARCHIVED' ? 'emerald' : 'amber'}
                        className="pt-1"
                      />
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
