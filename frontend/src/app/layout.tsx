import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "GasHedge — Fuel Cost Management",
  description: "ETF-based fuel hedging advisory platform for small businesses",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex bg-white">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-gray-50/50">
          <div className="max-w-6xl mx-auto px-8 py-8">{children}</div>
        </main>
      </body>
    </html>
  );
}
