import { useState } from "react";
import { NavLink, Link, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  BookOpen, Code2, Key, Webhook, Download, Compass,
  CreditCard, UserCircle, Zap, ChevronLeft, Menu,
  ArrowLeft, Search, FileText, Package,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import mzzpayIcon from "@/assets/mzzpay-logo.png";

const navSections = [
  {
    title: "Getting Started",
    items: [
      { label: "Overview", icon: Compass, to: "/developers" },
      { label: "Quick Start", icon: Zap, to: "/developers/quick-start" },
    ],
  },
  {
    title: "API Reference",
    items: [
      { label: "Authentication", icon: Key, to: "/developers/api/authentication" },
      { label: "Payments", icon: CreditCard, to: "/developers/api/payments" },
      { label: "Customers", icon: UserCircle, to: "/developers/api/customers" },
      { label: "Invoices", icon: FileText, to: "/developers/api/invoices" },
      { label: "Products", icon: Package, to: "/developers/api/products" },
    ],
  },
  {
    title: "Tools",
    items: [
      { label: "API Keys", icon: Key, to: "/developers/api-keys" },
      { label: "Webhooks", icon: Webhook, to: "/developers/webhooks" },
      { label: "SDKs", icon: Download, to: "/developers/sdks" },
    ],
  },
];

export default function DocsLayout() {
  const [open, setOpen] = useState(true);

  return (
    <div className="docs-theme flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border z-30 transition-all duration-300 flex flex-col",
          open ? "w-60" : "w-16"
        )}
      >
        <div className="flex items-center justify-between px-4 h-14 border-b border-sidebar-border shrink-0">
          {open && (
            <Link to="/developers" className="flex items-center gap-2">
              <img src={mzzpayIcon} alt="MzzPay" className="h-7 w-7 rounded-lg" />
              <span className="font-logo text-lg tracking-wide text-sidebar-foreground">MzzPay Developers</span>
            </Link>
          )}
          <button onClick={() => setOpen(!open)} className="p-1.5 rounded-full hover:bg-sidebar-accent/60 transition-colors">
            <ChevronLeft className={cn("w-4 h-4 transition-transform", !open && "rotate-180")} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {navSections.map((section) => (
            <div key={section.title} className="mb-4">
              {open && (
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground px-3 mb-1.5 font-semibold">
                  {section.title}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/developers"}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                        isActive
                          ? "bg-[hsl(172_72%_48%_/_0.12)] text-[hsl(172_72%_42%)] font-semibold"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
                      )
                    }
                  >
                    <item.icon className="w-[18px] h-[18px] shrink-0" />
                    {open && <span>{item.label}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {open && (
          <div className="px-4 py-3 border-t border-sidebar-border">
            <p className="text-[10px] text-muted-foreground">API v1 · 2026.04</p>
          </div>
        )}
      </aside>

      {/* Main */}
      <div className={cn("flex-1 flex flex-col transition-all duration-300", open ? "ml-60" : "ml-16")}>
        <header className="sticky top-0 z-20 h-14 border-b border-border bg-background/90 backdrop-blur-md flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen(!open)} className="lg:hidden p-2 rounded-full hover:bg-muted">
              <Menu className="w-5 h-5" />
            </button>
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search MzzPay developer docs..."
                className="pl-10 w-64 bg-muted/50 border-0 focus-visible:ring-1 rounded-full"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link to="/dashboard">
              <Button variant="ghost" size="sm" className="gap-1.5 rounded-full">
                <ArrowLeft className="w-3.5 h-3.5" />
                Dashboard
              </Button>
            </Link>
            <div className="px-2.5 py-1 rounded-full bg-[hsl(172_72%_48%_/_0.15)] text-[hsl(172_72%_38%)] text-xs font-semibold">v1</div>
          </div>
        </header>
        <main className="flex-1 p-6 lg:p-10 overflow-auto animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
