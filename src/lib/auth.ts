import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import prisma from './prisma'
import { authConfig } from './auth.config'

const BRIDGE_URL = 'https://shectory.ru/api/internal/verify-portal-credentials'

async function verifyViaBridge(email: string, password: string) {
  const secret = process.env.SHECTORY_AUTH_BRIDGE_SECRET
  if (!secret) return null

  const res = await fetch(BRIDGE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${secret}`,
    },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) return null
  const data = await res.json()
  if (!data.ok) return null
  return data as { ok: true; fullName?: string }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Пароль', type: 'password' },
      },
      async authorize(credentials) {
        const email = (credentials?.email as string | undefined)?.trim().toLowerCase()
        const password = credentials?.password as string | undefined
        if (!email || !password) return null

        const profile = await verifyViaBridge(email, password)
        if (!profile) return null

        const user = await prisma.user.upsert({
          where: { email },
          update: { name: profile.fullName ?? undefined, emailVerified: new Date() },
          create: { email, name: profile.fullName, emailVerified: new Date() },
          select: { id: true, email: true, name: true },
        })

        return { id: user.id, email: user.email ?? undefined, name: user.name ?? undefined }
      },
    }),
    Credentials({
      id: 'email-otp',
      name: 'Email OTP',
      credentials: {
        email: { label: 'Email', type: 'email' },
        otp:   { label: 'Code',  type: 'text'  },
      },
      async authorize(credentials) {
        const email = (credentials?.email as string | undefined)?.trim().toLowerCase()
        const otp   = credentials?.otp as string | undefined
        if (!email || !otp) return null

        const token = await prisma.verificationToken.findFirst({
          where: { identifier: email, token: otp, expires: { gt: new Date() } },
        })
        if (!token) return null

        await prisma.verificationToken.deleteMany({ where: { identifier: email } })

        const user = await prisma.user.upsert({
          where:  { email },
          update: { emailVerified: new Date() },
          create: { email, emailVerified: new Date() },
          select: { id: true, email: true, name: true },
        })

        return { id: user.id, email: user.email ?? undefined, name: user.name ?? undefined }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
      }
      if (token.id) {
        const u = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { profileCompleted: true },
        })
        token.profileCompleted = u?.profileCompleted ?? true
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        if (token.email) session.user.email = token.email
        ;(session.user as { profileCompleted?: boolean }).profileCompleted = token.profileCompleted as boolean | undefined
      }
      return session
    },
  },
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
})
