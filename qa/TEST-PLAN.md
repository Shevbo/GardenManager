# Garden Manager — QA / Regression Test Plan

**Goal:** ~95% functional coverage via an automated E2E harness that drives the **live deployed app** (`http://127.0.0.1:3003` on hoster) using forged Auth.js JWT session cookies (signed with `NEXTAUTH_SECRET` from Keymaster), against the real Postgres DB. All test data is namespaced under QA organizations (slug prefix `qa-`) and cleaned up afterwards.

**Run:** `set -a; . ./.env; set +a; NODE_ENV=production npx tsx qa/run.ts` on hoster (keymaster bootstrap provides DATABASE_URL + NEXTAUTH_SECRET).

## Test population
- **2 organizations** (ЖК): `qa-org-a`, `qa-org-b` + 1 org-group linking them.
- **2 buildings** per org, ~3 apartments each.
- **20 users** with varied state:
  - 2 platform admins, 4 org admins (council), 2 coalition admins, 10 owners, 2 tenants.
  - Mix: phone-verified vs not; email-verified; some with signed ownership declarations (area-based), some without; some owners without apartment (block reasons).
- **Activities**: 2 activities, several memberships.

## Coverage matrix (scenarios → assertions)

### A. Auth & access control
- A1 Unauthenticated request to protected API → 401/redirect.
- A2 Forged session as user → authenticated requests succeed.
- A3 Non-admin hitting admin API (`/api/admin/platform/*`) → 403.
- A4 Org-admin can only see/act on own org; cross-org access → 403.
- A5 Platform admin sees all.

### B. Petition lifecycle (×10 petitions across orgs/groups/activities)
- B1 Create DRAFT (POST /api/petitions) by org member.
- B2 Apply collective template (POST .../apply-template) — required-field validation (missing → 400 with `missing`), profile prefill, draftText filled, templateId set.
- B3 Legal-polish (POST .../legal-polish) returns revised text (real DeepSeek; tolerate 502 if LLM unavailable — assert graceful).
- B4 DRAFT → DISCUSSION (PATCH status). Invalid transitions rejected.
- B5 Comments: post (POST .../comments), list, nested? edit/delete by author; non-member 403.
- B6 Reactions: emoji on petition and on comments (POST .../reactions), toggle off, grouping.
- B7 DISCUSSION → AI_REVISION → revise (POST .../revise, needs comments) → finalText (PATCH).
- B8 → SIGNING. Signatures: POST .../sign by 20 users (legalConsent), verifiedVia derived; re-sign idempotent (upsert); unverified-channel user → 403.
- B9 Visibility toggle (PATCH .../visibility) public/private; copy-link.
- B10 SIGNING → CLOSED → EXPORTED. Export PDF (GET/POST .../export) — 200 PDF, status guards (must be CLOSED).
- B11 Preview PDF (GET .../preview) any status; PII masking: non-admin viewer sees other signers masked, admin sees all.
- B12 Delete petition (DELETE) — blocked if has signatures; allowed if none.

### C. Documents («Мои документы») & appendices
- C1 List individual templates (GET /api/documents/templates) — 401 unauth; returns active individual.
- C2 Create GeneratedDocument (POST /api/documents) — profile prefill (incl. address #5).
- C3 Edit fieldValues/title (PATCH); signed doc edit blocked (409).
- C4 Sign (POST .../sign) — required-field validation, verified channel, status=signed.
- C5 Export PDF (GET .../export) — owner + org-admin of linked petition can export; others 403.
- C6 Attach to petition (PATCH `{petitionId}`) — member-only (403 non-member); detach (`{petitionId:null}`); attach allowed after sign.
- C7 Petition appendices (GET /api/petitions/[id]/appendices, admin-only) lists signed attached docs.
- C8 Print package (GET .../package, admin) — multi-doc PDF.
- C9 GET /api/documents/petitions returns user's non-DRAFT member petitions.

### D. Templates directory (platform admin)
- D1 List/create/update/delete (GET/POST/PATCH/DELETE /api/admin/platform/document-templates[/id]) — admin only.
- D2 Delete blocked (409) if template used by a GeneratedDocument.
- D3 15 seeded templates present (3 base + 12 content); categories.

### E. Profile
- E1 Update name/address (PATCH /api/profile) (#5 address persists).
- E2 Change email with OTP (request/verify).
- E3 Phone verify (OTP).
- E4 Ownership declaration (membership): declare-request (needs verified phone → else error), declare-verify (OTP) sets declaration; declare-revoke.
- E5 Property ownership (#6): POST /api/profile/property (КЛАДР add → building actualized, org resolved or «Без организации»), list, declare-request/verify (ПЭП), DELETE; owner-only guards.

### F. Admin directories
- F1 Members directory platform (GET /api/admin/platform/members) — all members, block reasons (no_apartment/no_declaration).
- F2 Org members (GET /api/admin/org/members) — only own org.
- F3 Orgs/buildings/apartments CRUD + drill-down; КЛАДР add building; remove member; add owner to apartment.
- F4 Activities + org-groups CRUD.
- F5 Registrations queue (approve/reject pending).

### G. Public petition view
- G1 Guest + public petition → document view (no login).
- G2 Guest + non-public → redirect /login.
- G3 Logged-in → redirect to admin step.

### H. Stress / edge
- H1 20 concurrent signatures on one petition — all recorded, count correct.
- H2 Large petition body (multi-page) export — PDF renders.
- H3 Concurrent comment posting.
- H4 Idempotency (double-sign, double-react).
- H5 Malformed input (bad JSON, missing fields) → 400 not 500.
- H6 Unicode/Cyrillic everywhere in PDFs.

## Pass criteria
- No 500s on valid or malformed input (malformed → 4xx).
- Lifecycle transitions enforce status guards.
- Permission boundaries hold (401/403).
- PII masking correct.
- All PDFs valid (%PDF, non-trivial size).
- Bugs found are fixed and the suite re-run to green.
