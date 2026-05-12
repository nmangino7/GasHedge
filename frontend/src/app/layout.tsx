import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "GasHedge — Fuel Cost Risk Management",
  description: "Institutional-grade fuel cost hedging for small businesses. Series 65/66 advisory.",
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
      <body className="min-h-full flex flex-col md:flex-row">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
