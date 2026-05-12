"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  DollarSign,
  Settings,
  X,
  Shield,
  Calculator,
  FileText,
  Activity,
  Flame,
  Library,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { useTheme } from "./ThemeProvider";

const navItems = [
  { href: "/", label: "Dashboard", icon: BarChart3 },
  { href: "/companies", label: "Clients", icon: Building2 },
  { href: "/deals", label: "Deals & Revenue", icon: DollarSign },
  { href: "/tracker", label: "Live Tracker", icon: Activity, badge: "LIVE" },
  { href: "/etfs", label: "ETF Library", icon: Library },
  { href: "/settings", label: "Settings", icon: Settings },
];

const TOOL_DEFS = [
  { slug: "risk-score", label: "Risk Score", icon: Shield },
  { slug: "budget", label: "Budget Modeler", icon: Calculator },
  { slug: "hedging", label: "Strategy Compare", icon: BarChart3 },
  { slug: "implementation", label: "Implementation Plan", icon: FileText },
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
  const { theme, setTheme } = useTheme();
  const toolItems = TOOL_DEFS.map((t) => ({
    ...t,
    href: activeCompanyId ? `/${t.slug}/${activeCompanyId}` : null,
  }));

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-[260px] flex flex-col
          transition-transform duration-200 ease-in-out
          md:static md:translate-x-0 md:shrink-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{
          background: "linear-gradient(180deg, #0b1220 0%, #111a2f 100%)",
          color: "#e9ecf2",
        }}
      >
        {/* Logo header */}
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #d4762a 0%, #b86620 100%)",
                  boxShadow: "0 4px 12px rgba(212, 118, 42, 0.3)",
                }}
              >
                <Flame className="h-5 w-5 text-white" strokeWidth={2.2} />
              </div>
              <div>
                <h1
                  className="font-display text-[15px] font-bold tracking-tight text-white"
                >
                  GasHedge
                </h1>
                <p className="text-[10px] text-white/40 font-medium tracking-wider uppercase">
                  Advisory Platform
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="md:hidden p-1.5 rounded-lg hover:bg-white/10 text-white/70"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Main nav */}
        <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
          <p className="px-3 text-[10px] font-semibold text-white/35 uppercase tracking-wider mb-2.5">
            Main
          </p>
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-colors ${
                  isActive
                    ? "text-white font-semibold"
                    : "text-white/65 hover:bg-white/5 hover:text-white"
                }`}
                style={
                  isActive
                    ? {
                        background:
                          "linear-gradient(90deg, rgba(212,118,42,0.18) 0%, rgba(212,118,42,0.04) 100%)",
                        boxShadow:
                          "inset 3px 0 0 #d4762a",
                      }
                    : undefined
                }
              >
                <item.icon
                  className={`h-4 w-4 ${isActive ? "text-[#e8893f]" : ""}`}
                  strokeWidth={isActive ? 2.4 : 2}
                />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span
                    className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded"
                    style={{
                      background: "rgba(21, 163, 92, 0.18)",
                      color: "#7fdfa6",
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="pt-5 pb-1">
            <p className="px-3 text-[10px] font-semibold text-white/35 uppercase tracking-wider mb-2.5">
              Client Tools
              {activeCompanyId ? "" : (
                <span className="text-white/25 normal-case ml-1 font-normal tracking-normal">
                  · pick a client
                </span>
              )}
            </p>
          </div>
          {toolItems.map((item) => {
            const isActive = item.href ? pathname.startsWith(`/${item.slug}/`) : false;
            const disabled = !item.href;
            if (disabled) {
              return (
                <div
                  key={item.slug}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] text-white/25 cursor-not-allowed"
                  title="Open a client first to use this tool"
                >
                  <item.icon className="h-4 w-4" strokeWidth={2} />
                  {item.label}
                </div>
              );
            }
            return (
              <Link
                key={item.slug}
                href={item.href!}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-colors ${
                  isActive ? "text-white font-semibold" : "text-white/65 hover:bg-white/5 hover:text-white"
                }`}
                style={
                  isActive
                    ? {
                        background:
                          "linear-gradient(90deg, rgba(212,118,42,0.18) 0%, rgba(212,118,42,0.04) 100%)",
                        boxShadow: "inset 3px 0 0 #d4762a",
                      }
                    : undefined
                }
              >
                <item.icon className={`h-4 w-4 ${isActive ? "text-[#e8893f]" : ""}`} strokeWidth={isActive ? 2.4 : 2} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Theme toggle */}
        <div className="px-4 pb-3">
          <div
            className="rounded-xl p-1 border border-white/10 grid grid-cols-3 gap-0.5"
            style={{ background: "rgba(255, 255, 255, 0.03)" }}
          >
            {([
              { id: "light", icon: Sun, label: "Light" },
              { id: "dark", icon: Moon, label: "Dark" },
              { id: "system", icon: Monitor, label: "Auto" },
            ] as const).map((t) => {
              const active = theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className="flex flex-col items-center gap-0.5 py-1.5 rounded-lg transition-colors"
                  style={{
                    background: active ? "rgba(212, 118, 42, 0.22)" : "transparent",
                    color: active ? "#f4b07a" : "rgba(255, 255, 255, 0.55)",
                  }}
                  title={t.label}
                >
                  <t.icon className="h-3.5 w-3.5" strokeWidth={active ? 2.4 : 2} />
                  <span className="text-[9px] font-semibold tracking-wider uppercase">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer card */}
        <div className="px-4 pb-4">
          <div
            className="rounded-xl p-3.5 border border-white/10"
            style={{ background: "rgba(255, 255, 255, 0.03)" }}
          >
            <div className="flex items-start gap-2.5">
              <Shield className="h-4 w-4 text-[#e8893f] mt-0.5" strokeWidth={2.2} />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-white tracking-tight">
                  Series 65/66 Registered
                </p>
                <p className="text-[10px] text-white/45 leading-relaxed mt-0.5">
                  Advisory only · client-directed execution
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
