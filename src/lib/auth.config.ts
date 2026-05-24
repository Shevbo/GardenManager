import type { NextAuthConfig } from 'next-auth'

// Edge-safe config — no server-only imports, only for middleware
export const authConfig: NextAuthConfig = {
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
  callbacks: {
    authorized({ auth, request }) {
      const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')
      if (isAdminRoute && !auth?.user) return false
      return true
    },
  },
  providers: [], // провайдеры только в auth.ts (не в edge)
  trustHost: true,
}
