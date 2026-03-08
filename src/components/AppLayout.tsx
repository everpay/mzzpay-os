import { AppSidebar } from './AppSidebar';
import { useIsMobile } from '@/hooks/use-mobile';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className={isMobile ? 'min-h-screen' : 'ml-[240px] min-h-screen'}>
        <div className={`gradient-glow pointer-events-none fixed inset-0 ${isMobile ? '' : 'ml-[240px]'}`} />
        <div className={`relative ${isMobile ? 'p-4 pt-16' : 'p-8'}`}>
          {children}
        </div>
      </main>
    </div>
  );
}
