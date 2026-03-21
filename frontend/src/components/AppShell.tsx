"use client";
import { useState } from "react";
import Sidebar from "./Sidebar";
import ChatSidebar from "./ChatSidebar";
import { Menu, Fuel } from "lucide-react";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      {/* Mobile header */}
      <div className="md:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gray-900 rounded-md flex items-center justify-center">
            <Fuel className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-900">GasHedge</span>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 overflow-auto bg-gray-50/50">
          <div className="max-w-6xl mx-auto px-4 py-4 md:px-8 md:py-8">{children}</div>
        </main>
      </div>

      <ChatSidebar />
    </>
  );
}
