"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Building2, DollarSign, Fuel, Settings, X, Shield, Calculator, FileText } from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: BarChart3 },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/deals", label: "Deals & Revenue", icon: DollarSign },
  { href: "/settings", label: "Settings", icon: Settings },
];

const TOOL_DEFS = [
  { slug: "risk-score", label: "Risk Score", icon: Shield },
  { slug: "budget", label: "Budget Calculator", icon: Calculator },
  { slug: "implementation", label: "Implementation", icon: FileText },
];

function extractCompanyId(pathname: string): string | null {
  const match = pathname.match(
    /^\/(companies|risk-score|budget|implementation|hedging|reports)\/(\d+)/
  );
  return match ? match[2] : null;
}

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const activeCompanyId = extractCompanyId(pathname);
  const toolItems = TOOL_DEFS.map((t) => ({
    ...t,
    href: activeCompanyId ? `/${t.slug}/${activeCompanyId}` : null,
  }));

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden" onClick={onClose} />
      )}

      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-slate-200 flex flex-col
        transition-transform duration-200 ease-in-out
        md:static md:translate-x-0 md:shrink-0
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 gradient-primary rounded-xl flex items-center justify-center shadow-sm">
                <Fuel className="h-4.5 w-4.5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900 tracking-tight">GasHedge</h1>
                <p className="text-[10px] text-slate-400 font-medium">Fuel Cost Management</p>
              </div>
            </div>
            <button onClick={onClose} className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Main Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Main</p>
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 font-semibold border-l-[3px] border-indigo-600 ml-0 pl-2.5"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <item.icon className={`h-4 w-4 ${isActive ? "text-indigo-600" : ""}`} />
                {item.label}
              </Link>
            );
          })}

          <div className="pt-4 pb-1">
            <p className="px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Tools{activeCompanyId ? "" : " (pick a company)"}
            </p>
          </div>
          {toolItems.map((item) => {
            const isActive = item.href ? pathname.startsWith(`/${item.slug}/`) : false;
            const disabled = !item.href;
            const className = `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
              disabled
                ? "text-slate-300 cursor-not-allowed"
                : isActive
                ? "bg-indigo-50 text-indigo-700 font-semibold border-l-[3px] border-indigo-600 ml-0 pl-2.5"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`;
            if (disabled) {
              return (
                <div
                  key={item.slug}
                  className={className}
                  title="Open a company first to use this tool"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </div>
              );
            }
            return (
              <Link
                key={item.slug}
                href={item.href!}
                onClick={onClose}
                className={className}
              >
                <item.icon className={`h-4 w-4 ${isActive ? "text-indigo-600" : ""}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100">
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
              Series 65/6/63 Licensed<br />
              ETF &amp; Futures Advisory
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
