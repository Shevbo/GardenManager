import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { RegisterDetailsForm } from '@/components/register/RegisterDetailsForm'

export default async function RegisterDetailsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, profileCompleted: true },
  })

  if (user?.profileCompleted) redirect('/dashboard')

  return <RegisterDetailsForm initialName={user?.name ?? ''} />
}
