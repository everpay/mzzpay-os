import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  ArrowUpRight,
  Zap,
  Settings,
  CreditCard,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { to: '/wallets', icon: Wallet, label: 'Wallets' },
  { to: '/payouts', icon: ArrowUpRight, label: 'Payouts' },
  { to: '/payments/new', icon: CreditCard, label: 'New Payment' },
  { to: '/activity', icon: Zap, label: 'Activity' },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[240px] flex-col border-r border-border bg-sidebar">
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
          <CreditCard className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-heading text-lg font-bold text-foreground tracking-tight">
          Everpay
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-sidebar-accent text-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground'
              }`}
            >
              <item.icon className={`h-4 w-4 ${isActive ? 'text-primary' : ''}`} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-border px-3 py-4">
        <NavLink
          to="/settings"
          className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground transition-colors"
        >
          <Settings className="h-4 w-4" />
          Settings
        </NavLink>
      </div>
    </aside>
  );
}
