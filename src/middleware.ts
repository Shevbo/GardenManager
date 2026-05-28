import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/register', '/invite', '/api/auth']
const ALLOWED_FOR_INCOMPLETE = ['/register/details', '/api/register/details', '/api/auth', '/api/me', '/logout']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (
    PUBLIC_PATHS.some(p => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next()
  }

  const session = await auth()
  if (!session?.user) return NextResponse.next()

  if (
    (session.user as { profileCompleted?: boolean }).profileCompleted === false &&
    !ALLOWED_FOR_INCOMPLETE.some(p => pathname.startsWith(p))
  ) {
    const url = req.nextUrl.clone()
    url.pathname = '/register/details'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
