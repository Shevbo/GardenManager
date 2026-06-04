/**
 * Сидер контентных шаблонов документов (official-letter) из content-templates.json.
 * Идемпотентен: создаёт шаблон только если нет шаблона с таким title.
 *
 * Запуск на hoster (DATABASE_URL — из Ключника):
 *   set -a; . ./.env; set +a
 *   NODE_ENV=production npx tsx prisma/seed-content-templates.ts
 * Локально: DATABASE_URL=... npx tsx prisma/seed-content-templates.ts
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const __dirname = dirname(fileURLToPath(import.meta.url))

type TemplateSeed = {
  category: string
  title: string
  scope: string
  layoutKey: string
  bodyTemplate: string
  variables: unknown[]
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const file = join(__dirname, 'content-templates.json')
  const templates = JSON.parse(readFileSync(file, 'utf8')) as TemplateSeed[]

  let created = 0
  let skipped = 0
  for (const t of templates) {
    const exists = await prisma.documentTemplate.findFirst({ where: { title: t.title } })
    if (exists) { skipped++; continue }
    await prisma.documentTemplate.create({
      data: {
        category: t.category,
        title: t.title,
        scope: t.scope,
        layoutKey: t.layoutKey,
        bodyTemplate: t.bodyTemplate,
        variables: t.variables as object,
        isActive: true,
      },
    })
    created++
  }
  console.log(`Content templates: ${created} created, ${skipped} skipped (of ${templates.length}).`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
