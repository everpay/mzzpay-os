import { AppSidebar } from './AppSidebar';

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="ml-[240px] min-h-screen">
        <div className="gradient-glow pointer-events-none fixed inset-0 ml-[240px]" />
        <div className="relative p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
