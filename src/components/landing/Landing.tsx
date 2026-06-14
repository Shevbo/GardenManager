import Link from 'next/link'
import { FileSignature, Scale, MessageSquareText, ListChecks, FileDown, Vote, Coins, Users, ArrowRight, Building2 } from 'lucide-react'

const FEATURES = [
  { icon: FileSignature, title: 'Коллективные заявления', text: 'Создавайте обращения, претензии и иски от лица жителей. Обсуждайте и дорабатывайте вместе.' },
  { icon: Scale, title: 'Юрист ИИ', text: 'Встроенный юрист по жилищному праву: правит текст, отвечает на вопросы, ссылается на нормы.' },
  { icon: MessageSquareText, title: 'СМС-подписание', text: 'Подпись простой электронной подписью через код из СМС — юридически значимо.' },
  { icon: ListChecks, title: 'Реестр подписантов', text: 'Каждый документ собирает подтверждённый реестр с защитой персональных данных.' },
  { icon: FileDown, title: 'Экспорт в PDF и .doc', text: 'Готовый официальный документ с шапкой, реестром и нумерацией — в один клик.' },
]

const STEPS = [
  { n: '1', title: 'Регистрация', text: 'Войдите по номеру телефона и подтвердите его кодом из СМС.' },
  { n: '2', title: 'Подтверждение собственности', text: 'Укажите свой объект (квартиру/дом) и подпишите декларацию через СМС.' },
  { n: '3', title: 'Участие', text: 'Создавайте и подписывайте коллективные заявления вашего дома или сообщества.' },
]

const SOON = [
  { icon: Vote, label: 'Собрания и голосования' },
  { icon: Coins, label: 'Сборы средств' },
  { icon: Users, label: 'Активности и движения' },
]

