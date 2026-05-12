"use client";
import { useState } from "react";
import Sidebar from "./Sidebar";
import ChatSidebar from "./ChatSidebar";
import { Menu, Flame } from "lucide-react";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      {/* Mobile header */}
      <div
        className="md:hidden sticky top-0 z-30 px-4 py-3 flex items-center gap-3 no-print"
        style={{
          background: "linear-gradient(180deg, #0b1220 0%, #111a2f 100%)",
          color: "#fff",
        }}
      >
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-1.5 rounded-md hover:bg-white/10 text-white"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #d4762a 0%, #b86620 100%)" }}
          >
            <Flame className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-bold tracking-tight text-white font-display">GasHedge</span>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main
          className="flex-1 overflow-auto"
          style={{ background: "var(--bg)" }}
        >
          <div className="max-w-7xl mx-auto px-4 py-6 md:px-10 md:py-10 animate-in">
            {children}
          </div>
        </main>
      </div>

      <ChatSidebar />
    </>
  );
}
