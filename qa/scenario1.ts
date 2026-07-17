/**
 * Global Test Scenario 1 — ГК «Щитовик»: synthetic generative E2E, 50 owners.
 * Runs against the live PROD app+DB (namespaced `qa-shchitovik`, fully cleanable).
 * NO real SMS/email: phone/email verified by direct DB write (dev-verify pattern).
 * Drives letter (comment/react/sign) + assembly (vote/tally/protocol) via forged sessions.
 *
 * Run on hoster:  set -a; . ./.env; set +a; NODE_ENV=production npx tsx qa/scenario1.ts
 */
import { initEnv, BASE } from './lib/env'
import { as, anon, type Client } from './lib/client'

const NS = 'qa-shchitovik'
const now = new Date()

type OwnerRec = {
  code: string; idx: number; id: string; email: string; area: number;
  garages: number; verified: boolean; sign: boolean;
  v: Record<string, string | null>; comment: string | null; react: boolean;
  client: Client; ops: { op: string; ok: boolean; detail: string }[];
}

type Persona = { code: string; label: string; count: number; area: number; garages: number; verified: boolean; signRule: string; comment: string | null; react: boolean; v: Record<string, string | null> }
const PERSONAS: Persona[] = [
  { code: 'P1', label: 'Активный сторонник',        count: 14, area: 18, garages: 1, verified: true,  signRule: 'all',   comment: 'Полностью поддерживаю — ливнёвку давно пора чистить.', react: true,  v: { V1: 'FOR', V2: 'FOR', V3: 'FOR' } },
  { code: 'P2', label: 'Критик-конструктив',        count:  8, area: 18, garages: 1, verified: true,  signRule: 'all',   comment: 'Поддержу, но нужна смета до подписания.',              react: false, v: { V1: 'FOR', V2: 'ABSTAIN', V3: 'FOR' } },
  { code: 'P3', label: 'Оппонент',                  count:  6, area: 18, garages: 1, verified: true,  signRule: 'none',  comment: 'Против сборов — пусть председатель ищет бюджет.',       react: false, v: { V1: 'AGAINST', V2: 'AGAINST', V3: 'AGAINST' } },
  { code: 'P4', label: 'Минималист',                count:  8, area: 18, garages: 1, verified: true,  signRule: 'first5',comment: null,                                                  react: false, v: { V1: 'FOR', V2: null, V3: 'FOR' } },
  { code: 'P5', label: 'Пассивный/незавершённый',   count:  5, area: 18, garages: 1, verified: false, signRule: 'none',  comment: null,                                                  react: false, v: {} },
  { code: 'P6', label: 'Мультигаражный сторонник',  count:  3, area: 36, garages: 2, verified: true,  signRule: 'all',   comment: 'Два бокса, оба топит. За.',                            react: true,  v: { V1: 'FOR', V2: 'FOR', V3: 'FOR' } },
  { code: 'P7', label: 'Мультигаражный критик',     count:  2, area: 54, garages: 3, verified: true,  signRule: 'all',   comment: 'Согласую с оговоркой по срокам работ.',                react: false, v: { V1: 'ABSTAIN', V2: 'ABSTAIN', V3: 'FOR' } },
  { code: 'P8', label: 'Нотификационный',           count:  4, area: 18, garages: 1, verified: true,  signRule: 'all',   comment: 'Прошу уведомлять об ответах на комментарии.',          react: true,  v: { V1: 'FOR', V2: 'FOR', V3: 'FOR' } },
]

const LETTER_TITLE = 'Коллективное обращение собственников ГК «Щитовик» о защите гаражей от ливневых затоплений'
const LETTER_BODY = `Председателю ГК «Щитовик».
Мы, собственники гаражных боксов ГК «Щитовик», в связи с систематическим подтоплением боксов ливневыми водами
требуем организовать: (1) ревизию и прочистку ливневой канализации; (2) устройство/восстановление дренажа по периметру;
(3) гидроизоляцию и отмостку блоков; (4) утверждение графика и сметы работ до начала сезона дождей.
Просим вынести данные вопросы на общее собрание и приступить к реализации.`

