import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Settings,
  CreditCard,
  Menu,
  LogOut,
  RefreshCw,
  Link2,
  Shield,
  FileText,
  ArrowUpRight,
  UserCircle,
  BarChart3,
  AlertTriangle,
  Archive,
  RotateCcw,
  Package,
  Users,
  FileBarChart,
  Landmark,
  Webhook,
  Building2,
  Send,
  ScrollText,
  BadgeCheck,
  Activity,
  Lock,
  Repeat,
  ShieldCheck,
  BookOpen,
  Plug,
  GitBranch,
  Globe2,
  Server,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { BrandLogo } from "@/components/BrandLogo";

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  visibleTo?: string[];
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    items: [
      { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { to: "/customers", icon: UserCircle, label: "Customers" },
    ],
  },
  {
    title: "Payments",
    items: [
      { to: "/transactions", icon: ArrowLeftRight, label: "Transactions" },
      { to: "/payments/new", icon: CreditCard, label: "New Payment" },
      { to: "/payment-links", icon: Link2, label: "Payment Links" },
      { to: "/refunds", icon: RotateCcw, label: "Refunds" },
    ],
  },
  {
    title: "Commerce",
    items: [
      { to: "/invoices", icon: FileText, label: "Invoices" },
      { to: "/products", icon: Package, label: "Products" },
      { to: "/subscriptions", icon: RefreshCw, label: "Subscriptions" },
    ],
  },
  {
    title: "Treasury",
    items: [
      { to: "/settlements", icon: Landmark, label: "Settlements" },
      { to: "/bank-accounts", icon: Building2, label: "Bank Accounts" },
      { to: "/payouts", icon: ArrowUpRight, label: "Payouts" },
      { to: "/wallets", icon: Wallet, label: "Wallets" },
      { to: "/recipients", icon: Send, label: "Recipients" },
    ],
  },
  {
    title: "Risk & Disputes",
    items: [
      { to: "/chargebacks", icon: Shield, label: "Chargebacks" },
      { to: "/chargebacks/disputes", icon: AlertTriangle, label: "Disputes" },
      { to: "/chargebacks/evidence", icon: Archive, label: "Evidence" },
    ],
  },
  {
    title: "Insights",
    items: [
      { to: "/analytics", icon: BarChart3, label: "Analytics" },
      { to: "/processor-analytics", icon: Activity, label: "Processor Analytics" },
      { to: "/reports", icon: FileText, label: "Reports" },
    ],
  },
  {
    title: "Configuration",
    items: [
      { to: "/processor-routing", icon: GitBranch, label: "Processor Routing" },
      { to: "/multi-acquirer", icon: Globe2, label: "Multi-Acquirer" },
      { to: "/smart-retry", icon: Repeat, label: "Smart Retry" },
    ],
  },
  {
    title: "Super Admin",
    items: [
      { to: "/admin/processors", icon: Server, label: "Processor Admin", visibleTo: ["super_admin", "admin"] },
      { to: "/integrations", icon: Plug, label: "Integrations", visibleTo: ["super_admin"] },
      { to: "/risk", icon: ShieldCheck, label: "Risk Profile", visibleTo: ["super_admin"] },
      { to: "/3ds-settings", icon: Lock, label: "3D Secure", visibleTo: ["super_admin"] },
      { to: "/reconciliation", icon: FileBarChart, label: "Reconciliation", visibleTo: ["super_admin"] },
      { to: "/treasury", icon: Landmark, label: "Multi-currency", visibleTo: ["super_admin"] },
      { to: "/audit-trail", icon: ScrollText, label: "Audit Trail", visibleTo: ["super_admin"] },
    ],
  },
  {
    items: [
      { to: "/reseller", icon: Users, label: "Reseller Portal", visibleTo: ["reseller"] },
    ],
  },
];

function SidebarNavItem({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const location = useLocation();
  const isActive = location.pathname === item.to;

  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] font-medium transition-all duration-150 ${
        isActive
          ? "bg-primary/10 text-primary border-l-[3px] border-primary -ml-px"
          : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
      }`}
    >
      <item.icon
        className={`h-[19px] w-[19px] shrink-0 transition-colors ${
          isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
        }`}
      />
      <span className="truncate">{item.label}</span>
    </NavLink>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const { signOut, user } = useAuth();
  const { data: userRole } = useUserRole();

  const roles: string[] = (userRole as any)?.roles || [];
  const isSuperAdmin = !!(userRole as any)?.isSuperAdmin;
  const isAdmin = !!(userRole as any)?.isAdmin;
  const isReseller = !!(userRole as any)?.isReseller;
  const isSupport = !!(userRole as any)?.isSupport && !isAdmin && !isSuperAdmin;

  const isItemVisible = (item: NavItem) => {
    if (!item.visibleTo) return true;
    if (!userRole) return false;
    // Strict gates: only the listed role can see these items.
    if (item.visibleTo.includes('super_admin') && !isSuperAdmin) return false;
    // Hide reseller-only items from super_admin (merchant-only flow).
    if (item.visibleTo.includes('reseller') && !isReseller) return false;
    return item.visibleTo.some((r) => roles.includes(r));
  };

  const isSectionVisible = (title?: string) => {
    if (!isSupport) return true;
    if (title === 'Treasury' || title === 'Insights' || title === 'Company' || title === 'Super Admin') return false;
    return true;
  };

  const isItemAllowedForSupport = (item: NavItem) => {
    if (!isSupport) return true;
    const supportAllowed = [
      '/dashboard', '/customers', '/transactions', '/refunds',
      '/chargebacks', '/chargebacks/disputes', '/chargebacks/evidence', '/settings',
    ];
    return supportAllowed.includes(item.to);
  };

  return (
    <>
      {/* Logo */}
      <div className="flex h-14 items-center justify-center border-b border-sidebar-border px-3">
        <BrandLogo
          iconOnly
          iconSizeClassName="h-12"
          textClassName="text-foreground"
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {navSections.map((section, idx) => {
          if (!isSectionVisible(section.title)) return null;
          const visibleItems = section.items.filter(isItemVisible).filter(isItemAllowedForSupport);
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.title || `section-${idx}`} className={idx > 0 ? "mt-5" : ""}>
              {section.title && (
                <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {section.title}
                </p>
              )}
              <div className="space-y-0.5">
                {visibleItems.map((item) => (
                  <SidebarNavItem key={item.to} item={item} onNavigate={onNavigate} />
                ))}
              </div>
            </div>
          );
        })}
        <div className="mt-5">
          <SidebarNavItem
            item={{ to: "/settings", icon: Settings, label: "Settings" }}
            onNavigate={onNavigate}
          />
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-3 py-3 space-y-1">
        {user && (
          <div className="px-3 py-1.5">
            <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
          </div>
        )}
        <button
          onClick={() => {
            signOut();
            onNavigate?.();
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[14px] font-medium text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="h-[19px] w-[19px]" />
          Sign Out
        </button>
      </div>
    </>
  );
}

export function AppSidebar() {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  if (isMobile) {
    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
          className="md:hidden fixed top-3 left-3 z-50 h-10 w-10 bg-card border border-border shadow-card rounded-full"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="left" className="w-[240px] p-0 bg-sidebar border-sidebar-border">
            <VisuallyHidden>
              <SheetTitle>Navigation</SheetTitle>
            </VisuallyHidden>
            <div className="flex h-full flex-col">
              <SidebarBody onNavigate={() => setOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[240px] flex-col border-r border-sidebar-border bg-sidebar">
      <SidebarBody />
    </aside>
  );
}