export function Landing() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', fontFamily: 'Golos Text, sans-serif', color: 'var(--ink)' }}>
      {/* Top bar */}
      <header style={{ maxWidth: '1080px', margin: '0 auto', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '34px', height: '34px', background: 'var(--amber)', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={18} style={{ color: 'var(--ink)' }} />
          </div>
          <div>
            <div style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 700, fontSize: '15px', lineHeight: 1 }}>Garden</div>
            <div style={{ fontSize: '11px', color: 'var(--ink-soft)' }}>Manager</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link href="/login" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--forest)', padding: '9px 16px', borderRadius: '10px', textDecoration: 'none', border: '1px solid var(--cream-dark)' }}>Войти</Link>
          <Link href="/register" style={{ fontSize: '14px', fontWeight: 600, color: 'white', background: 'var(--forest)', padding: '9px 18px', borderRadius: '10px', textDecoration: 'none' }}>Зарегистрироваться</Link>
        </div>
      </header>

      {/* Hero */}
      <section style={{ maxWidth: '860px', margin: '0 auto', padding: '48px 24px 40px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: 'clamp(28px, 5vw, 46px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.03em', margin: '0 0 18px' }}>
          Голос жителей,<br />оформленный по закону
        </h1>
        <p style={{ fontSize: 'clamp(15px, 2.2vw, 19px)', lineHeight: 1.6, color: 'var(--ink-mid)', margin: '0 auto 28px', maxWidth: '620px' }}>
          Garden Manager — платформа коллективных обращений жителей ЖК, гаражных кооперативов и территориальных сообществ. Вместе составляйте заявления, подписывайте их через СМС и направляйте адресату.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 600, color: 'white', background: 'var(--forest)', padding: '13px 24px', borderRadius: '12px', textDecoration: 'none' }}>
            Начать <ArrowRight size={17} />
          </Link>
          <Link href="/login" style={{ fontSize: '15px', fontWeight: 500, color: 'var(--forest)', padding: '13px 24px', borderRadius: '12px', textDecoration: 'none', border: '1px solid var(--cream-dark)', background: 'white' }}>
            У меня уже есть аккаунт
          </Link>
        </div>
      </section>

      {/* Features */}
      <section style={{ maxWidth: '1080px', margin: '0 auto', padding: '24px 24px 16px' }}>
        <h2 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '22px', fontWeight: 700, textAlign: 'center', margin: '0 0 28px' }}>Что умеет портал</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} style={{ background: 'white', border: '1px solid var(--cream-dark)', borderRadius: '16px', padding: '22px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '11px', background: 'var(--forest)', opacity: 0.95, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                <Icon size={21} style={{ color: 'white' }} />
              </div>
              <h3 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '15px', fontWeight: 700, margin: '0 0 8px' }}>{title}</h3>
              <p style={{ fontSize: '14px', lineHeight: 1.55, color: 'var(--ink-soft)', margin: 0 }}>{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Steps */}
      <section style={{ maxWidth: '1080px', margin: '0 auto', padding: '40px 24px 16px' }}>
        <h2 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '22px', fontWeight: 700, textAlign: 'center', margin: '0 0 28px' }}>Как начать</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          {STEPS.map(({ n, title, text }) => (
            <div key={n} style={{ background: 'white', border: '1px solid var(--cream-dark)', borderRadius: '16px', padding: '22px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--amber)', color: 'var(--ink)', fontFamily: 'Unbounded, sans-serif', fontWeight: 700, fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>{n}</div>
              <h3 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '15px', fontWeight: 700, margin: '0 0 8px' }}>{title}</h3>
              <p style={{ fontSize: '14px', lineHeight: 1.55, color: 'var(--ink-soft)', margin: 0 }}>{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SMS signing explainer */}
      <section style={{ maxWidth: '760px', margin: '0 auto', padding: '40px 24px 16px' }}>
        <div style={{ background: 'var(--forest)', borderRadius: '20px', padding: 'clamp(24px, 4vw, 36px)', color: 'white' }}>
          <h2 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '20px', fontWeight: 700, margin: '0 0 12px' }}>Почему СМС-подпись действительна</h2>
          <p style={{ fontSize: '15px', lineHeight: 1.65, color: 'rgba(255,255,255,0.85)', margin: 0 }}>
            Код из СМС — это простая электронная подпись (ч. 2 ст. 5 Федерального закона № 63-ФЗ «Об электронной подписи»). Ваш номер закреплён за вами оператором связи по паспорту (ст. 44 Федерального закона № 126-ФЗ «О связи»), поэтому подпись подтверждает именно ваше согласие. Документ, подписанный так, признаётся равнозначным бумажному с собственноручной подписью (ст. 9 № 63-ФЗ).
          </p>
        </div>
      </section>

      {/* Coming soon */}
      <section style={{ maxWidth: '1080px', margin: '0 auto', padding: '40px 24px 16px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '18px', fontWeight: 700, color: 'var(--ink-soft)', margin: '0 0 18px' }}>Скоро на платформе</h2>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {SOON.map(({ icon: Icon, label }) => (
            <div key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'white', border: '1px dashed var(--cream-dark)', borderRadius: '999px', padding: '9px 16px', color: 'var(--ink-soft)', fontSize: '14px' }}>
              <Icon size={16} /> {label}
            </div>
          ))}
        </div>
      </section>

      {/* Support / feedback */}
      <section style={{ maxWidth: '760px', margin: '0 auto', padding: '40px 24px 20px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '20px', fontWeight: 700, margin: '0 0 10px' }}>Нашли ошибку или нужна новая функция?</h2>
        <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--ink-mid)', margin: '0 0 18px' }}>
          Напишите нам — мы прочитаем каждое сообщение, разберём и обсудим.
        </p>
        <a href="mailto:support@shectory.ru" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 600, color: 'var(--forest)', background: 'white', border: '1px solid var(--cream-dark)', padding: '12px 22px', borderRadius: '12px', textDecoration: 'none' }}>
          support@shectory.ru
        </a>
      </section>

      <footer style={{ maxWidth: '1080px', margin: '0 auto', padding: '24px', textAlign: 'center', color: 'var(--ink-soft)', fontSize: '12px' }}>
        Garden Manager · платформа коллективных обращений жителей
      </footer>
    </div>
  )
}
