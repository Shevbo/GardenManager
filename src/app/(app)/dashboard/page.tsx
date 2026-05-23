import { Topbar } from '@/components/layout/Topbar';
import { Card, CardBody, CardHeader, CardFooter } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { formatDate, formatCurrency } from '@/lib/utils';
import {
  Vote, TrendingUp, Users, AlertCircle,
  ChevronRight, Clock, CheckCircle2, FileText, Pen,
} from 'lucide-react';

const ACTIVE_ASSEMBLY = {
  id: '1',
  title: 'Ремонт кровли дома №12',
  status: 'VOTING',
  deadline: new Date('2026-06-01'),
  votedCount: 47,
  totalCount: 120,
  quorumPct: 50,
};

const URGENT_PETITION = {
  id: '2',
  title: 'Обращение в УК по уборке территории',
  signedCount: 89,
  requiredCount: 100,
};

const FINANCE_GOAL = {
  id: '3',
  title: 'Замена домофонов',
  collected: 145000,
  target: 200000,
  myContribution: 1500,
  myDue: 1500,
};

const ACTIVITIES = [
  { id: '1', title: 'Покраска подъезда №3',     status: 'В работе',  deadline: new Date('2026-05-30') },
  { id: '2', title: 'Обрезка деревьев',          status: 'Выполнено', deadline: new Date('2026-05-15') },
  { id: '3', title: 'Установка видеонаблюдения', status: 'В работе',  deadline: new Date('2026-06-20') },
  { id: '4', title: 'Ремонт детской площадки',   status: 'План',      deadline: new Date('2026-07-01') },
];

