# Карточка заявления 2.0

**Дата:** 2026-05-24  
**Статус:** Согласован  
**Покрывает:** Sprint01 пункты 2.1, 3.1–3.7

---

## Обзор

Полная переработка публичной и admin-страниц заявления. Единый визуальный язык для обоих видов, lifecycle stepper, emoji-реакции на документ и комментарии, всегда открытая лента обсуждения, управление публичностью, обратные переходы по ЖЦ для администраторов.

---

## Схема данных

### Новые поля и модели

```prisma
model Petition {
  // добавить:
  isPublic Boolean @default(true)
  // уже есть: createdBy String + createdByUser User @relation("PetitionCreator")
}

model PetitionReaction {
  id         String   @id @default(cuid())
  petitionId String
  userId     String
  emoji      String   @db.VarChar(10)
  createdAt  DateTime @default(now())

  petition Petition @relation(fields: [petitionId], references: [id], onDelete: Cascade)
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([petitionId, userId, emoji])
  @@index([petitionId])
}

model CommentReaction {
  id        String   @id @default(cuid())
  commentId String
  userId    String
  emoji     String   @db.VarChar(10)
  createdAt DateTime @default(now())

  comment PetitionComment @relation(fields: [commentId], references: [id], onDelete: Cascade)
  user    User            @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([commentId, userId, emoji])
  @@index([commentId])
}
```

`PetitionComment` нужно добавить:
```prisma
reactions CommentReaction[]
```

`Petition` нужно добавить:
```prisma
reactions PetitionReaction[]
```

Миграция:
```sql
ALTER TABLE "Petition" ADD COLUMN IF NOT EXISTS "isPublic" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "PetitionReaction" (
  "id" TEXT NOT NULL,
  "petitionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "emoji" VARCHAR(10) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PetitionReaction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PetitionReaction_petitionId_userId_emoji_key" UNIQUE ("petitionId", "userId", "emoji")
);

CREATE TABLE "CommentReaction" (
  "id" TEXT NOT NULL,
  "commentId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "emoji" VARCHAR(10) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommentReaction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommentReaction_commentId_userId_emoji_key" UNIQUE ("commentId", "userId", "emoji")
);

ALTER TABLE "PetitionReaction" ADD CONSTRAINT "PetitionReaction_petitionId_fkey" FOREIGN KEY ("petitionId") REFERENCES "Petition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PetitionReaction" ADD CONSTRAINT "PetitionReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommentReaction" ADD CONSTRAINT "CommentReaction_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "PetitionComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommentReaction" ADD CONSTRAINT "CommentReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "PetitionReaction_petitionId_idx" ON "PetitionReaction"("petitionId");
CREATE INDEX "CommentReaction_commentId_idx" ON "CommentReaction"("commentId");
```

---

## Lifecycle transitions (2.1)

### `src/lib/petition-status.ts`

Добавляются обратные переходы:

```typescript
const BACK_TRANSITIONS: Record<PetitionStatus, PetitionStatus | null> = {
  DRAFT:       null,
  DISCUSSION:  'DRAFT',
  AI_REVISION: 'DISCUSSION',
  SIGNING:     'AI_REVISION',
  CLOSED:      null,   // подписи зафиксированы — назад нельзя
  EXPORTED:    null,
}

export function canGoBack(from: PetitionStatus): PetitionStatus | null {
  return BACK_TRANSITIONS[from]
}
```

### `PATCH /api/petitions/[id]/status`

Новый эндпоинт (или расширение существующих close/revise маршрутов):

```
Body: { status: PetitionStatus }
Auth: org admin required
Валидация: canTransition(current, target) || canGoBack(current) === target
Action: prisma.petition.update({ status })
```

### `PATCH /api/petitions/[id]/visibility`

```
Body: { isPublic: boolean }
Auth: org admin required
Action: prisma.petition.update({ isPublic })
```

---

## Компоненты

### `src/components/petition/LifecycleStepper.tsx`

Серверный (pure) компонент. Горизонтальный stepper с 6 шагами.

Props: `{ status: PetitionStatus }`

