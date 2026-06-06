import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { Sidebar } from '@/components/layout/Sidebar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  // Guests reach only the public petition page here (other app pages redirect to login).
  // Render it bare — no sidebar, no fixed-height/overflow-hidden shell — so the document
  // scrolls naturally on its own full-page layout.
  if (!session?.user) {
    return <>{children}</>
  }

  const u = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { profileCompleted: true },
  })
  if (u && !u.profileCompleted) {
    redirect('/register/details')
  }

  return (
    <div className="h-screen bg-[#F7F5F0] flex overflow-hidden">
      <Sidebar />
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden" style={{ marginLeft: '15rem' }}>
        {children}
      </main>
    </div>
  );
}
