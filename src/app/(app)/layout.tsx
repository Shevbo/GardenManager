import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { Sidebar } from '@/components/layout/Sidebar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (session?.user) {
    const u = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { profileCompleted: true },
    })
    if (u && !u.profileCompleted) {
      redirect('/register/details')
    }
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
