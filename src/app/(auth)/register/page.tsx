'use client';
import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Phone, Mail, MapPin, Building2, Hash, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type Step = 'contact' | 'sms' | 'apartment' | 'done';

const STEPS: { key: Step; label: string }[] = [
  { key: 'contact',   label: 'Контакты' },
  { key: 'sms',       label: 'Верификация' },
  { key: 'apartment', label: 'Квартира' },
  { key: 'done',      label: 'Готово' },
];

export default function RegisterPage() {
  const [step, setStep] = useState<Step>('contact');
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  async function handleNext() {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    const next = STEPS[stepIndex + 1];
    if (next) setStep(next.key);
  }

  function handleOtpChange(i: number, val: string) {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) {
      document.getElementById(`otp-${i + 1}`)?.focus();
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Регистрация</h1>
        <p className="text-sm text-ink-soft mt-1">30 секунд — и вы в системе</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {STEPS.map(({ key, label }, i) => (
          <div key={key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                i < stepIndex  && 'bg-forest text-white',
                i === stepIndex && 'bg-amber text-ink ring-4 ring-amber/20',
                i > stepIndex  && 'bg-cream-dark text-ink-soft',
              )}>
                {i < stepIndex ? <CheckCircle2 size={14} /> : i + 1}
              </div>
              <span className={cn(
                'text-[10px] whitespace-nowrap',
                i === stepIndex ? 'text-ink font-medium' : 'text-ink-soft'
              )}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn(
                'flex-1 h-0.5 mb-5 mx-1 transition-all',
                i < stepIndex ? 'bg-forest' : 'bg-cream-dark'
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="bg-white rounded-2xl border border-[#D6D0C4] p-6">

        {step === 'contact' && (
          <div className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="ivan@example.com"
              prefix={<Mail size={15} />}
              hint="Для входа без пароля (magic link)"
            />
            <Input
              label="Телефон"
              type="tel"
              placeholder="+7 (999) 000-00-00"
              prefix={<Phone size={15} />}
              hint="Для SMS-подтверждения и подписи документов"
            />
            <Button
              variant="primary"
              className="w-full mt-2"
              loading={loading}
              onClick={handleNext}
            >
              Получить SMS-код
            </Button>
          </div>
        )}

        {step === 'sms' && (
          <div className="space-y-4">
            <p className="text-sm text-ink-mid">
              Код отправлен на номер{' '}
              <span className="font-semibold text-ink">+7 (999) 000-00-00</span>
            </p>
            <div className="flex gap-2 justify-between">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  maxLength={1}
                  inputMode="numeric"
                  className={cn(
                    'w-full h-12 text-center text-xl font-bold border rounded-xl transition-all outline-none',
                    'border-[#D6D0C4] focus:border-forest focus:ring-2 focus:ring-forest/10',
                    digit && 'border-forest bg-forest/5'
                  )}
                />
              ))}
            </div>
            <p className="text-xs text-ink-soft text-center">
              Не получили?{' '}
              <button className="text-forest font-medium hover:underline">Отправить снова</button>
              {' '}через 55 с
            </p>
            <Button
              variant="primary"
              className="w-full"
              loading={loading}
              onClick={handleNext}
              disabled={otp.some((d) => !d)}
            >
              Подтвердить
            </Button>
          </div>
        )}

        {step === 'apartment' && (
          <div className="space-y-4">
            <Input
              label="Жилой комплекс"
              placeholder="Начните вводить название или адрес"
              prefix={<Building2 size={15} />}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Дом" placeholder="12" prefix={<MapPin size={15} />} />
              <Input label="Квартира" placeholder="47" prefix={<Hash size={15} />} />
            </div>
            <p className="text-xs text-ink-soft bg-cream-dark rounded-xl p-3">
              Администратор ЖК подтвердит ваше членство. До подтверждения вы можете пользоваться
              чатом и просматривать материалы.
            </p>
            <Button
              variant="primary"
              className="w-full"
              loading={loading}
              onClick={handleNext}
            >
              Зарегистрироваться
            </Button>
          </div>
        )}

        {step === 'done' && (
          <div className="text-center space-y-4 py-2">
            <div className="w-16 h-16 bg-forest rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} className="text-white" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-ink">Добро пожаловать!</h3>
              <p className="text-sm text-ink-soft mt-1">
                Вы зарегистрированы в ЖК «Садовый».<br />
                Ожидайте подтверждения администратора.
              </p>
            </div>
            <Link href="/dashboard">
              <Button variant="primary" className="w-full">Перейти в личный кабинет</Button>
            </Link>
          </div>
        )}
      </div>

      {step === 'contact' && (
        <p className="text-center text-xs text-ink-soft">
          Уже зарегистрированы?{' '}
          <Link href="/login" className="text-forest font-medium hover:underline">Войти</Link>
        </p>
      )}
    </div>
  );
}
