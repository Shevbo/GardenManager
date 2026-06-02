/**
 * Keymaster HTTP client.
 *
 * Источник правды по секретам — Ключник на smain (http://10.66.0.1:9093).
 * Значения никогда не пишутся на диск, в env-файлы, в логи. Только в RAM процесса.
 *
 * Контракт API (`~/keymaster/api_server.py` на smain):
 *   POST /keymaster/request-value?name=&requester=&purpose=
 *     → если requester в pre_approved → { status:'approved', request_id }
 *   GET  /keymaster/deliver?request_id=
 *     → { value }   (файл-доставка самоуничтожается после чтения)
 *
 * Документация: `ssh smain 'cat /home/shectory/workspaces/infra/lineman/docs/AGENT_KEYMASTER_ONBOARDING.md'`.
 */

import { hostname } from 'node:os'

const KEYMASTER_URL = process.env.KEYMASTER_URL ?? 'http://10.66.0.1:9093'
const REQUESTER = process.env.KEYMASTER_REQUESTER ?? `garden-manager@${hostname()}`

interface RequestValueResponse {
  status?: string
  request_id?: string
  error?: string
  delivery?: string
  ttl_seconds?: number
}

interface DeliverResponse {
  value?: string
  error?: string
}

export async function fetchSecret(
  name: string,
  purpose: string = 'app startup',
): Promise<string> {
  const qs = new URLSearchParams({ name, requester: REQUESTER, purpose })
  const reqRes = await fetch(`${KEYMASTER_URL}/keymaster/request-value?${qs}`, {
    method: 'POST',
  })
  if (!reqRes.ok) {
    throw new Error(`Keymaster request-value ${name}: HTTP ${reqRes.status}`)
  }
  const reqData = (await reqRes.json()) as RequestValueResponse
  if (reqData.status !== 'approved' || !reqData.request_id) {
    throw new Error(
      `Keymaster ${name}: status=${reqData.status} error=${reqData.error ?? '?'} ` +
        `(requester ${REQUESTER} likely not pre_approved — run on smain: ` +
        `curl -X POST 'http://127.0.0.1:9093/keymaster/pre_approve?name=${name}&requester=${REQUESTER}')`,
    )
  }
  const delRes = await fetch(
    `${KEYMASTER_URL}/keymaster/deliver?request_id=${reqData.request_id}`,
  )
  if (!delRes.ok) {
    throw new Error(`Keymaster deliver ${name}: HTTP ${delRes.status}`)
  }
  const delData = (await delRes.json()) as DeliverResponse
  if (!delData.value) {
    throw new Error(`Keymaster deliver ${name}: no value (${delData.error ?? 'empty'})`)
  }
  return delData.value
}

/**
 * Подгрузить набор секретов в process.env. ВЫЗЫВАЕТСЯ ТОЛЬКО ИЗ instrumentation.ts
 * при старте Node.js-процесса. Значения попадают в env только в RAM текущего процесса —
 * никаких .env-файлов, никакого `pm2 save`. По логам пишем только метаданные
 * (имя env, длина, fingerprint).
 *
 * @param mapping  Object where key = process.env variable name, value = keymaster secret name
 */
export async function bootstrapSecrets(
  mapping: Record<string, string>,
): Promise<{ loaded: string[]; failed: Record<string, string> }> {
  const loaded: string[] = []
  const failed: Record<string, string> = {}

  await Promise.all(
    Object.entries(mapping).map(async ([envKey, kmName]) => {
      try {
        const val = await fetchSecret(kmName, `bootstrap ${envKey}`)
        process.env[envKey] = val
        const fp = val.length > 6 ? `${val.slice(0, 4)}***${val.slice(-2)}` : '***'
        console.log(
          `[keymaster] ${envKey} ← ${kmName} (len=${val.length}, fp=${fp})`,
        )
        loaded.push(envKey)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        console.error(`[keymaster] ${envKey} ← ${kmName}: FAILED — ${msg}`)
        failed[envKey] = msg
      }
    }),
  )

  return { loaded, failed }
}

export function getRequester(): string {
  return REQUESTER
}

export function getKeymasterUrl(): string {
  return KEYMASTER_URL
}
