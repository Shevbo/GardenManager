# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

**`AGENTS.md` (imported above) is the binding contract** — Definition of Done (`npm run verify` must be green), the legally-critical ОСС invariants (ЖК РФ), and the tech-debt registry. It also warns that this is **Next.js 16 with breaking changes** — read the relevant guide in `node_modules/next/dist/docs/` before writing framework code (`next lint` is gone; lint is `eslint` directly). This file adds the architecture and ops that AGENTS.md does not cover; do not duplicate the contract here.

Two-repo project: **application code lives here**; docs/specs/plans live in the sibling `../garden-manager` repo.

## Commands

- `npm run dev` — dev server (localhost:3000)
- `npm run verify` — the DoD gate: `tsc --noEmit && eslint && vitest run && next build`
- Single test: `npx vitest run src/lib/assembly-tally.test.ts` (or add `-t "quorum"` to filter by name); `npm run test:watch` for watch mode
- `npm run db:seed` — seed the dev DB; `npm run test:smoke` / `test:e2e` — Playwright
- **After any `prisma/schema.prisma` change: `npx prisma generate`** (the typed client must exist before tsc/build see the new model)
- On a memory-tight host, lint in directory chunks (`npx eslint src/lib`) — full `eslint` / `next build` can OOM

## Secrets & boot (the non-obvious part)

There is **no root `.env`**. Secrets are loaded into `process.env` at server start by `src/instrumentation.ts` → `src/lib/keymaster.ts`, which fetches them from the federation **Keymaster** (`10.66.0.1:9093`). The bootstrap is **fail-loud on mandatory secrets** — a cold start crashes the whole server if a mandatory secret's value or `pre_approved` entry is missing. Feature-level secrets are marked `OPTIONAL` in `instrumentation.ts` so their absence only degrades that feature. `DATABASE_URL` comes from Keymaster too (`GARDEN_DATABASE_URL` prod / `GARDEN_DATABASE_URL_DEV` dev).

**Prisma 7 with a driver adapter:** the `datasource` in `schema.prisma` has **no `url`**. The CLI gets it from `prisma.config.ts` (`process.env.DATABASE_URL`); the runtime client is built with `PrismaPg` in `src/lib/prisma.ts`.

**Auth** (`src/lib/auth.ts`): NextAuth Credentials provider delegates password check to the Shectory portal via `verifyViaBridge` (Bearer `SHECTORY_AUTH_BRIDGE_SECRET`, which is *optional* — login degrades if absent, phone-OTP is unaffected).

## Domain modules (big picture)

- **Petitions** (collective letters) — lifecycle `DRAFT→DISCUSSION→AI_REVISION→SIGNING→CLOSED→EXPORTED` (`src/lib/petition-status.ts`). Uses templates (`templates.ts`), the AI lawyer (`deepseek.ts` + `lawyer.ts`, with federation web-search in `lawyer-tools.ts`), SMS signing (`PetitionSignature`, ПЭП), and PDF export.
- **Assemblies (ОСС)** — legally critical. The **pure tally core is `src/lib/assembly-tally.ts`**: the primary unit is **votes (one owner = one vote); area (м²) is reference-only**, shown in parentheses. It is golden-tested (`assembly-tally.test.ts`) — any change to quorum/majority/eligibility must keep those green. `assembly-results.ts` is the thin DB wrapper. Flow: admin drafts agenda → `ANNOUNCED` (agenda approval is an admin action, no owner poll) → `VOTING` → SMS signing (`AssemblySignature`) → `CLOSED` (HITL confirm, 409 without `confirm:true`) → protocol PDF.
- **Documents** — template engine (`DocumentTemplate`/`GeneratedDocument`) with PII masking (`pii.ts`).
- **Registration / org management** — invite links, a pending-approval queue, and an org→building→apartment tree. `Membership.isOwner` + `areaSqm` are what drive voting eligibility and quorum.

## PDF pipeline

`@react-pdf/renderer`. Entry `src/lib/pdf.ts`; page layouts in `src/lib/pdf/layouts/*.tsx` (official-letter, police-statement, explanation); shared components in `src/lib/pdf/components/` (`registry` = signatory table, `signature-plaque` = the branded ПЭП footer card). Fonts are registered in `src/lib/pdf/fonts.ts` (Roboto, LiberationSerif); widow control in `typography.ts`.

## External providers

LLM = DeepSeek via a gateway (`src/lib/deepseek.ts`): `DOC_MODEL='deepseek-v4-pro'` for document text, `CHAT_MODEL='deepseek-v4-flash'` for chat. SMS = Android gateway (`sms.ts`); email = UniSender Go SMTP (`email.ts`); addresses = DaData. Event notifications in `notifications.ts`.

## QA harness (`qa/`)

`qa/run.ts` and `qa/scenario1.ts` drive the **live app** by forging Auth.js session cookies (`qa/lib/client.ts`) against the real DB, namespaced and cleanable. **OTP is bypassed by setting `phoneVerified` directly in the DB — no real SMS/email is ever sent.** Run: `set -a; . ./.env; set +a; NODE_ENV=production npx tsx qa/run.ts`. Caveat: **`qa/*.ts` is type-checked by `next build`** — a type error there breaks the production build, so keep these files type-clean.

## Deploy (prod = "hoster")

App runs under pm2 as `garden-manager` in `/var/www/garden-manager` (port 3003), behind nginx on `smain` → `garden.shectory.ru`; it tracks `main`. Deploy = `git pull origin main` → `npm run build` → `pm2 restart garden-manager`. Gotchas that have broken prod: (1) run `npx prisma generate` on the host after a schema change, before build; (2) before `pm2 restart`, confirm every mandatory secret is present and `pre_approved` in Keymaster (fail-loud boot); (3) `_prisma_migrations` has legacy `db push` drift — **do not `prisma migrate deploy` blindly** (it re-creates existing tables and fails); apply a single new migration's SQL directly + `prisma migrate resolve --applied <name>`.
