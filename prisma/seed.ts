import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: 'zhk-sad' },
    update: {},
    create: {
      slug: 'zhk-sad',
      name: 'ЖК Сад',
      type: 'zhk',
    },
  })
  console.log('Organization:', org.name)

  const admin = await prisma.user.upsert({
    where: { email: 'bshevelev75@gmail.com' },
    update: {},
    create: {
      email: 'bshevelev75@gmail.com',
      name: 'Борис Шевелёв',
      emailVerified: new Date(),
    },
  })

  await prisma.membership.upsert({
    where: { userId_orgId: { userId: admin.id, orgId: org.id } },
    update: {},
    create: {
      userId: admin.id,
      orgId: org.id,
      role: 'org_admin',
      isOwner: false,
    },
  })

  console.log('Admin:', admin.email)

  const templates = [
    {
      category: 'Полиция', title: 'Заявление в дежурную часть (ОМВД)',
      scope: 'individual', layoutKey: 'police-statement',
      bodyTemplate: null,
      variables: [
        { name: 'addressee_org', label: 'Адресат (орган)', type: 'text', required: true, source: 'manual' },
        { name: 'addressee_rank', label: 'Звание', type: 'text', required: false, source: 'manual' },
        { name: 'addressee_name', label: 'ФИО адресата', type: 'text', required: false, source: 'manual' },
        { name: 'applicant_name', label: 'ФИО заявителя', type: 'text', required: true, source: 'profile' },
        { name: 'applicant_birthdate', label: 'Дата рождения', type: 'date', required: false, source: 'manual' },
        { name: 'applicant_address', label: 'Адрес проживания', type: 'text', required: true, source: 'profile' },
        { name: 'applicant_phone', label: 'Телефон', type: 'text', required: true, source: 'profile' },
        { name: 'applicant_email', label: 'Эл. почта', type: 'text', required: false, source: 'profile' },
        { name: 'statement_body', label: 'Суть заявления (Прошу Вас…)', type: 'multiline', required: true, source: 'manual' },
        { name: 'sign_date', label: 'Дата', type: 'date', required: true, source: 'manual' },
      ],
    },
    {
      category: 'Полиция', title: 'Объяснение',
      scope: 'individual', layoutKey: 'explanation', bodyTemplate: null,
      variables: [
        { name: 'city', label: 'Город', type: 'text', required: true, source: 'manual' },
        { name: 'taker_line', label: 'Кто принял объяснение', type: 'text', required: false, source: 'manual' },
        { name: 'applicant_name', label: 'ФИО', type: 'text', required: true, source: 'profile' },
        { name: 'applicant_birthdate', label: 'Дата рождения', type: 'date', required: false, source: 'manual' },
        { name: 'applicant_address', label: 'Место регистрации', type: 'text', required: true, source: 'profile' },
        { name: 'workplace', label: 'Место работы', type: 'text', required: false, source: 'manual' },
        { name: 'applicant_phone', label: 'Телефон', type: 'text', required: true, source: 'profile' },
        { name: 'explanation_body', label: 'Пояснения по существу', type: 'multiline', required: true, source: 'manual' },
      ],
    },
    {
      category: 'Общее', title: 'Коллективное обращение (свободная форма)',
      scope: 'collective', layoutKey: 'official-letter',
      bodyTemplate: 'Мы, жители {{from_line}}, обращаемся к Вам по следующему вопросу.\n\n{{body}}\n\nПросим рассмотреть обращение и принять меры.',
      variables: [
        { name: 'recipient', label: 'Кому (адресат)', type: 'text', required: true, source: 'manual' },
        { name: 'from_line', label: 'От кого', type: 'text', required: true, source: 'manual' },
        { name: 'body', label: 'Текст обращения', type: 'multiline', required: true, source: 'manual' },
      ],
    },
  ]
  for (const t of templates) {
    const exists = await prisma.documentTemplate.findFirst({ where: { title: t.title } })
    if (!exists) await prisma.documentTemplate.create({ data: { ...t, variables: t.variables as object } })
  }
  console.log('Templates seeded:', templates.length)

  console.log('Seed complete.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