export default function DashboardPage() {
  const now = new Date();
  const daysLeft = Math.ceil((ACTIVE_ASSEMBLY.deadline.getTime() - now.getTime()) / 86400000);

  return (
    <div className="flex flex-col" style={{ height: '100vh' }}>
      <Topbar
        title="Главная"
        subtitle="ЖК «Садовый» · Москва, ул. Садовая 12"
      />

      <div className="flex flex-col gap-5 px-5 py-4 flex-1 min-h-0">

        {/* Stats strip */}
        <div className="grid grid-cols-4 gap-4 shrink-0">
          {[
            { label: 'Собственников', value: '120', icon: Users },
            { label: 'Голосований',   value: '1',   icon: Vote },
            { label: 'Активностей',   value: '4',   icon: CheckCircle2 },
            { label: 'Уведомлений',   value: '7',   icon: AlertCircle },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label}>
              <CardBody className="flex items-center gap-4 py-5">
                <div className="w-10 h-10 bg-[#F0EDE6] flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-[#0A3D2E]" />
                </div>
                <div>
                  <p className="font-display text-2xl font-bold text-[#1A1A18] leading-none">{value}</p>
                  <p className="text-sm text-[#6B6B63] mt-1.5">{label}</p>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>

        {/* Main 3-column layout — fills remaining height */}
        <div className="flex gap-5 flex-1 min-h-0">

          {/* Col 1: Assembly (widest) */}
          <div className="flex flex-col" style={{ flex: '0 0 38%' }}>
            <Card className="flex flex-col h-full">
              <CardHeader className="shrink-0">
                <p className="text-xs text-[#6B6B63] uppercase tracking-wide mb-2">Активное собрание</p>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-base font-semibold text-[#1A1A18] leading-snug">
                    {ACTIVE_ASSEMBLY.title}
                  </h2>
                  <StatusBadge status={ACTIVE_ASSEMBLY.status} />
                </div>
              </CardHeader>

              <CardBody className="flex flex-col flex-1 gap-4">
                <ProgressBar
                  value={ACTIVE_ASSEMBLY.votedCount}
                  max={ACTIVE_ASSEMBLY.totalCount}
                  label={`Проголосовали ${ACTIVE_ASSEMBLY.votedCount} из ${ACTIVE_ASSEMBLY.totalCount}`}
                  sublabel={`${Math.round((ACTIVE_ASSEMBLY.votedCount / ACTIVE_ASSEMBLY.totalCount) * 100)}%`}
                  variant="amber"
                />

                <div className="flex items-center gap-2 text-sm text-[#6B6B63]">
                  <Clock size={14} className="shrink-0" />
                  <span>Закрывается</span>
                  <span className="font-medium text-[#1A1A18]">{formatDate(ACTIVE_ASSEMBLY.deadline)}</span>
                  <span className={`ml-auto font-semibold tabular-nums ${daysLeft <= 3 ? 'text-red-600' : 'text-[#1A1A18]'}`}>
                    {daysLeft} дн.
                  </span>
                </div>

                <div className="mt-auto p-3 bg-[#FFF8EC] border border-[#F0D080]">
                  <div className="flex items-start gap-2.5 mb-3">
                    <AlertCircle size={15} className="text-[#8A5A00] shrink-0 mt-0.5" />
                    <p className="text-sm text-[#5A3C00]">Вы ещё не проголосовали по этому вопросу</p>
                  </div>
                  <Button variant="amber" size="sm" className="w-full">Перейти к голосованию</Button>
                </div>
              </CardBody>

              <CardFooter className="flex items-center justify-between shrink-0">
                <span className="text-xs text-[#6B6B63]">Кворум: {ACTIVE_ASSEMBLY.quorumPct}% от площади</span>
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  Открыть <ChevronRight size={13} />
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Col 2: Petition + Finance */}
          <div className="flex flex-col gap-5" style={{ flex: '0 0 30%' }}>
            <Card className="flex flex-col">
              <CardHeader>
                <p className="text-xs text-[#6B6B63] uppercase tracking-wide mb-2">Сбор подписей</p>
                <div className="flex items-start gap-2.5">
                  <Pen size={14} className="text-[#0A3D2E] mt-0.5 shrink-0" />
                  <p className="text-sm font-medium text-[#1A1A18] leading-snug">
                    {URGENT_PETITION.title}
                  </p>
                </div>
              </CardHeader>
              <CardBody className="flex flex-col gap-4">
                <ProgressBar
                  value={URGENT_PETITION.signedCount}
                  max={URGENT_PETITION.requiredCount}
                  label={`${URGENT_PETITION.signedCount} из ${URGENT_PETITION.requiredCount} подписей`}
                  variant="forest"
                />
                <Button variant="primary" size="sm">Подписать</Button>
              </CardBody>
            </Card>

            <Card className="flex flex-col flex-1">
              <CardHeader>
                <p className="text-xs text-[#6B6B63] uppercase tracking-wide mb-2">Финансовый сбор</p>
                <div className="flex items-start gap-2.5">
                  <TrendingUp size={14} className="text-[#0A3D2E] mt-0.5 shrink-0" />
                  <p className="text-sm font-medium text-[#1A1A18]">{FINANCE_GOAL.title}</p>
                </div>
              </CardHeader>
              <CardBody className="flex flex-col gap-4">
                <ProgressBar
                  value={FINANCE_GOAL.collected}
                  max={FINANCE_GOAL.target}
                  label={formatCurrency(FINANCE_GOAL.collected)}
                  sublabel={`из ${formatCurrency(FINANCE_GOAL.target)}`}
                  variant="forest"
                />
                <div className="flex items-center justify-between text-sm pt-3 border-t border-[#E0DBD0]">
                  <span className="text-[#6B6B63]">Ваш взнос</span>
                  <span className="font-semibold text-[#1A6B3A]">
                    {FINANCE_GOAL.myContribution >= FINANCE_GOAL.myDue ? '✓ Оплачено' : formatCurrency(FINANCE_GOAL.myDue)}
                  </span>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Col 3: Activities */}
          <div className="flex flex-col flex-1 min-w-0">
            <Card className="flex flex-col h-full">
              <CardHeader className="flex items-center justify-between shrink-0">
                <p className="text-xs text-[#6B6B63] uppercase tracking-wide">Активности</p>
                <Button variant="ghost" size="sm" className="text-xs gap-0.5 -mr-1">
                  Все <ChevronRight size={12} />
                </Button>
              </CardHeader>
              <div className="flex flex-col divide-y divide-[#E0DBD0] flex-1">
                {ACTIVITIES.map((a) => (
                  <div key={a.id} className="flex flex-col gap-2 px-5 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-[#1A1A18] leading-snug">{a.title}</p>
                      <div className={`w-1.5 h-1.5 mt-1.5 shrink-0 ${
                        a.status === 'Выполнено' ? 'bg-[#1A6B3A]'
                        : a.status === 'В работе' ? 'bg-[#E8A020]'
                        : 'bg-[#C0BBB0]'
                      }`} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#6B6B63]">{a.status}</span>
                      <span className="text-xs text-[#6B6B63]">{formatDate(a.deadline)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
