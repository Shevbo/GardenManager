# HANDOFF — GARD harness continuation

You are continuing harness work on **garden-manager-app** (branch `feature/harness-l3`). Operate in harness mode: **read `AGENTS.md` first** — it is the binding contract (Definition of Done, ОСС legal invariants, tech-debt registry). The rule that governs everything: **no `done` without a green `npm run verify` you actually ran and saw.**

## Where things stand (as of 2026-06-24, overnight run)
All changes are in the **working tree, NOT committed** — review and commit yourself; don't commit unless Boris asks.

| Ticket | State | Notes |
|---|---|---|
| GARD-1 verify-gate + contract | ✅ done, verified | full `npm run verify` EXIT=0 |
| GARD-2 golden evals + CI gate | ✅ done | 169 tests; pure `assembly-tally.ts` + `assembly-protocol.ts`; `.github/workflows/ci.yml` |
| GARD-3 HITL fail-closed | ✅ done (migration-free part) | close-assembly needs `confirm:true` (server 409 + UI dialog). **Audit-trail model still TODO (needs migration).** |
| GARD-4 ОСС → ЖК standard | ⏳ core shipped | **Boris ruling 2026-06: qualified ≥2/3 now on PARTICIPATING (active-voter) base, not all owners** — `basisForThreshold` returns PARTICIPATING; non-voters reported справочно (`notVotedArea`/`notVotedCount`); explicit `'TOTAL'` still available. assembly-tally + golden tests + results UI updated, full `npm run verify` EXIT=0 (2026-06-25). **Rest needs DB migration (below).** |

Last verified: `tsc 0 · eslint 0 errors (warnings = known debt) · vitest 169 · next build OK`.

## ⛔ THE constraint that will bite you: smain RAM wall
This host is shared and RAM-tight (~1–1.5 GB free). **`next build` and full `eslint .` get OOM-killed (exit 143 = systemd-oomd).** Do NOT kill neighbor processes (VSCode/Pylance, other agents, postgres, openclaw).

**Iterate on the light gate** (memory-safe, covers correctness):
```bash
NODE_OPTIONS=--max-old-space-size=900 npx tsc --noEmit
NODE_OPTIONS=--max-old-space-size=900 npx vitest run
npx eslint src/lib   # lint in dir chunks, not the whole repo at once
```
Run the **full** `npm run verify` (which includes `next build`) only in a free-memory window (`free -m`; want ≳2.5 GB available) and only to confirm a milestone. The CI workflow (`.github/workflows/ci.yml`) is the canonical full gate — it runs with real headroom.

## Next tasks (GARD-4 + GARD-3 remainder) — all need a DB migration
**Migration safety first:** there is **no `.env` at repo root** — find where `DATABASE_URL` actually points before running `prisma migrate`, and confirm it's a dev DB (Boris wants migrations done supervised, not blind). Migrations here are additive — keep them additive + reversible, and run `npm run verify` after.

1. **Explicit `majorityBasis`** on `AssemblyQuestion` (enum `MajorityBasis { PARTICIPATING TOTAL }`, default `PARTICIPATING`). Then in `assembly-results.ts` read `q.majorityBasis` instead of deriving via `basisForThreshold` (keep derivation as the fallback for rows that predate the column). The create form (`src/app/(app)/admin/assemblies/new/page.tsx`) should let the initiator pick basis; default qualified (≥2/3) presets to `TOTAL`.
2. **Ballot type очно/заочно** — `AssemblyVote.ballotType` (enum `IN_PERSON | ABSENTEE`), surfaced in the vote route + voting room; needed for очно-заочные собрания and the protocol form.
3. **Decision registry** — a `Decision` model (passed/rejected decisions over time, link to assembly+question) so closed decisions form a queryable ledger.
4. **Structured agenda** — replace the single text field with ordered agenda items (you already have `AssemblyQuestion`; formalize agenda metadata/time slots if needed).
5. **GARD-3 audit-trail** — append-only model recording assembly lifecycle transitions + each vote cast (who/when/area/choice), for observability.
6. **Minstroy protocol fields** — add `number/address/chairman/secretary/form` so the protocol is ЖК ст.46 ч.5 compliant, then **wire `validateProtocol()` (already written + tested in `src/lib/assembly-protocol.ts`) into `GET .../assemblies/[id]/protocol`** to block issuing an incomplete protocol. (It's intentionally NOT wired yet — those fields don't exist, so wiring now would block the working PDF.)

## ✅ Legal decision (resolved 2026-06-25)
Boris ruled: qualified ст.46 ч.1 is **2/3 of the PARTICIPATING (active-voter) area**, NOT all owners. Non-voters are deemed «воздержавшиеся» but shown **справочно only** — never in the denominator. Implemented in `basisForThreshold` (now returns PARTICIPATING) + `tallyAssembly` (notVotedArea/notVotedCount) + golden tests (incl. the 100-owner example) + results UI. Explicit `'TOTAL'` basis remains available per question.

## Key files
- `src/lib/assembly-tally.ts` — **pure** legal-tally core (quorum/majority/basis). Tested in `assembly-tally.test.ts`. Put new legal logic here, not in the DB wrapper.
- `src/lib/assembly-results.ts` — thin DB-fetch wrapper around `tallyAssembly`.
- `src/lib/assembly-protocol.ts` — protocol completeness validator (`validateProtocol`), tested. Wire into protocol route once Minstroy fields exist.
- `src/app/api/assemblies/[id]/route.ts` — PATCH state machine + GARD-3 close confirm guard.
- `src/app/(app)/assemblies/[id]/AssemblyRoom.tsx` — voting room UI (has the close confirm dialog).
- `prisma/schema.prisma` — single schema file; `Assembly` / `AssemblyQuestion` / `AssemblyVote` near line 416+.
- `AGENTS.md` — the contract. `eslint.config.mjs` — tech-debt downgrades documented there.

## Working rules
- Edit → run the light gate → only claim done on a green full `npm run verify`.
- Don't weaken the gate to pass; downgrading a lint rule is a documented decision (see `eslint.config.mjs`).
- ОСС logic is legally critical — every change touching quorum/majority/eligibility/protocol must keep the golden tests green.
- Russian in UI/domain copy, English in code.
