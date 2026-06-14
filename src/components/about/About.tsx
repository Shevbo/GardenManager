import { User, FileSignature, FileText, PenLine } from 'lucide-react'

const GUIDE = [
  {
    icon: User, title: 'Профиль',
    points: [
      'Укажите ФИО, телефон и e-mail. Телефон подтверждается кодом из СМС — он нужен для подписания.',
      'Адрес проживания подставляется в заявления автоматически.',
      'В разделе «Подтверждение собственности» добавляйте объекты (квартиру/дом) и подписывайте декларацию через СМС — так ваш голос учитывается как собственника.',
    ],
  },
  {
    icon: FileSignature, title: 'Заявления',
    points: [
      'Создайте заявление, при желании примените готовый шаблон («Добавить текст из шаблона») с предпросмотром.',
      'Нажмите «Обработать юристом ИИ» — он улучшит формулировки и сошлётся на нормы. Можно применить рекомендацию к тексту.',
      'Опубликуйте на обсуждение, соберите комментарии и реакции, затем откройте подписание.',
      'Готовый документ экспортируется в PDF и .doc с шапкой, реестром подписантов и нумерацией.',
    ],
  },
  {
    icon: FileText, title: 'Мои документы',
    points: [
      'Индивидуальные бланки (например, заявление в полицию, объяснение) заполняются из шаблонов.',
      'Документ можно подписать через СМС и привязать к коллективному заявлению как приложение.',
    ],
  },
  {
    icon: PenLine, title: 'Подписание',
    points: [
      'Подписание — только через код из СМС на ваш подтверждённый номер (простая электронная подпись).',
      'Каждая подпись попадает в реестр подписантов документа с защитой персональных данных.',
    ],
  },
]

const FAQ = [
  { q: 'Как добавить дом?', a: 'В профиле, в разделе «Подтверждение собственности», нажмите «Добавить объект собственности», введите адрес (подсказки КЛАДР) и квартиру, затем подпишите декларацию через СМС. Если дома ещё нет в базе — он будет добавлен; если он не привязан к организации, объект помечается «без организации».' },
  { q: 'Как организовать новую активность?', a: 'Раздел «Активности» сейчас в разработке. Скоро вы сможете создавать сообщества по интересам (автомобилисты, родители, экология и т.д.) и вести их заявления.' },
  { q: 'Как написать коллективное заявление?', a: 'Откройте «Заявления» → «Создать». Выберите шаблон или напишите текст, заполните «Кому» и «От кого», при необходимости обработайте юристом ИИ. Опубликуйте на обсуждение — соседи комментируют и подписывают. После сбора подписей экспортируйте готовый PDF.' },
  { q: 'Что такое юрист ИИ?', a: 'Это встроенный помощник — ведущий юрист по жилищному праву. Он отвечает на вопросы по вашему документу, ссылается на нормы (ЖК РФ, ГК РФ и др.), улучшает текст и может искать актуальную информацию. Его ответы можно применить к тексту заявления и экспортировать.' },
  { q: 'Как подписать документ?', a: 'Нажмите «Подписать», подтвердите согласие и введите код из СМС, который придёт на ваш номер. Подпись юридически значима (ст. 5 и 9 Федерального закона № 63-ФЗ).' },
  { q: 'Нашёл баг или хочу новую функцию — куда писать?', a: 'На support@shectory.ru. Мы читаем каждое сообщение, разбираем и обсуждаем.' },
]

const h2: React.CSSProperties = { fontFamily: 'Unbounded, sans-serif', fontSize: '20px', fontWeight: 700, color: 'var(--ink)', margin: '0 0 16px', letterSpacing: '-0.02em' }

export function About() {
  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--cream)' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '28px 24px 80px', fontFamily: 'Golos Text, sans-serif', color: 'var(--ink)' }}>
        <h1 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: 'clamp(22px, 3vw, 28px)', fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.02em' }}>О проекте</h1>
        <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--ink-mid)', margin: '0 0 28px' }}>
          Garden Manager помогает жителям действовать сообща: составлять коллективные заявления, подписывать их через СМС и направлять адресату. Ниже — как пользоваться порталом и ответы на частые вопросы.
        </p>

        <h2 style={h2}>Инструкция</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '32px' }}>
          {GUIDE.map(({ icon: Icon, title, points }) => (
            <div key={title} style={{ background: 'white', border: '1px solid var(--cream-dark)', borderRadius: '14px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: 'var(--forest)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={17} style={{ color: 'white' }} />
                </div>
                <h3 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '15px', fontWeight: 700, margin: 0 }}>{title}</h3>
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {points.map((p, i) => <li key={i} style={{ fontSize: '14px', lineHeight: 1.55, color: 'var(--ink-soft)' }}>{p}</li>)}
              </ul>
            </div>
          ))}
        </div>

        <h2 style={h2}>Частые вопросы</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {FAQ.map(({ q, a }, i) => (
            <details key={i} style={{ background: 'white', border: '1px solid var(--cream-dark)', borderRadius: '12px', padding: '14px 18px' }}>
              <summary style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '15px', fontWeight: 600, color: 'var(--ink)', cursor: 'pointer', listStyle: 'none' }}>{q}</summary>
              <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--ink-soft)', margin: '10px 0 0' }}>{a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  )
}
