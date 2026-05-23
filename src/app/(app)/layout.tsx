import { Sidebar } from '@/components/layout/Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen bg-[#F7F5F0] flex overflow-hidden">
      <Sidebar />
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden" style={{ marginLeft: '15rem' }}>
        {children}
      </main>
    </div>
  );
}
