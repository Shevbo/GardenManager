/** Forged Auth.js session cookie + HTTP client to drive the live app as any user. */
import { encode } from 'next-auth/jwt'
import { BASE } from './env'

// App runs with secure cookies (NEXTAUTH_URL is https) — name AND salt must be the secure variant.
const COOKIE = '__Secure-authjs.session-token'

export async function sessionCookie(user: { id: string; email?: string | null }, secret: string): Promise<string> {
  const token = await encode({
    token: { id: user.id, email: user.email ?? undefined, sub: user.id },
    secret,
    salt: COOKIE,
    maxAge: 30 * 24 * 60 * 60,
  })
  return `${COOKIE}=${token}`
}

export interface ApiResult { status: number; ok: boolean; json: any; text: string; contentType: string }

function mkReq(cookie: string | null) {
  async function req(method: string, path: string, body?: unknown): Promise<ApiResult> {
    const headers: Record<string, string> = {}
    if (cookie) headers['Cookie'] = cookie
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    const res = await fetch(BASE + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, redirect: 'manual' })
    const contentType = res.headers.get('content-type') ?? ''
    const text = await res.text()
    let json: any = null
    if (contentType.includes('application/json')) { try { json = JSON.parse(text) } catch { /* */ } }
    return { status: res.status, ok: res.ok, json, text, contentType }
  }
  return {
    get: (p: string) => req('GET', p),
    post: (p: string, b?: unknown) => req('POST', p, b),
    patch: (p: string, b?: unknown) => req('PATCH', p, b),
    del: (p: string, b?: unknown) => req('DELETE', p, b),
    raw: req,
  }
}

export type Client = ReturnType<typeof mkReq>

/** Client for a specific user (forged session). */
export async function as(user: { id: string; email?: string | null }, secret: string): Promise<Client> {
  const cookie = await sessionCookie(user, secret)
  return mkReq(cookie)
}

/** Anonymous client (no cookie). */
export const anon: () => Client = () => mkReq(null)
