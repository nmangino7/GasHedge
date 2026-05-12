import Link from "next/link";
import {
  BookOpen,
  ExternalLink,
  Database,
  GraduationCap,
  Building2,
  Activity,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { ETF_LIBRARY, PLATFORM_SOURCES, type DataSourceCategory } from "@/lib/etf-library";

export const metadata = {
  title: "Sources & Methodology — GasHedge",
};

const CATEGORY_LABELS: Record<DataSourceCategory, string> = {
  issuer: "Issuer / Prospectus",
  exchange: "Exchange",
  regulator: "Regulator / Government Data",
  "data-vendor": "Data Vendor",
  academic: "Academic / Methodology",
};

const CATEGORY_PILL: Record<DataSourceCategory, string> = {
  issuer: "pill-accent",
  exchange: "pill-teal",
  regulator: "pill-positive",
  "data-vendor": "pill-neutral",
  academic: "pill-outline",
};

export default function SourcesPage() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero */}
      <div className="text-center mb-16 mt-4">
        <span className="pill pill-accent inline-flex mb-5">
          <ShieldCheck className="h-3 w-3" />
          Verified data &amp; transparent methodology
        </span>
        <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] mb-5">
          Every number, sourced.
        </h1>
        <p className="text-[17px] md:text-[19px] text-[color:var(--muted)] max-w-2xl mx-auto leading-relaxed">
          GasHedge is built on publicly verifiable data feeds and disclosed methodology. Click any
          source below to view the original record. Modeled estimates are clearly labeled.
        </p>
      </div>

      {/* Platform sources */}
      <section className="mb-16">
        <div className="flex items-end justify-between mb-5">
          <h2 className="font-display text-2xl font-bold tracking-tight">Data feeds &amp; methodology</h2>
          <span className="text-[11px] text-[color:var(--muted-2)]">9 feeds · Last refreshed daily</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PLATFORM_SOURCES.map((s) => (
            <a
              key={s.url}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="surface-raised p-5 group flex flex-col"
            >
              <div className="flex items-start gap-3 mb-3">
                <span className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--accent-tint)", color: "var(--accent-lo)" }}>
                  {iconForCategory(s.category)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-[color:var(--ink)] leading-snug group-hover:text-[color:var(--accent)]">
                    {s.label}
                  </p>
                  <span className={`pill ${CATEGORY_PILL[s.category]} mt-1`}>
                    {CATEGORY_LABELS[s.category]}
                  </span>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-[color:var(--muted-2)] shrink-0 group-hover:text-[color:var(--accent)]" />
              </div>
              <p className="text-[12px] text-[color:var(--ink-2)] leading-relaxed">{s.verifies}</p>
            </a>
          ))}
        </div>
      </section>

      {/* ETF sources */}
      <section className="mb-16">
        <h2 className="font-display text-2xl font-bold tracking-tight mb-2">Per-ETF sources</h2>
        <p className="text-[14px] text-[color:var(--muted)] mb-6">
          Every value on each ETF&apos;s detail page is verified against the sources below.
          Cross-referenced for expense ratio, AUM, structure, and tax form.
        </p>
        <div className="space-y-5">
          {Object.values(ETF_LIBRARY).map((etf) => (
            <div key={etf.ticker} className="surface p-6">
              <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <div className="flex items-baseline gap-3">
                  <span className="ticker text-[20px] font-bold text-[color:var(--ink)]">
                    {etf.ticker}
                  </span>
                  <span className="text-[14px] text-[color:var(--ink-2)] font-semibold">
                    {etf.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[color:var(--muted)]">
                  <span>Last verified</span>
                  <span className="font-mono font-semibold text-[color:var(--ink-2)]">
                    {etf.last_verified}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {etf.sources.map((s) => (
                  <a
                    key={s.url}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 p-3 rounded-lg border border-[color:var(--line)] hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-tint)] transition-colors group"
                  >
                    <span className={`pill ${CATEGORY_PILL[s.category]} shrink-0 mt-0.5`}>
                      {s.category}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-[color:var(--ink)] group-hover:text-[color:var(--accent)] truncate">
                        {s.label}
                      </p>
                      <p className="text-[11px] text-[color:var(--muted)] leading-relaxed mt-0.5 line-clamp-2">
                        {s.verifies}
                      </p>
                    </div>
                    <ExternalLink className="h-3 w-3 text-[color:var(--muted-2)] shrink-0 mt-1" />
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Methodology */}
      <section className="mb-16">
        <h2 className="font-display text-2xl font-bold tracking-tight mb-6">Methodology</h2>
        <div className="space-y-5">
          <MethodologyCard
            icon={<Activity className="h-4 w-4" />}
            title="Live underlying prices"
            label="Live data"
            labelClass="pill-positive"
          >
            ETF spot prices, options chains (bid / ask / mid / volume / open interest / implied
            volatility) pulled from Yahoo Finance via the <code className="text-num">yahoo-finance2</code>
            {" "}package. Server-side cache: 5 minutes for quotes, 1 hour for chains. Quote
            timestamps shown on every page that displays prices. <strong>Up to 15-minute
            delay</strong>; real-time feeds require an exchange data agreement.
          </MethodologyCard>

          <MethodologyCard
            icon={<Database className="h-4 w-4" />}
            title="Fuel prices"
            label="Government data"
            labelClass="pill-positive"
          >
            Retail gasoline and diesel prices sourced weekly from the U.S. Energy Information
            Administration (EIA) Petroleum Status Report. PADD region breakdowns mirror EIA
            classifications. All EIA series are publicly available without a data agreement.
          </MethodologyCard>

          <MethodologyCard
            icon={<GraduationCap className="h-4 w-4" />}
            title="Option pricing"
            label="Black-Scholes model"
            labelClass="pill-teal"
          >
            Theoretical option values and Greeks (Δ, Γ, Θ, vega) computed using the Black-Scholes
            model (Black &amp; Scholes, 1973). Risk-free rate set to the current 3-month T-bill
            (FRED series TB3MS, 4.5% default). Implied volatility pulled from live Yahoo options
            chain when available; otherwise per-ticker default (UGA 35%, USO 32%, BNO 31%, UNL
            42%). <strong>Modeled values may differ from actual market bid/ask</strong> — always
            verify in the client&apos;s brokerage before executing.
          </MethodologyCard>

          <MethodologyCard
            icon={<Building2 className="h-4 w-4" />}
            title="ETF reference data"
            label="Issuer prospectus"
            labelClass="pill-accent"
          >
            Expense ratios, AUM, inception, structure, and tax form sourced from each fund&apos;s
            issuer (USCF Investments) prospectus and fact sheet. Cross-verified against ETF.com,
            AAII, Morningstar, and Yahoo Finance. Each ETF detail page shows its{" "}
            <span className="font-mono font-semibold text-[color:var(--accent-lo)]">
              last_verified
            </span>{" "}
            date. Discrepancies between vendors are noted in the per-ETF source list above.
          </MethodologyCard>

          <MethodologyCard
            icon={<Sparkles className="h-4 w-4" />}
            title="Modeled estimates (clearly labeled)"
            label="Estimate"
            labelClass="pill-warning"
          >
            The following data points are <strong>modeled estimates</strong>, not direct
            measurements:
            <ul className="list-disc pl-5 mt-2 space-y-1 text-[13px]">
              <li>
                <strong>Correlation to retail fuel:</strong> 24-month rolling correlation between
                ETF returns and EIA retail prices. Subject to backtest assumptions.
              </li>
              <li>
                <strong>Weekly contango decay:</strong> first-order estimate based on the slope of
                the futures curve and historical roll cost. Actual decay varies with curve shape.
              </li>
              <li>
                <strong>Default implied volatility:</strong> per-ticker estimate used only when the
                live Yahoo chain is unavailable. Live IV is used when accessible.
              </li>
              <li>
                <strong>Theoretical option pricing:</strong> Black-Scholes values, not bid/ask
                quotes. The platform does NOT represent these as executable prices.
              </li>
            </ul>
          </MethodologyCard>

          <MethodologyCard
            icon={<ShieldCheck className="h-4 w-4" />}
            title="Regulatory scope"
            label="Series 65/66"
            labelClass="pill-accent"
          >
            All recommendations on this platform fall within the adviser&apos;s Series 65/66
            registration as an Investment Adviser Representative. Recommended securities are
            limited to registered investment products (ETFs) and listed equity options on those
            ETFs. The platform does NOT offer commodity futures, swaps, or options on futures
            (Series 3 products). Form ADV Part 2A discloses fee schedule and conflicts.
          </MethodologyCard>
        </div>
      </section>

      {/* Versioning */}
      <section className="surface p-6" style={{ background: "var(--bg)" }}>
        <h2 className="h-section mb-3 flex items-center gap-1.5">
          <BookOpen className="h-3.5 w-3.5" /> Versioning &amp; refresh cadence
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[13px]">
          <div>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-[color:var(--muted)]">
              Live data
            </p>
            <p className="text-[color:var(--ink)] mt-1 leading-relaxed">
              Yahoo Finance quotes refresh every 5 minutes; chains refresh hourly. The page
              timestamp reflects the most recent server fetch.
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-[color:var(--muted)]">
              Reference data
            </p>
            <p className="text-[color:var(--ink)] mt-1 leading-relaxed">
              ETF metadata (expense, AUM, structure) verified against issuer fact sheets on each
              build. Per-ETF&nbsp;<code className="text-num">last_verified</code>&nbsp;dates shown.
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-[color:var(--muted)]">
              Model parameters
            </p>
            <p className="text-[color:var(--ink)] mt-1 leading-relaxed">
              Black-Scholes risk-free rate updated when the T-bill rate moves more than 25bps.
              Default IV reviewed quarterly against historical realized volatility.
            </p>
          </div>
        </div>
      </section>

      <p className="text-center text-[12px] text-[color:var(--muted-2)] mt-10 mb-4">
        Questions about a specific number? <Link href="/settings" className="font-semibold" style={{ color: "var(--accent)" }}>Contact</Link>.
      </p>
    </div>
  );
}

function MethodologyCard({
  icon,
  title,
  label,
  labelClass,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  label: string;
  labelClass: string;
  children: React.ReactNode;
}) {
  return (
    <div className="surface p-6">
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="flex items-center gap-3">
          <span
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "var(--accent-tint)", color: "var(--accent-lo)" }}
          >
            {icon}
          </span>
          <h3 className="font-display text-[17px] font-bold tracking-tight text-[color:var(--ink)]">
            {title}
          </h3>
        </div>
        <span className={`pill ${labelClass}`}>{label}</span>
      </div>
      <div className="text-[13px] text-[color:var(--ink-2)] leading-relaxed">{children}</div>
    </div>
  );
}

function iconForCategory(c: DataSourceCategory) {
  const cls = "h-4 w-4";
  if (c === "issuer") return <Building2 className={cls} />;
  if (c === "exchange") return <Activity className={cls} />;
  if (c === "regulator") return <ShieldCheck className={cls} />;
  if (c === "academic") return <GraduationCap className={cls} />;
  return <Database className={cls} />;
}
