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
  ChevronDown,
  ArrowUpRight,
  Eye,
  Users,
  BarChart3,
  AlertTriangle,
  Archive,
  UserCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import everpayIcon from "@/assets/mzzpay-logo.png";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  children?: { to: string; icon: React.ElementType; label: string }[];
  requiredRole?: "admin" | "reseller" | "developer" | "compliance_officer" | "support" | "agent" | "employee";
  hiddenFromRoles?: string[];
}

const navItems: NavItem[] = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/customers", icon: UserCircle, label: "Customers" },
  {
    to: "/transactions",
    icon: ArrowLeftRight,
    label: "Transactions",
    children: [
      { to: "/transactions", icon: Eye, label: "Overview" },
      { to: "/payments/new", icon: CreditCard, label: "New Payment" },
      { to: "/payment-links", icon: Link2, label: "Payment Links" },
    ],
  },
  { to: "/subscriptions", icon: RefreshCw, label: "Subscriptions" },
  { to: "/invoices", icon: FileText, label: "Invoices" },
  {
    to: "/wallets",
    icon: Wallet,
    label: "Treasury",
    hiddenFromRoles: ["support", "agent", "employee"],
    children: [
      { to: "/wallets", icon: Eye, label: "Overview" },
      { to: "/payouts", icon: ArrowUpRight, label: "Payouts" },
    ],
  },
  {
    to: "/chargebacks",
    icon: Shield,
    label: "Chargebacks",
    children: [
      { to: "/chargebacks", icon: Eye, label: "Overview" },
      { to: "/chargebacks/disputes", icon: AlertTriangle, label: "Disputes" },
      { to: "/chargebacks/evidence", icon: Archive, label: "Evidence" },
    ],
  },
  { to: "/analytics", icon: BarChart3, label: "Analytics", hiddenFromRoles: ["agent", "employee"] },
  { to: "/settings", icon: Settings, label: "Settings", hiddenFromRoles: ["agent", "employee"] },
  { to: "/reseller", icon: Users, label: "Reseller Portal", requiredRole: "reseller" },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { data: userRole } = useUserRole();

  const visibleNavItems = navItems.filter((item) => {
    if (!item.requiredRole) {
      // Hide certain items from limited roles
      if (item.hiddenFromRoles && userRole) {
        return !item.hiddenFromRoles.some((r) => userRole.roles.includes(r as any));
      }
      return true;
    }
    if (!userRole) return false;
    if (item.requiredRole === "admin") return userRole.isAdmin;
    if (item.requiredRole === "reseller") return userRole.isReseller;
    if (item.requiredRole === "developer") return userRole.isDeveloper || userRole.isAdmin;
    if (item.requiredRole === "compliance_officer") return userRole.isComplianceOfficer || userRole.isAdmin;
    if (item.requiredRole === "support") return userRole.isSupport || userRole.isAdmin;
    if (item.requiredRole === "agent") return userRole.isAgent || userRole.isAdmin;
    if (item.requiredRole === "employee") return userRole.isEmployee || userRole.isAdmin;
    return false;
  });

  const isChildActive = (item: NavItem) =>
    item.children?.some((c) => location.pathname === c.to) || location.pathname === item.to;

  return (
    <>
      <div className="flex h-16 items-center justify-between border-b border-border px-6">
        <div className="flex items-center gap-2.5">
          <img src={everpayIcon} alt="MzzPay" className="h-8 w-8 rounded-lg" />
          <span className="font-heading text-lg font-bold text-foreground tracking-tight">MzzPay</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {visibleNavItems.map((item) => {
          if (item.children) {
            const active = isChildActive(item);
            return (
              <Collapsible key={item.to} defaultOpen={active}>
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium transition-colors text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground">
                  <span className="flex items-center gap-3">
                    <item.icon className={`h-4 w-4 ${active ? "text-primary" : ""}`} />
                    {item.label}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-3">
                    {item.children.map((child) => {
                      const childActive = location.pathname === child.to;
                      return (
                        <NavLink
                          key={child.to + child.label}
                          to={child.to}
                          onClick={onNavigate}
                          className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                            childActive
                              ? "bg-sidebar-accent text-foreground"
                              : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
                          }`}
                        >
                          <child.icon className={`h-3.5 w-3.5 ${childActive ? "text-primary" : ""}`} />
                          {child.label}
                        </NavLink>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          }

          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
              }`}
            >
              <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-border px-3 py-4 space-y-1">
        {user && (
          <div className="px-3 py-2 mb-1">
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        )}
        <button
          onClick={() => {
            signOut();
            onNavigate?.();
          }}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4 text-destructive" />
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
          className="md:hidden fixed top-3 left-3 z-50 h-10 w-10 bg-card border border-border shadow-card"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="left" className="w-[240px] p-0 bg-sidebar border-border">
            <VisuallyHidden>
              <SheetTitle>Navigation</SheetTitle>
            </VisuallyHidden>
            <div className="flex h-full flex-col">
              <SidebarContent onNavigate={() => setOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[240px] flex-col border-r border-border bg-sidebar">
      <SidebarContent />
    </aside>
  );
}
