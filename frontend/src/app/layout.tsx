import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";

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
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className="min-h-full flex flex-col md:flex-row bg-white">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