Визуал:
- Done (пройденные) → forest-green кружок с ✓
- Active (текущий) → purple кружок с ●, свечение
- Future → серый кружок с границей
- Линии между шагами: forest для done, gray для future
- Метки под кружками: 9px uppercase Unbounded
- Sticky под topbar (top: 48px)

Порядок шагов: DRAFT · DISCUSSION · AI_REVISION · SIGNING · CLOSED · EXPORTED

### `src/components/petition/LifecycleStrip.tsx`

Client компонент для admin-страниц. Кликабельная полоса.

Props: `{ petitionId: string; currentStatus: PetitionStatus; isPublic: boolean }`

Визуал (sticky, top: 48px):
- Пройденные этапы: forest-chip — кликабельны (→ backward transition с confirm())
- Текущий: purple-chip — не кликабелен
- Следующий: amber-chip — кликабелен (→ forward transition с confirm())
- Остальные: gray-chip — не кликабельны
- Разделитель справа + toggle «🌐 Публично / 🔒 Скрыто»

При клике: `window.confirm("Перевести заявление в статус X?")` → PATCH `/api/petitions/[id]/status` → `router.refresh()`

Toggle публичности: PATCH `/api/petitions/[id]/visibility` → `router.refresh()`

### `src/components/petition/EmojiChips.tsx`

Client компонент. Используется для реакций и на документ, и на комментарии.

Props:
```typescript
type EmojiChipsProps = {
  entityType: 'petition' | 'comment'
  entityId: string
  petitionId: string  // нужен для API пути comment-реакций
  reactions: { emoji: string; count: number; hasMyReaction: boolean }[]
  currentUserId?: string
}
```

Доступные эмодзи: `['❤️', '👍', '👎', '😮', '🔥', '🤝', '💪', '🙏', '😱']`

Визуал (border-radius: 4px):
- Chip: 13px эмодзи + 11px счётчик, padding 3px 8px
- Active (моя реакция): EDEAFC фон + 9B8EE8 border
- Кнопка «＋»: 26×26px dashed border, открывает inline picker с 9 эмодзи
- При клике на счётчик: tooltip/popover с именами пользователей

API toggle (POST, идемпотентный — повторный клик удаляет):
- Реакция на документ: `POST /api/petitions/[id]/reactions` `{ emoji }`
- Реакция на комментарий: `POST /api/petitions/[id]/comments/[commentId]/reactions` `{ emoji }`

### `src/components/petition/CommentList.tsx`

Client компонент. Список комментариев с реакциями + форма добавления.

Props:
```typescript
type CommentListProps = {
  petitionId: string
  comments: CommentWithReactions[]
  currentUserId?: string
}
```

Форма добавления показывается всегда залогиненным. Незалогиненным — «Войдите, чтобы прокомментировать».
Комментарии видны в любом статусе документа.

---

## Публичная страница `/petition/[id]/page.tsx`

### Guard для isPublic

```typescript
if (!petition.isPublic) {
  const isMember = session?.user
    ? await prisma.membership.findFirst({
        where: { userId: session.user.id, orgId: petition.orgId }
      })
    : null
  if (!isMember) notFound()
}
```

### Запрос данных

```typescript
petition = await prisma.petition.findUnique({
  where: { id },
  include: {
    org: { select: { name: true } },
    materials: true,
    createdByUser: { select: { name: true, phone: true } },
    comments: {
      include: {
        user: { select: { name: true, email: true } },
        reactions: { include: { user: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    },
    reactions: { include: { user: { select: { name: true } } } },
    _count: { select: { signatures: true } },
  },
})
```

### Порядок блоков

1. **Topbar** — `← Заявления`
2. **LifecycleStepper** — sticky top:48px
3. **Заголовок** — `petition.title`
4. **Статусная строка** — badge + `💬 N · 👥 M · до [date]`
   - N = `petition.comments.length`
   - M = `new Set(petition.comments.map(c => c.userId)).size`
