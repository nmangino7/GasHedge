"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Building2, Shield, FileText, DollarSign, Fuel } from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: BarChart3 },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/deals", label: "Deals & Revenue", icon: DollarSign },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Fuel className="h-8 w-8 text-emerald-400" />
          <div>
            <h1 className="text-xl font-bold">GasHedge</h1>
            <p className="text-xs text-slate-400">Fuel Cost Management</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-emerald-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-700">
        <div className="text-xs text-slate-500">
          <p>Series 65/6/63 Licensed</p>
          <p>ETF-Based Advisory</p>
        </div>
      </div>
    </aside>
  );
}