async function main() {
  const { prisma, secret } = await initEnv()
  const log = (s: string) => console.log(s)
  const results: { phase: string; op: string; ok: boolean; detail: string }[] = []
  const rec = (phase: string, op: string, ok: boolean, detail = '') => {
    results.push({ phase, op, ok, detail }); log(`  ${ok ? '✔' : '✗'} [${phase}] ${op} ${detail}`)
  }

  // ── 0. CLEANUP prior run (idempotent) ────────────────────────────────────
  log('\n=== 0. CLEANUP ===')
  const priorOrgs = await prisma.organization.findMany({ where: { slug: { startsWith: NS } }, select: { id: true } })
  const orgIds = priorOrgs.map(o => o.id)
  if (orgIds.length) {
    const asm = await prisma.assembly.findMany({ where: { orgId: { in: orgIds } }, select: { id: true } })
    const qs = await prisma.assemblyQuestion.findMany({ where: { assemblyId: { in: asm.map(a => a.id) } }, select: { id: true } })
    await prisma.assemblyVote.deleteMany({ where: { questionId: { in: qs.map(q => q.id) } } })
    await prisma.assemblyQuestion.deleteMany({ where: { assemblyId: { in: asm.map(a => a.id) } } })
    await prisma.assembly.deleteMany({ where: { orgId: { in: orgIds } } })
    const pets = await prisma.petition.findMany({ where: { orgId: { in: orgIds } }, select: { id: true } })
    const petIds = pets.map(p => p.id)
    await prisma.petitionSignature.deleteMany({ where: { petitionId: { in: petIds } } })
    const coms = await prisma.petitionComment.findMany({ where: { petitionId: { in: petIds } }, select: { id: true } })
    await prisma.commentReaction.deleteMany({ where: { commentId: { in: coms.map(c => c.id) } } })
    await prisma.petitionReaction.deleteMany({ where: { petitionId: { in: petIds } } })
    await prisma.petitionComment.deleteMany({ where: { petitionId: { in: petIds } } })
    await prisma.petition.deleteMany({ where: { orgId: { in: orgIds } } })
    await prisma.membership.deleteMany({ where: { orgId: { in: orgIds } } })
    const blds = await prisma.building.findMany({ where: { orgId: { in: orgIds } }, select: { id: true } })
    await prisma.apartment.deleteMany({ where: { buildingId: { in: blds.map(b => b.id) } } })
    await prisma.building.deleteMany({ where: { orgId: { in: orgIds } } })
  }
  await prisma.user.deleteMany({ where: { email: { startsWith: NS } } })
  await prisma.organization.deleteMany({ where: { slug: { startsWith: NS } } })
  rec('cleanup', 'prior qa-shchitovik data removed', true, `(orgs=${orgIds.length})`)

  // ── 1. SETUP: org «Щитовик» (capacity 1400), 3 blocks, admin, isolation org ─
  log('\n=== 1. SETUP ===')
  const org = await prisma.organization.create({ data: { slug: `${NS}-gk`, name: 'ГК «Щитовик»', type: 'kooperativ' } })
  const otherOrg = await prisma.organization.create({ data: { slug: `${NS}-other`, name: 'ГК «Соседний» (изоляция)', type: 'kooperativ' } })
  const blocks = []
  for (const b of ['А', 'Б', 'В']) blocks.push(await prisma.building.create({ data: { orgId: org.id, address: `ГК Щитовик, блок ${b}`, addressNormalized: `${NS}-blok-${b}` } }))
  rec('setup', 'org «Щитовик» + 3 блока созданы', true, `(capacity=1400, org=${org.id})`)

  const admin = await prisma.user.create({ data: { email: `${NS}-admin@garden.local`, name: 'Администратор Щитовика', phone: null, phoneVerified: now, emailVerified: now, status: 'ACTIVE', profileCompleted: true } })
  await prisma.membership.create({ data: { userId: admin.id, orgId: org.id, role: 'org_admin', isOwner: false, areaSqm: null, verifiedAt: now } })
  const adminC = await as({ id: admin.id, email: admin.email }, secret)
  rec('setup', 'администратор кооператива (org_admin) создан', true)

  // isolation org: one owner elsewhere
  const otherOwner = await prisma.user.create({ data: { email: `${NS}-other-owner@garden.local`, name: 'Чужой собственник', phone: null, phoneVerified: now, emailVerified: now } })
  await prisma.membership.create({ data: { userId: otherOwner.id, orgId: otherOrg.id, role: 'owner', isOwner: true, areaSqm: 18 } })

  // ── 2. Owners (57 boxes / 50 owners) + 2 tenants ─────────────────────────
  log('\n=== 2. REGISTER 50 OWNERS (+2 tenants) ===')
  const owners: OwnerRec[] = []
  let phoneSeq = 100
  let boxSeq = 0
  for (const p of PERSONAS) {
    for (let i = 0; i < p.count; i++) {
      phoneSeq++
      const email = `${NS}-${p.code}-${i}@garden.local`
      const u = await prisma.user.create({ data: {
        email, name: `${p.label} #${i + 1}`,
        phone: null,
        phoneVerified: p.verified ? now : null,
        emailVerified: p.verified ? now : null,
        status: 'ACTIVE',
        profileCompleted: p.verified, // P5 not completed → gated
        contactDisclosure: 'on_request',
      } })
      // garages → apartments in rotating blocks; membership area = sum (single membership carries total)
      const blk = blocks[boxSeq % 3]
      const apt = await prisma.apartment.create({ data: { buildingId: blk.id, number: `${p.code}-${i + 1}`, areaSqm: 18 } })
      boxSeq += p.garages
      await prisma.membership.create({ data: { userId: u.id, orgId: org.id, apartmentId: apt.id, role: 'owner', isOwner: true, areaSqm: p.area, verifiedAt: p.verified ? now : null } })
      const client = await as({ id: u.id, email }, secret)
      const signRule = (p as any).signRule
      const willSign = signRule === 'all' || (signRule === 'first5' && i < 5)
      owners.push({ code: p.code, idx: i, id: u.id, email, area: p.area, garages: p.garages, verified: p.verified, sign: willSign, v: p.v, comment: p.comment, react: p.react, client, ops: [] })
    }
  }
  const tenants = []
  for (let t = 0; t < 2; t++) {
    const u = await prisma.user.create({ data: { email: `${NS}-tenant-${t}@garden.local`, name: `Арендатор #${t + 1}`, phone: null, phoneVerified: now, emailVerified: now } })
    await prisma.membership.create({ data: { userId: u.id, orgId: org.id, role: 'owner', isOwner: false, areaSqm: 18, verifiedAt: now } })
    tenants.push({ id: u.id, email: u.email, client: await as({ id: u.id, email: u.email }, secret) })
  }
  const totalArea = owners.reduce((s, o) => s + o.area, 0)
  rec('register', `50 собственников + 2 арендатора созданы`, owners.length === 50, `(площадь=${totalArea} м², боксов=${boxSeq})`)
  rec('register', 'общая eligible-площадь = 1026 м²', totalArea === 1026, `(факт ${totalArea})`)

  // ── 3. LETTER: create → DISCUSSION → comments/react → SIGNING → sign → export
  log('\n=== 3. LETTER (петиция) ===')
  const petRes = await adminC.post('/api/petitions', { orgId: org.id, title: LETTER_TITLE, draftText: LETTER_BODY, recipient: 'Председателю ГК «Щитовик»', senderLine: 'Собственники гаражных боксов ГК «Щитовик»' })
  rec('letter', 'админ создал письмо (DRAFT)', petRes.status === 201, `(http ${petRes.status})`)
  const petId = petRes.json?.id
  if (!petId) throw new Error('letter create failed: ' + petRes.text.slice(0, 200))
  // DRAFT → DISCUSSION → AI_REVISION → SIGNING
  for (const st of ['DISCUSSION']) {
    const r = await adminC.patch(`/api/petitions/${petId}`, { status: st })
    rec('letter', `перевод в ${st}`, r.status === 200, `(http ${r.status})`)
  }

  // gating: P5 (unverified) tries to comment → expect 403
  const p5 = owners.find(o => o.code === 'P5')!
  const gate = await p5.client.post(`/api/petitions/${petId}/comments`, { text: 'пробую без верификации' })
  rec('gating', 'P5 (незавершённый профиль) заблокирован на комментарии', gate.status === 403, `(http ${gate.status})`)

  // comments + reactions in DISCUSSION
  let commentOk = 0, reactOk = 0
  for (const o of owners) {
    if (o.comment) {
      const r = await o.client.post(`/api/petitions/${petId}/comments`, { text: o.comment })
      const ok = r.status === 201 || r.status === 200
      o.ops.push({ op: 'comment', ok, detail: `http ${r.status}` }); if (ok) commentOk++
    }
    if (o.react) {
      const r = await o.client.post(`/api/petitions/${petId}/reactions`, { emoji: '👍' })
      const ok = r.status === 201 || r.status === 200
      o.ops.push({ op: 'react', ok, detail: `http ${r.status}` }); if (ok) reactOk++
    }
  }
  rec('letter', `комментарии записаны`, commentOk > 0, `(${commentOk})`)
  rec('letter', `реакции записаны`, reactOk > 0, `(${reactOk})`)

  // advance to SIGNING
  for (const st of ['AI_REVISION', 'SIGNING']) {
    const r = await adminC.patch(`/api/petitions/${petId}`, { status: st })
    rec('letter', `перевод в ${st}`, r.status === 200, `(http ${r.status})`)
  }

  // signatures (СМС ПЭП — phoneVerified already set, no real SMS)
  let signOk = 0
  for (const o of owners) {
    if (!o.sign) continue
    const r = await o.client.post(`/api/petitions/${petId}/sign`, { legalConsent: true })
    const ok = r.status === 201
    o.ops.push({ op: 'sign', ok, detail: `http ${r.status}` }); if (ok) signOk++
  }
  // idempotency: double-sign one owner
  const dbl = owners.find(o => o.sign)!
  const d1 = await dbl.client.post(`/api/petitions/${petId}/sign`, { legalConsent: true })
  const sigCount = await prisma.petitionSignature.count({ where: { petitionId: petId } })
  rec('letter', `подписи через СМС собраны`, signOk === 36, `(${signOk}/36 ожидалось)`)
  rec('letter', `идемпотентность повторной подписи`, d1.status === 201 && sigCount === signOk, `(count=${sigCount})`)
  // P3 (не подписант) не в реестре
  const p3 = owners.find(o => o.code === 'P3')!
  const p3sig = await prisma.petitionSignature.count({ where: { petitionId: petId, userId: p3.id } })
  rec('letter', 'P3 (оппонент) отсутствует в реестре подписей', p3sig === 0)

  // set final text (clean signed version) → CLOSED → export PDF → EXPORTED
  await adminC.patch(`/api/petitions/${petId}`, { finalText: LETTER_BODY })
  const rClosed = await adminC.patch(`/api/petitions/${petId}`, { status: 'CLOSED' })
  rec('letter', 'перевод в CLOSED', rClosed.status === 200, `(http ${rClosed.status})`)
  const pdf = await adminC.get(`/api/petitions/${petId}/export`)
  const isPdf = pdf.contentType.includes('pdf') || pdf.text.startsWith('%PDF')
  rec('letter', 'чистовик письма выгружен в PDF (реестр подписей)', isPdf, `(http ${pdf.status}, ${pdf.contentType})`)
  const rExp = await adminC.patch(`/api/petitions/${petId}`, { status: 'EXPORTED' })
  rec('letter', 'перевод в EXPORTED', rExp.status === 200, `(http ${rExp.status})`)

  // ── 4. ASSEMBLY (ОСС) ────────────────────────────────────────────────────
  log('\n=== 4. ASSEMBLY (ОСС) ===')
  const startsAt = new Date(now.getTime() - 3600_000).toISOString()
  const endsAt = new Date(now.getTime() + 7 * 24 * 3600_000).toISOString()
  const asmRes = await adminC.post('/api/assemblies', {
    orgId: org.id, title: 'Общее собрание собственников ГК «Щитовик» — защита от ливневых затоплений',
    description: 'Очно-заочное собрание. Повестка: письмо, целевой сбор на дренаж, полномочия администратора.',
    type: 'online', startsAt, endsAt, quorumPercent: 50,
    questions: [
      { text: 'В1. Одобрить направление коллективного письма председателю о защите гаражей от ливневых затоплений.', requiredMajorityPct: 50 },
      { text: 'В2. Утвердить целевой сбор на капработы по дренажу и гидроизоляции (квалифицированное большинство 2/3).', requiredMajorityPct: 66.67 },
      { text: 'В3. Уполномочить администратора кооператива представлять интересы собственников при реализации.', requiredMajorityPct: 50 },
    ],
  })
  rec('assembly', 'админ создал собрание с повесткой (3 вопроса)', asmRes.status === 201, `(http ${asmRes.status})`)
  const asmId = asmRes.json?.id
  if (!asmId) throw new Error('assembly create failed: ' + asmRes.text.slice(0, 200))
  const asmFull = await prisma.assembly.findUnique({ where: { id: asmId }, include: { questions: { orderBy: { order: 'asc' } } } })
  const [Q1, Q2, Q3] = asmFull!.questions
  const QID: Record<string, string> = { V1: Q1.id, V2: Q2.id, V3: Q3.id }

  for (const st of ['ANNOUNCED', 'VOTING']) {
    const r = await adminC.patch(`/api/assemblies/${asmId}`, { status: st })
    rec('assembly', `перевод в ${st}`, r.status === 200, `(http ${r.status})`)
  }

  // tenant tries to vote → 403 (not owner)
  const tv = await tenants[0].client.post(`/api/assemblies/${asmId}/vote`, { votes: [{ questionId: QID.V1, choice: 'FOR' }] })
  rec('assembly', 'арендатор НЕ может голосовать (isOwner=false)', tv.status === 403, `(http ${tv.status})`)

  // owners vote per persona
  let voteOk = 0
  for (const o of owners) {
    const votes = Object.entries(o.v).filter(([, c]) => c).map(([k, c]) => ({ questionId: QID[k], choice: c }))
    if (votes.length === 0) { o.ops.push({ op: 'vote', ok: true, detail: 'не голосует (справочно)' }); continue }
    const r = await o.client.post(`/api/assemblies/${asmId}/vote`, { votes })
    const ok = r.status === 200 || r.status === 201
    o.ops.push({ op: 'vote', ok, detail: `${votes.map(v => v.choice).join('/')} http ${r.status}` }); if (ok) voteOk++
  }
  rec('assembly', `собственники проголосовали (по голосам)`, voteOk === 45, `(${voteOk}/45 голосовавших, P5 не голосует)`)

  // assembly SMS signatures (ПЭП) — verified owners sign the protocol during VOTING
  let asmSignOk = 0
  for (const o of owners) {
    if (!o.verified) continue // P5 (unverified) cannot sign
    const r = await o.client.post(`/api/assemblies/${asmId}/sign`, { legalConsent: true })
    const ok = r.status === 201
    o.ops.push({ op: 'assembly-sign', ok, detail: `http ${r.status}` }); if (ok) asmSignOk++
  }
  rec('assembly', 'подписи собрания через СМС (ПЭП) собраны', asmSignOk === 45, `(${asmSignOk}/45 верифиц.)`)
  // P5 (unverified) cannot sign
  const p5sign = await owners.find(o => o.code === 'P5')!.client.post(`/api/assemblies/${asmId}/sign`, { legalConsent: true })
  rec('assembly', 'P5 (незавершённый профиль) не может подписать собрание', p5sign.status === 403, `(http ${p5sign.status})`)
  // tenant cannot sign
  const tsign = await tenants[0].client.post(`/api/assemblies/${asmId}/sign`, { legalConsent: true })
  rec('assembly', 'арендатор не может подписать собрание', tsign.status === 403, `(http ${tsign.status})`)
  // idempotency: double-sign one owner
  const dblA = owners.find(o => o.verified)!
  await dblA.client.post(`/api/assemblies/${asmId}/sign`, { legalConsent: true })
  const asmSigCount = await prisma.assemblySignature.count({ where: { assemblyId: asmId } })
  rec('assembly', 'реестр подписей собрания (идемпотентно)', asmSigCount === 45, `(${asmSigCount})`)

  // results / tally
  const resR = await adminC.get(`/api/assemblies/${asmId}/results`)
  const R = resR.json
  const q1 = R?.questions?.find((x: any) => x.questionId === QID.V1)
  const q2 = R?.questions?.find((x: any) => x.questionId === QID.V2)
  const q3 = R?.questions?.find((x: any) => x.questionId === QID.V3)
  rec('tally', `кворум достигнут ~90% (45/50 голосов)`, R?.quorumReached === true, `(${R?.quorumPct?.toFixed?.(1)}%, ${R?.votedCount}/${R?.totalEligibleCount} голос.)`)
  rec('tally', `В1 (обычный) ПРИНЯТО ~82.2% голосов`, q1?.passed === true, `(${q1?.forPct?.toFixed?.(1)}%, ${q1?.forVotes} голос.)`)
  rec('tally', `В2 (квалиф.2/3, база активные) НЕ ПРИНЯТО ~56.8% голосов`, q2?.passed === false, `(${q2?.forPct?.toFixed?.(1)}%, ${q2?.forVotes} голос.)`)
  rec('tally', `В3 (обычный) ПРИНЯТО ~86.7% голосов`, q3?.passed === true, `(${q3?.forPct?.toFixed?.(1)}%, ${q3?.forVotes} голос.)`)

  // close (HITL) — 409 without confirm, then confirm
  const noConfirm = await adminC.patch(`/api/assemblies/${asmId}`, { status: 'CLOSED' })
  rec('assembly', 'закрытие без confirm → 409 (HITL fail-closed)', noConfirm.status === 409, `(http ${noConfirm.status})`)
  const closed = await adminC.patch(`/api/assemblies/${asmId}`, { status: 'CLOSED', confirm: true })
  rec('assembly', 'собрание закрыто (confirm=true)', closed.status === 200, `(http ${closed.status})`)
  const proto = await adminC.get(`/api/assemblies/${asmId}/protocol`)
  const protoPdf = proto.contentType.includes('pdf') || proto.text.startsWith('%PDF')
  rec('assembly', 'протокол собрания выгружен в PDF', protoPdf, `(http ${proto.status}, ${proto.contentType})`)

  // ── 5. ISOLATION ─────────────────────────────────────────────────────────
  log('\n=== 5. ISOLATION ===')
  const isoOwner = owners[0].client
  const isoAdmin = await isoOwner.get('/api/admin/platform/members') // non-admin → 403
  rec('isolation', 'собственник не имеет доступа к админ-API', isoAdmin.status === 403 || isoAdmin.status === 401, `(http ${isoAdmin.status})`)
  const isoCreate = await isoOwner.post('/api/assemblies', { orgId: otherOrg.id, title: 'x', type: 'online', startsAt, endsAt, questions: [{ text: 'x' }] })
  rec('isolation', 'собственник не может создать собрание в чужой орг', isoCreate.status === 403, `(http ${isoCreate.status})`)

  // ── SUMMARY ──────────────────────────────────────────────────────────────
  const pass = results.filter(r => r.ok).length
  const fail = results.filter(r => !r.ok)
  log(`\n=== SUMMARY: ${pass}/${results.length} проверок PASS ===`)
  if (fail.length) { log('FAILED:'); fail.forEach(f => log(`  ✗ [${f.phase}] ${f.op} ${f.detail}`)) }

  // per-participant matrix (JSON for report)
  const matrix = owners.map(o => ({ code: o.code, email: o.email.replace(`${NS}-`, ''), area: o.area, ops: o.ops }))
  log('\n=== PARTICIPANT_MATRIX_JSON ===')
  log(JSON.stringify({ orgId: org.id, orgSlug: org.slug, petitionId: petId, assemblyId: asmId, signatures: sigCount, checks: { pass, total: results.length }, results, matrix }, null, 0))

  await prisma.$disconnect()
  process.exit(fail.length ? 2 : 0)
}

main().catch(e => { console.error('FATAL', e); process.exit(1) })