5. **Счётчик подписей** — только для SIGNING / CLOSED / EXPORTED
6. **Карточка документа**
   - Шапка: `📄 Текст заявления` + кнопка `↓ Просмотр PDF` + иконка 🔗 (copy link)
   - Грид 3 колонки: Кому / От кого / Инициатор (имя + телефон из `createdByUser`)
   - Текст заявления
   - `<EmojiChips entityType="petition" ...>`
7. **Материалы** — если есть
8. **Sign CTA / Already signed** — для SIGNING
9. **`<CommentList>`** — всегда
10. ~~Публичная ссылка блок внизу~~ → убран (ссылка в шапке карточки)

### Кнопка «Просмотр PDF»

Ссылка на существующий `/api/petitions/[id]/export` с `target="_blank"`.

### Иконка 🔗

Client компонент `<CopyLinkButton url={publicUrl} />` — `navigator.clipboard.writeText(url)` + toast «Ссылка скопирована».

---

## Admin-страницы (3.1 — единый стиль)

Каждая admin-подстраница (`/admin/petitions/[id]/*`) получает:

1. `<LifecycleStrip>` — sticky сверху
2. Заголовок и содержимое в стиле публичной карточки (forest/amber/cream, Unbounded/Golos)
3. Amber-блок admin-действий (специфичен для этапа: «Запустить AI-ревизию», «Закрыть сбор», и т.д.)
4. Карточка документа (тот же визуал)
5. `<EmojiChips>` на документ
6. `<CommentList>`

Затрагиваемые страницы:
- `/admin/petitions/[id]/discussion/page.tsx`
- `/admin/petitions/[id]/revision/page.tsx`
- `/admin/petitions/[id]/signing/page.tsx`
- `/admin/petitions/[id]/export/page.tsx`

---

## Новые API-маршруты

| Метод | Путь | Действие |
|---|---|---|
| PATCH | `/api/petitions/[id]/status` | Transition (forward/backward) |
| PATCH | `/api/petitions/[id]/visibility` | Toggle isPublic |
| POST | `/api/petitions/[id]/reactions` | Toggle petition emoji |
| GET | `/api/petitions/[id]/reactions` | List реакций с авторами |
| POST | `/api/petitions/[id]/comments/[commentId]/reactions` | Toggle comment emoji |
| GET | `/api/petitions/[id]/comments/[commentId]/reactions` | List реакций комментария |

---

## Затрагиваемые файлы

### Новые
- `prisma/migrations/20260524120000_petition_card_v2/migration.sql`
- `src/components/petition/LifecycleStepper.tsx`
- `src/components/petition/LifecycleStrip.tsx`
- `src/components/petition/EmojiChips.tsx`
- `src/components/petition/CommentList.tsx`
- `src/components/petition/CopyLinkButton.tsx`
- `src/app/api/petitions/[id]/status/route.ts`
- `src/app/api/petitions/[id]/visibility/route.ts`
- `src/app/api/petitions/[id]/reactions/route.ts`
- `src/app/api/petitions/[id]/comments/[commentId]/reactions/route.ts`

### Изменяемые
- `prisma/schema.prisma` — добавить isPublic, PetitionReaction, CommentReaction
- `src/lib/petition-status.ts` — добавить BACK_TRANSITIONS, canGoBack()
- `src/app/(app)/petition/[id]/page.tsx` — полная переработка
- `src/app/(app)/admin/petitions/[id]/discussion/page.tsx`
- `src/app/(app)/admin/petitions/[id]/revision/page.tsx`
- `src/app/(app)/admin/petitions/[id]/signing/page.tsx`
- `src/app/(app)/admin/petitions/[id]/export/page.tsx`

---

## Визуальные константы (border-radius)

| Элемент | border-radius |
|---|---|
| Карточки (doc, comments) | 6px |
| Кнопки | 4–6px |
| Chips (реакции) | 4px |
| Sign CTA | 6px |
| Статусный badge | 4px |
| Аватары | 50% (без изменений) |

---

## Вне scope

- Уведомления в реальном времени (WebSocket/SSE) — polling при navigaton
- Модерация комментариев
- Редактирование / удаление комментариев
- Export реакций в PDF
- Тестовые учётки (Sprint01 пункт 4) — отдельная задача
