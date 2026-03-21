"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Building2, DollarSign, Fuel, Settings, Shield, X } from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: BarChart3 },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/annuities", label: "Annuities", icon: Shield },
  { href: "/deals", label: "Deals & Revenue", icon: DollarSign },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-60 bg-white border-r border-gray-200 flex flex-col
          transition-transform duration-200 ease-in-out
          md:static md:translate-x-0 md:shrink-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="px-5 py-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-gray-900 rounded-lg flex items-center justify-center">
              <Fuel className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-gray-900">GasHedge</h1>
              <p className="text-[11px] text-gray-400 leading-tight">Fuel Cost Management</p>
            </div>
          </div>
          {/* Close button on mobile */}
          <button
            onClick={onClose}
            className="md:hidden p-1 rounded-md hover:bg-gray-100 text-gray-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-gray-100 text-gray-900 font-medium"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-5 py-4 border-t border-gray-100">
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Series 65/6/63 Licensed<br />
            ETF &amp; Annuity Advisory
          </p>
        </div>
      </aside>
    </>
  );
}
