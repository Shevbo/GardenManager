<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices. (Already bitten us: `next lint` is gone — lint runs through `eslint` directly.)
<!-- END:nextjs-agent-rules -->

# Garden Manager — Agent Operating Contract

This file is the binding contract for any agent (human or AI) working in this repo. It is the GARD-1 harness artifact: it defines *done*, the verify gate, and the domain invariants that must never be violated.

## 1. Definition of Done — no green, no done

**You may NOT report a task as `done`, `complete`, or `passing` unless `npm run verify` exits 0** and you have seen that output in this session. "It should work" / "the change looks right" is not done. Evidence before assertion.

`npm run verify` = `tsc --noEmit && npm run lint && vitest run && next build` — one green/red signal across types, lint, tests, and build.

### Running verify under memory pressure
The primary host (smain) is shared and RAM-constrained (~1–1.5 GB free; `next build` and full `eslint` can be OOM-killed by systemd-oomd → exit 143). For tight iteration use the **light gate**, which is memory-modest and covers correctness:

```
NODE_OPTIONS=--max-old-space-size=900 npx tsc --noEmit
NODE_OPTIONS=--max-old-space-size=900 npx vitest run
```

Run `eslint` in directory chunks (`npx eslint src/lib`, `npx eslint src/app`, …) and `next build` once per milestone in a memory-free window — never assert "verify green" without having actually run the full `npm run verify` at least once for the milestone.

## 2. ОСС domain invariants (legally critical — ЖК РФ)

The owner-assembly (ОСС / общее собрание собственников) logic carries legal weight. These invariants are non-negotiable and must be covered by tests (see GARD-2):

1. **Eligibility** — only an owner (`AssemblyVote.isOwner === true`, sourced from `Membership.isOwner`) may cast a counted vote. Tenants/non-owners never affect quorum or tally.
2. **One vote per owner per question** — enforced by `@@unique([questionId, userId])`. Re-submission updates the existing vote, never adds a second.
3. **Quorum by area share, not headcount** — quorum = (Σ voted owner `areaSqm`) / (Σ all eligible owner `areaSqm`) × 100, compared to `Assembly.quorumPercent`. Per ЖК РФ ст.45 default ≥ 50%.
4. **Majority threshold depends on question type** — simple majority (>50% of voted area) for ordinary questions; **qualified 2/3 (≥66.67%)** for questions under ЖК РФ ст.46 ч.1 (reconstruction, capital-repair fund, land-plot use, etc.). Threshold is carried per question in `AssemblyQuestion.requiredMajorityPct`; never silently default a 2/3 question to 50%. **Denominator basis (Boris ruling, 2026-06):** both ordinary and qualified majorities are computed on the PARTICIPATING (active-voter) area — FOR+AGAINST+ABSTAIN. Owners who did not vote are reported справочно (`notVotedArea`/`notVotedCount`) and NEVER enter the denominator. A question may opt into the stricter `'TOTAL'` (all owners) basis explicitly via `majorityBasis`.
5. **Voting window** — a vote is accepted only while `Assembly.status === VOTING` and `now ∈ [startsAt, endsAt]`. Outside that: reject.
6. **A decision passes** iff quorum reached AND its question's threshold met. Abstentions count toward quorum but not toward "for".
7. **Irreversible actions are HITL fail-closed** (GARD-3) — closing an assembly (`→ CLOSED`) and issuing the official protocol are irreversible and require explicit human confirmation; the system must default to NOT acting if confirmation is absent.

Any change touching quorum, majority, eligibility, or the protocol MUST keep the GARD-2 golden tests green.

## 3. Operational rules

- Russian in UI/user-facing copy and domain terms; English in code identifiers.
- Don't introduce new `any` (it's a warning today only to unblock inherited debt — see §4). Prefer real types; `tsc` strict is the type gate.
- Migrations: every Prisma schema change ships with a migration; never edit a model without `prisma migrate`.
- Don't weaken the gate to make it pass. Downgrading a lint rule is a deliberate, documented decision (§4), not a reflex.

## 4. Known tech-debt (surfaced as warnings, tracked — fix forward)

The verify gate is green on a baseline that consciously accepts pre-existing, inherited debt as **warnings** (visible, non-blocking) rather than blocking errors:

- `@typescript-eslint/no-explicit-any` → `warn` — hundreds of inherited sites; `tsc` strict still guards type safety.
- `react-hooks/set-state-in-effect` → `warn` — 13 inherited UI call sites (React-Compiler-era perf hint). Follow-up: fix the call sites, then restore to `error`.

New code should not add to these. When the debt is paid down, restore the rules to `error` in `eslint.config.mjs`.
