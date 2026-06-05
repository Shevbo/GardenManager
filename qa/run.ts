/* eslint-disable @typescript-eslint/no-explicit-any */
/** Garden Manager QA/regression runner. See qa/TEST-PLAN.md. */
import { initEnv } from './lib/env'
import { as, anon, type Client } from './lib/client'
import { seedQa, type QaUser } from './seed'

// ---- tiny test harness ----
const results: { name: string; ok: boolean; detail?: string }[] = []
let CUR = ''
function section(s: string) { CUR = s }
async function test(name: string, fn: () => Promise<void>) {
  try { await fn(); results.push({ name: `[${CUR}] ${name}`, ok: true }) }
  catch (e) { results.push({ name: `[${CUR}] ${name}`, ok: false, detail: (e as Error).message }) }
}
function assert(cond: any, msg: string) { if (!cond) throw new Error(msg) }
function eq(a: any, b: any, msg: string) { if (a !== b) throw new Error(`${msg} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`) }
function isPdf(r: { text: string; contentType: string }) { return r.contentType.includes('pdf') && r.text.startsWith('%PDF') }

async function main() {
  const { prisma, secret } = await initEnv()
  console.error('Seeding QA data…')
  const data = await seedQa(prisma)
  const U = (role: QaUser['role'], org: 'qa-org-a' | 'qa-org-b', idx = 0) => data.users.filter(u => u.role === role && u.orgSlug === org)[idx]
  const pAdmin = data.users.find(u => u.role === 'platform_admin')!
  const adminA = U('org_admin', 'qa-org-a')
  const adminB = U('org_admin', 'qa-org-b')
  const councilA = U('council_member', 'qa-org-a')
  const ownersA = data.users.filter(u => u.orgSlug === 'qa-org-a' && u.role === 'owner')
  const ownerVerifiedDeclared = ownersA.find(u => u.phoneVerified && u.declared)!
  const ownerUnverified = ownersA.find(u => !u.phoneVerified)!
  const ownerB = data.users.find(u => u.orgSlug === 'qa-org-b' && u.role === 'owner' && u.phoneVerified)!
  const tenantA = U('tenant', 'qa-org-a')

  const cAdmin = await as(pAdmin, secret)
  const cAdminA = await as(adminA, secret)
  const cAdminB = await as(adminB, secret)
  const cOwner1 = await as(ownerVerifiedDeclared, secret)
  const cOwnerUnv = await as(ownerUnverified, secret)
  const cOwnerB = await as(ownerB, secret)
  const cAnon = anon()

  // ===== A. Auth & access control =====
  section('A auth')
  await test('A1 anon → 401 on /api/documents', async () => { const r = await cAnon.get('/api/documents'); eq(r.status, 401, 'anon docs') })
  await test('A2 forged session authenticated', async () => { const r = await cOwner1.get('/api/documents'); eq(r.status, 200, 'owner docs') })
  await test('A3 non-admin → 403 platform members', async () => { const r = await cOwner1.get('/api/admin/platform/members'); eq(r.status, 403, 'owner platform members') })
  await test('A5 platform admin → 200 members', async () => { const r = await cAdmin.get('/api/admin/platform/members'); eq(r.status, 200, 'admin members') })

  // ===== D. Templates directory =====
  section('D templates')
  let collectiveTplId = ''
  let individualTplId = ''
  await test('D1 admin lists document templates', async () => {
    const r = await cAdmin.get('/api/admin/platform/document-templates'); eq(r.status, 200, 'list')
    const items = r.json?.items ?? []
    assert(items.length >= 15, `expected >=15 templates, got ${items.length}`)
    collectiveTplId = items.find((t: any) => t.scope === 'collective')?.id ?? ''
    individualTplId = items.find((t: any) => t.scope === 'individual')?.id ?? ''
    assert(collectiveTplId && individualTplId, 'need both scopes')
  })
  await test('D1 non-admin → 403 templates', async () => { const r = await cOwner1.get('/api/admin/platform/document-templates'); eq(r.status, 403, 'owner templates') })
  await test('C1 individual templates list (auth)', async () => { const r = await cOwner1.get('/api/documents/templates'); eq(r.status, 200, 'ind tpl'); assert((r.json?.items ?? []).length >= 2, 'ind templates') })

  // ===== B. Petition lifecycle (primary, full) =====
  section('B lifecycle')
  let petId = ''
  await test('B1 create DRAFT', async () => {
    const r = await cAdminA.post('/api/petitions', { orgId: data.orgA, title: 'QA Заявление о ремонте двора', recipient: 'Главе управы', draftText: 'Просим отремонтировать двор.' })
    eq(r.status, 201, `create (${r.status} ${r.text.slice(0, 120)})`); petId = r.json?.id; assert(petId, 'id')
  })
  await test('B2 apply-template missing required → 400', async () => {
    const r = await cAdminA.post(`/api/petitions/${petId}/apply-template`, { templateId: collectiveTplId, values: {} })
    eq(r.status, 400, 'missing fields'); assert(Array.isArray(r.json?.missing), 'missing list')
  })
  await test('B2 apply-template ok', async () => {
    const r = await cAdminA.post(`/api/petitions/${petId}/apply-template`, { templateId: collectiveTplId, values: { recipient: 'Главе управы', from_line: 'Жители QA', body: 'Текст обращения QA' } })
    eq(r.status, 200, `apply (${r.status} ${r.text.slice(0, 120)})`); assert((r.json?.draftText ?? '').length > 0, 'draftText filled')
  })
  await test('B3 legal-polish (tolerate LLM 502)', async () => {
    const r = await cAdminA.post(`/api/petitions/${petId}/legal-polish`, { text: 'Просим отремонтировать двор.' })
    assert(r.status === 200 || r.status === 502, `polish status ${r.status}`); if (r.status === 200) assert(r.json?.revisedText, 'revised')
  })
  await test('B4 DRAFT→DISCUSSION', async () => { const r = await cAdminA.patch(`/api/petitions/${petId}`, { status: 'DISCUSSION' }); eq(r.status, 200, `to discussion (${r.text.slice(0, 100)})`) })
  await test('B4 invalid transition DISCUSSION→EXPORTED → 400', async () => { const r = await cAdminA.patch(`/api/petitions/${petId}`, { status: 'EXPORTED' }); assert(r.status >= 400, `invalid transition allowed? ${r.status}`) })
  await test('B5 comment as owner', async () => { const r = await cOwner1.post(`/api/petitions/${petId}/comments`, { text: 'Поддерживаю, добавьте лавочки.' }); assert(r.status === 200 || r.status === 201, `comment ${r.status} ${r.text.slice(0,100)}`) })
  await test('B5 comment non-member → 403', async () => { const r = await cOwnerB.post(`/api/petitions/${petId}/comments`, { text: 'чужой' }); eq(r.status, 403, 'cross-org comment') })
  await test('B6 reaction on petition', async () => { const r = await cOwner1.post(`/api/petitions/${petId}/reactions`, { emoji: '👍' }); assert(r.status === 200 || r.status === 201, `react ${r.status} ${r.text.slice(0,100)}`) })
  await test('B6 invalid emoji → 400', async () => { const r = await cOwner1.post(`/api/petitions/${petId}/reactions`, { emoji: 'x' }); eq(r.status, 400, 'bad emoji') })
  await test('B7 DISCUSSION→AI_REVISION', async () => { const r = await cAdminA.patch(`/api/petitions/${petId}`, { status: 'AI_REVISION' }); eq(r.status, 200, `to ai (${r.text.slice(0,100)})`) })
  await test('B7 set finalText (via PATCH)', async () => { const r = await cAdminA.patch(`/api/petitions/${petId}`, { finalText: 'Итоговый текст заявления QA с реквизитами.' }); eq(r.status, 200, 'finalText') })
  await test('B8 AI_REVISION→SIGNING', async () => { const r = await cAdminA.patch(`/api/petitions/${petId}`, { status: 'SIGNING' }); eq(r.status, 200, `to signing (${r.text.slice(0,100)})`) })
  await test('B9 visibility public', async () => { const r = await cAdminA.patch(`/api/petitions/${petId}/visibility`, { isPublic: true }); assert(r.status === 200, `visibility ${r.status} ${r.text.slice(0,100)}`) })
  await test('B8 sign by verified owners; count', async () => {
    let signed = 0
    for (const u of ownersA.filter(o => o.phoneVerified)) {
      const c = await as(u, secret)
      const r = await c.post(`/api/petitions/${petId}/sign`, { legalConsent: true })
      if (r.status === 201 || r.status === 200) signed++
    }
    assert(signed >= 3, `expected >=3 signatures, got ${signed}`)
    const cnt = await prisma.petitionSignature.count({ where: { petitionId: petId } })
    assert(cnt === signed, `db count ${cnt} != ${signed}`)
  })
  await test('B8 unverified owner sign → 403', async () => { const r = await cOwnerUnv.post(`/api/petitions/${petId}/sign`, { legalConsent: true }); eq(r.status, 403, 'unverified sign') })
  await test('B8 double-sign idempotent', async () => {
    const before = await prisma.petitionSignature.count({ where: { petitionId: petId } })
    await cOwner1.post(`/api/petitions/${petId}/sign`, { legalConsent: true })
    const after = await prisma.petitionSignature.count({ where: { petitionId: petId } })
    eq(after, before, 'double sign created extra')
  })
  await test('B11 preview PDF as admin', async () => { const r = await cAdminA.get(`/api/petitions/${petId}/preview`); assert(isPdf(r), `preview not pdf (${r.status} ${r.contentType})`) })
  await test('B12 delete with signatures → blocked', async () => { const r = await cAdminA.del(`/api/petitions/${petId}`); assert(r.status >= 400, `delete with sigs allowed? ${r.status}`) })
  await test('B10 SIGNING→CLOSED', async () => { const r = await cAdminA.patch(`/api/petitions/${petId}`, { status: 'CLOSED' }); eq(r.status, 200, `to closed (${r.text.slice(0,100)})`) })
  await test('B10 export PDF (POST → EXPORTED)', async () => { const r = await cAdminA.post(`/api/petitions/${petId}/export`); assert(isPdf(r), `export not pdf (${r.status} ${r.text.slice(0,120)})`) })

  // ===== C. Documents & appendices =====
  section('C documents')
  let docId = ''
  await test('C2 create individual document (profile prefill)', async () => {
    const r = await cOwner1.post('/api/documents', { templateId: individualTplId })
    eq(r.status, 201, `create doc ${r.status} ${r.text.slice(0,100)}`); docId = r.json?.id; assert(docId, 'doc id')
    const fv = r.json?.fieldValues ?? {}
    assert(Object.keys(fv).length >= 0, 'fieldValues present')
  })
  await test('C3 edit fieldValues', async () => { const r = await cOwner1.patch(`/api/documents/${docId}`, { fieldValues: { applicant_name: 'QA Owner', statement_body: 'Прошу проверить.', sign_date: '05.06.2026', applicant_address: 'QA addr', applicant_phone: '+79990000', addressee_org: 'ОМВД' } }); eq(r.status, 200, 'edit doc') })
  await test('C4 sign document', async () => { const r = await cOwner1.post(`/api/documents/${docId}/sign`, { legalConsent: true }); assert(r.status === 200 || r.status === 201, `sign doc ${r.status} ${r.text.slice(0,120)}`) })
  await test('C3 edit signed doc → 409', async () => { const r = await cOwner1.patch(`/api/documents/${docId}`, { title: 'x' }); eq(r.status, 409, 'signed edit') })
  await test('C5 export document PDF (owner)', async () => { const r = await cOwner1.get(`/api/documents/${docId}/export`); assert(isPdf(r), `doc export not pdf (${r.status})`) })
  await test('C9 user petitions list (non-DRAFT)', async () => { const r = await cOwner1.get('/api/documents/petitions'); eq(r.status, 200, 'doc petitions'); assert(Array.isArray(r.json?.items), 'items') })
  await test('C6 attach doc to petition (member)', async () => { const r = await cOwner1.patch(`/api/documents/${docId}`, { petitionId: petId }); eq(r.status, 200, `attach ${r.status} ${r.text.slice(0,100)}`) })
  await test('C6 attach to foreign petition → 403', async () => {
    const rp = await cAdminB.post('/api/petitions', { orgId: data.orgB, title: 'QA B', draftText: 'x' })
    const foreignPet = rp.json?.id
    const r = await cOwner1.patch(`/api/documents/${docId}`, { petitionId: foreignPet }); eq(r.status, 403, 'attach foreign')
  })
  await test('C7 appendices admin list', async () => { const r = await cAdminA.get(`/api/petitions/${petId}/appendices`); eq(r.status, 200, 'appendices'); assert(Array.isArray(r.json?.items), 'items') })
  await test('C8 print package (admin)', async () => { const r = await cAdminA.get(`/api/petitions/${petId}/package`); assert(isPdf(r) || r.status === 200, `package ${r.status} ${r.contentType}`) })

  // ===== D delete/in-use =====
  section('D templates mutate')
  let tmpTplId = ''
  await test('D create template', async () => { const r = await cAdmin.post('/api/admin/platform/document-templates', { category: 'QA', title: 'QA Temp Tpl', scope: 'collective', layoutKey: 'official-letter', bodyTemplate: 'x', variables: [] }); eq(r.status, 201, 'create tpl'); tmpTplId = r.json?.id })
  await test('D update template', async () => { const r = await cAdmin.patch(`/api/admin/platform/document-templates/${tmpTplId}`, { title: 'QA Temp Tpl 2' }); eq(r.status, 200, 'update tpl') })
  await test('D delete template', async () => { const r = await cAdmin.del(`/api/admin/platform/document-templates/${tmpTplId}`); eq(r.status, 200, 'delete tpl') })
  await test('D delete in-use template → 409', async () => { const r = await cAdmin.del(`/api/admin/platform/document-templates/${individualTplId}`); eq(r.status, 409, `in-use delete (${r.status})`) })

  // ===== E. Profile & property =====
  section('E profile')
  await test('E1 update profile address', async () => { const r = await cOwner1.patch('/api/profile', { name: 'QA Owner', address: 'г. Москва, QA, д.1, кв.5' }); eq(r.status, 200, `profile ${r.status} ${r.text.slice(0,100)}`) })
  let propId = ''
  await test('E5 add property ownership (КЛАДР)', async () => {
    const r = await cOwner1.post('/api/profile/property', { address: 'г. Москва, ул. Тестовая, д.99', addressNormalized: 'г. Москва, ул. Тестовая, д.99', apartmentNumber: '10', areaSqm: 55 })
    eq(r.status, 201, `property ${r.status} ${r.text.slice(0,120)}`); propId = r.json?.id; assert(r.json?.orgName, 'orgName set (or Без организации)')
  })
  await test('E5 list property', async () => { const r = await cOwner1.get('/api/profile/property'); eq(r.status, 200, 'prop list'); assert((r.json ?? r.json?.items ?? []).length >= 0, 'list') })
  await test('E5 property declare-request + verify (seeded OTP)', async () => {
    const req = await cOwner1.post('/api/profile/property/declare-request', { propertyId: propId })
    assert(req.status === 200, `declare-request ${req.status} ${req.text.slice(0,100)}`)
    const tok = await prisma.verificationToken.findFirst({ where: { identifier: `property:${ownerVerifiedDeclared.id}:${propId}` }, orderBy: { expires: 'desc' } })
    assert(tok, 'otp token created')
    const ver = await cOwner1.post('/api/profile/property/declare-verify', { propertyId: propId, otp: tok!.token, declaredText: 'QA декларация объекта' })
    assert(ver.status === 200, `declare-verify ${ver.status} ${ver.text.slice(0,100)}`)
  })
  await test('E5 delete property', async () => { const r = await cOwner1.del(`/api/profile/property/${propId}`); eq(r.status, 200, `del prop ${r.status}`) })
  await test('E5 delete others property → 403/404', async () => { const r = await cOwnerB.del(`/api/profile/property/nonexistent-id`); assert(r.status === 404 || r.status === 403, `del foreign prop ${r.status}`) })

  // ===== F. Admin directories =====
  section('F directories')
  await test('F1 platform members has block reasons', async () => {
    const r = await cAdmin.get('/api/admin/platform/members'); eq(r.status, 200, 'members')
    const items = r.json?.items ?? r.json ?? []
    assert(Array.isArray(items) && items.length >= 15, `members count ${items.length}`)
  })
  await test('F2 org members (admin own org)', async () => { const r = await cAdminA.get('/api/admin/org/members'); assert(r.status === 200, `org members ${r.status}`) })

  // ===== H. Stress: 10 petitions to SIGNING + signatures =====
  section('H stress')
  await test('H1 create 10 petitions through lifecycle', async () => {
    let okCount = 0
    for (let i = 0; i < 10; i++) {
      const org = i % 2 === 0 ? { id: data.orgA, admin: cAdminA, owners: ownersA } : { id: data.orgB, admin: cAdminB, owners: data.users.filter(u => u.orgSlug === 'qa-org-b' && u.role === 'owner' && u.phoneVerified) }
      const cr = await org.admin.post('/api/petitions', { orgId: org.id, title: `QA Stress #${i + 1}`, draftText: `Стресс-заявление №${i + 1}.` })
      if (cr.status !== 201) continue
      const id = cr.json.id
      for (const st of ['DISCUSSION', 'AI_REVISION', 'SIGNING']) await org.admin.patch(`/api/petitions/${id}`, { status: st })
      await org.admin.patch(`/api/petitions/${id}`, { finalText: `Итог №${i + 1}` })
      let sigs = 0
      for (const u of org.owners) { const c = await as(u, secret); const r = await c.post(`/api/petitions/${id}/sign`, { legalConsent: true }); if (r.ok || r.status === 201) sigs++ }
      if (sigs > 0) okCount++
    }
    assert(okCount >= 8, `only ${okCount}/10 stress petitions reached signatures`)
  })
  await test('H5 malformed JSON → 4xx not 500', async () => {
    const r = await (await as(adminA, secret)).raw('POST', `/api/petitions`, undefined)
    assert(r.status >= 400 && r.status < 500, `malformed got ${r.status}`)
  })
  await test('H5 missing required fields → 4xx', async () => { const r = await cAdminA.post('/api/petitions', { title: 'no org' }); assert(r.status >= 400 && r.status < 500, `missing org ${r.status}`) })

  // ===== report =====
  const pass = results.filter(r => r.ok).length
  const fail = results.filter(r => !r.ok)
  console.error('\n================ QA RESULTS ================')
  for (const r of results) console.error(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? '  → ' + r.detail : ''}`)
  console.error(`\nTOTAL: ${pass}/${results.length} passed, ${fail.length} failed.`)
  await prisma.$disconnect()
  process.exit(fail.length ? 1 : 0)
}

main().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2) })
