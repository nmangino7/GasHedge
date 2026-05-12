"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  PlusCircle,
  AlertTriangle,
  Clock,
  X,
  Building2,
  TrendingUp,
} from "lucide-react";
import { positionsApi, dealsApi, companiesApi } from "@/lib/api";
import type { LiveTrackerResponse, LivePositionRow } from "@/lib/api";
import OptionsChainPicker, { type PickedContract } from "@/components/OptionsChainPicker";

type FilterTicker = string | "ALL";

export default function TrackerPage() {
  const [data, setData] = useState<LiveTrackerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterTicker, setFilterTicker] = useState<FilterTicker>("ALL");
  const [filterSide, setFilterSide] = useState<"ALL" | "long" | "short">("ALL");
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    setError(null);
    try {
      const result = await positionsApi.live();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.positions.filter((p) => {
      if (filterTicker !== "ALL" && p.ticker !== filterTicker) return false;
      if (filterSide !== "ALL" && p.side !== filterSide) return false;
      return true;
    });
  }, [data, filterTicker, filterSide]);

  const aggregate = data?.aggregate;

  return (
    <div>
      {/* === Header === */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-7">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="pill pill-live">Live</span>
            <span className="h-section">Position Tracker</span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Open Hedge Positions</h1>
          <p className="text-sm text-[color:var(--muted)] mt-1.5 max-w-xl">
            Real-time ETF quotes via Yahoo Finance. Option values computed Black-Scholes with implied vol per ticker.
            Updates on refresh — server-side cached 5 min for quotes, 1 hr for chains.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load()} disabled={refreshing} className="btn btn-ghost">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button onClick={() => setAddOpen(true)} className="btn btn-accent">
            <PlusCircle className="h-4 w-4" />
            Open Position
          </button>
        </div>
      </div>

      {error && (
        <div
          className="surface p-4 mb-5 flex items-start gap-3"
          style={{ borderColor: "var(--negative-tint)", background: "var(--negative-tint)" }}
        >
          <AlertTriangle className="h-5 w-5 mt-0.5" style={{ color: "var(--negative)" }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--negative)" }}>Failed to load tracker</p>
            <p className="text-xs text-[color:var(--muted)] mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {data?.quotes_error && (
        <div
          className="surface p-3 mb-5 flex items-center gap-3"
          style={{ borderColor: "var(--warning-tint)", background: "var(--warning-tint)" }}
        >
          <AlertTriangle className="h-4 w-4" style={{ color: "var(--warning)" }} />
          <p className="text-xs" style={{ color: "var(--warning)" }}>
            Live quote source returned an error — showing positions valued at entry prices.{" "}
            <span className="text-[color:var(--muted)]">{data.quotes_error}</span>
          </p>
        </div>
      )}

      {/* === Aggregate KPIs === */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-7">
        <div className="kpi kpi-accent">
          <div className="kpi-label">Open Positions</div>
          <div className="kpi-value">{aggregate?.open_count ?? 0}</div>
          <div className="kpi-sub">{aggregate?.tickers.length ?? 0} tickers tracked</div>
        </div>
        <div className="kpi kpi-ink">
          <div className="kpi-label">Net Capital</div>
          <div className="kpi-value">
            ${Math.abs(aggregate?.total_entry_cost ?? 0).toLocaleString()}
          </div>
          <div className="kpi-sub">
            {(aggregate?.total_entry_cost ?? 0) >= 0 ? "Debit at entry" : "Credit collected"}
          </div>
        </div>
        <div className="kpi kpi-teal">
          <div className="kpi-label">Current Value</div>
          <div className="kpi-value">
            ${Math.abs(aggregate?.total_current_value ?? 0).toLocaleString()}
          </div>
          <div className="kpi-sub">Mark-to-model · BS</div>
        </div>
        <div className="kpi" style={{ borderTop: `3px solid ${(aggregate?.total_unrealized_pnl ?? 0) >= 0 ? "var(--positive)" : "var(--negative)"}` }}>
          <div className="kpi-label">Unrealized P&L</div>
          <div
            className="kpi-value"
            style={{ color: (aggregate?.total_unrealized_pnl ?? 0) >= 0 ? "var(--positive)" : "var(--negative)" }}
          >
            {(aggregate?.total_unrealized_pnl ?? 0) >= 0 ? "+" : "-"}$
            {Math.abs(aggregate?.total_unrealized_pnl ?? 0).toLocaleString()}
          </div>
          <div className="kpi-sub">
            {(aggregate?.total_unrealized_pnl_pct ?? 0) >= 0 ? "+" : ""}
            {(aggregate?.total_unrealized_pnl_pct ?? 0).toFixed(2)}% vs entry cost
          </div>
        </div>
      </div>

      {/* === Ticker chips & live quotes === */}
      {data && Object.keys(data.quotes).length > 0 && (
        <div className="surface p-4 mb-7">
          <div className="flex flex-wrap items-center gap-3">
            <span className="h-section">Underlyings</span>
            {Object.entries(data.quotes).map(([sym, q]) => (
              <div key={sym} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[color:var(--bg)] border border-[color:var(--line)]">
                <span className="ticker text-[12px] font-bold">{sym}</span>
                <span className="text-num text-[13px]">${q.price.toFixed(2)}</span>
                <span
                  className="text-num text-[11px] font-semibold"
                  style={{ color: q.changePct >= 0 ? "var(--positive)" : "var(--negative)" }}
                >
                  {q.changePct >= 0 ? "+" : ""}{q.changePct.toFixed(2)}%
                </span>
              </div>
            ))}
            <span className="text-[11px] text-[color:var(--muted-2)] ml-auto">
              <Clock className="h-3 w-3 inline mr-1" />
              As of {data?.as_of ? new Date(data.as_of).toLocaleTimeString() : "—"}
            </span>
          </div>
        </div>
      )}

      {/* === Filters === */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[11px] font-semibold text-[color:var(--muted)] uppercase tracking-wider">Filter</span>
        <FilterChip active={filterTicker === "ALL"} onClick={() => setFilterTicker("ALL")}>All Tickers</FilterChip>
        {aggregate?.tickers.map((t) => (
          <FilterChip key={t} active={filterTicker === t} onClick={() => setFilterTicker(t)}>
            {t}
          </FilterChip>
        ))}
        <span className="w-px h-5 bg-[color:var(--line)] mx-1" />
        <FilterChip active={filterSide === "ALL"} onClick={() => setFilterSide("ALL")}>All Sides</FilterChip>
        <FilterChip active={filterSide === "long"} onClick={() => setFilterSide("long")}>Long</FilterChip>
        <FilterChip active={filterSide === "short"} onClick={() => setFilterSide("short")}>Short</FilterChip>
      </div>

      {/* === Positions table === */}
      <div className="surface" style={{ padding: 0, overflow: "hidden" }}>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Client / Strategy</th>
                <th>Contract</th>
                <th className="right">Strike / Spot</th>
                <th className="right">Contracts</th>
                <th className="right">Entry</th>
                <th className="right">Current</th>
                <th className="right">P&L</th>
                <th className="right">Δ</th>
                <th className="right">DTE</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-[color:var(--muted)]">
                    Loading positions...
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center">
                    <Activity className="h-7 w-7 mx-auto text-[color:var(--muted-2)] mb-2" />
                    <p className="text-sm font-semibold">No positions match this filter</p>
                    <p className="text-[12px] text-[color:var(--muted)] mt-1">
                      Open a position from a client's strategy comparison, or use the button above.
                    </p>
                  </td>
                </tr>
              )}
              {filtered.map((p) => (
                <PositionRow key={p.id} position={p} onChange={() => load(true)} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* === Compliance footer === */}
      <div className="mt-6 p-4 rounded-xl bg-[color:var(--bg)] border border-[color:var(--line)]">
        <p className="text-[11px] text-[color:var(--muted)] leading-relaxed">
          <strong className="text-[color:var(--ink-2)]">Modeled values.</strong> Live underlying prices via Yahoo Finance.
          Option values priced theoretically using Black-Scholes with assumed IV (UGA 35%, USO 32%, BNO 31%). Real-world
          bid/ask spreads may differ. Client positions executed via client's own brokerage or a managed account where the
          adviser holds appropriate authorization. Series 65/66 advisory — no commission collected on options trades.
        </p>
      </div>

      {addOpen && <AddPositionModal onClose={() => setAddOpen(false)} onCreated={() => load(true)} />}
    </div>
  );
}

function FilterChip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-[12px] font-semibold px-2.5 py-1 rounded-md transition-colors"
      style={{
        background: active ? "var(--ink)" : "transparent",
        color: active ? "#fff" : "var(--ink-2)",
        border: `1px solid ${active ? "var(--ink)" : "var(--line)"}`,
      }}
    >
      {children}
    </button>
  );
}

function PositionRow({
  position: p,
  onChange,
}: {
  position: LivePositionRow;
  onChange: () => void;
}) {
  const [closing, setClosing] = useState(false);

  async function handleClose() {
    if (!confirm(`Close ${p.contracts}x ${p.ticker} ${p.side} ${p.option_type} @ $${p.strike}?`)) return;
    setClosing(true);
    try {
      await positionsApi.close(p.id, {
        exit_premium_per_share: p.live.current_option_price_per_share,
        exit_underlying_price: p.live.current_underlying_price,
      });
      onChange();
    } catch (err) {
      alert(`Close failed: ${err instanceof Error ? err.message : err}`);
    } finally {
      setClosing(false);
    }
  }

  const pnlUp = p.live.unrealized_pnl >= 0;
  const sidePill = p.side === "long" ? "pill-positive" : "pill-warning";
  const typeLabel = `${p.option_type.toUpperCase()}`;

  return (
    <tr>
      <td>
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] font-semibold truncate" style={{ maxWidth: 200 }} title={p.company_name}>
            <Building2 className="h-3 w-3 inline mr-1 text-[color:var(--muted-2)]" />
            {p.company_name}
          </span>
          <span className="text-[11px] text-[color:var(--muted)] capitalize">
            {p.strategy_key.replace(/_/g, " ")}
          </span>
        </div>
      </td>
      <td>
        <div className="flex items-center gap-2">
          <span className="ticker text-[13px] font-bold">{p.ticker}</span>
          <span className={`pill ${sidePill}`}>{p.side === "long" ? "LONG" : "SHORT"}</span>
          <span className="pill pill-outline">{typeLabel}</span>
        </div>
        <p className="text-[10px] text-[color:var(--muted-2)] mt-0.5">Expires {p.expiry}</p>
      </td>
      <td className="right num">
        <div>${p.strike.toFixed(2)}</div>
        <div className="text-[10px] text-[color:var(--muted)]">spot ${p.live.current_underlying_price.toFixed(2)}</div>
      </td>
      <td className="right num">{p.contracts}</td>
      <td className="right num">
        <div>${p.entry_premium_per_share.toFixed(2)}</div>
        <div className="text-[10px] text-[color:var(--muted)]">@${p.entry_underlying_price.toFixed(2)}</div>
      </td>
      <td className="right num">
        <div className="font-semibold">${p.live.current_option_price_per_share.toFixed(2)}</div>
        <div className="text-[10px] text-[color:var(--muted)]">
          intr ${p.live.intrinsic_value_per_share.toFixed(2)}
        </div>
      </td>
      <td className="right num" style={{ color: pnlUp ? "var(--positive)" : "var(--negative)" }}>
        <div className="font-semibold flex items-center justify-end gap-1">
          {pnlUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {pnlUp ? "+" : ""}${Math.abs(p.live.unrealized_pnl).toLocaleString()}
        </div>
        <div className="text-[10px]">
          {pnlUp ? "+" : ""}{p.live.unrealized_pnl_pct.toFixed(1)}%
        </div>
      </td>
      <td className="right num text-[12px]">
        {p.live.delta.toFixed(0)}
      </td>
      <td className="right num">
        <span
          className="pill"
          style={{
            background:
              p.live.days_to_expiry < 14
                ? "var(--negative-tint)"
                : p.live.days_to_expiry < 30
                ? "var(--warning-tint)"
                : "var(--positive-tint)",
            color:
              p.live.days_to_expiry < 14
                ? "var(--negative)"
                : p.live.days_to_expiry < 30
                ? "var(--warning)"
                : "var(--positive)",
          }}
        >
          {p.live.days_to_expiry}d
        </span>
      </td>
      <td className="right">
        <button onClick={handleClose} disabled={closing} className="btn btn-ghost btn-sm">
          {closing ? "..." : "Close"}
        </button>
      </td>
    </tr>
  );
}

function AddPositionModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [deals, setDeals] = useState<{ id: number; company_id: number }[]>([]);
  const [companies, setCompanies] = useState<{ id: number; name: string }[]>([]);
  const [form, setForm] = useState({
    deal_id: 0,
    strategy_key: "long_call",
    ticker: "USO",
    option_type: "call" as "call" | "put",
    side: "long" as "long" | "short",
    strike: 72,
    expiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    contracts: 10,
    entry_premium_per_share: 3.0,
    entry_underlying_price: 72,
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([dealsApi.list(), companiesApi.list()])
      .then(([d, c]) => {
        setDeals(d);
        setCompanies(c as { id: number; name: string }[]);
        if (d.length > 0 && !form.deal_id) {
          setForm((f) => ({ ...f, deal_id: d[0].id }));
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.deal_id) {
      setErr("Pick a deal first");
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      await positionsApi.create(form);
      onCreated();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  const companyName = (dealId: number) => {
    const d = deals.find((x) => x.id === dealId);
    const c = d ? companies.find((x) => x.id === d.company_id) : null;
    return c?.name ?? `Deal #${dealId}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ background: "rgba(11, 18, 32, 0.55)" }}
      onClick={onClose}
    >
      <div
        className="surface w-full max-w-2xl max-h-[90vh] overflow-y-auto p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight">Open New Position</h2>
            <p className="text-xs text-[color:var(--muted)] mt-1">
              Record an option position your client has executed — or is about to execute.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[color:var(--bg)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="grid grid-cols-2 gap-4">
          <Field label="Deal / Client" span={2}>
            <select
              className="select"
              value={form.deal_id || ""}
              onChange={(e) => setForm({ ...form, deal_id: Number(e.target.value) })}
              required
            >
              <option value="">— pick a deal —</option>
              {deals.map((d) => (
                <option key={d.id} value={d.id}>
                  {companyName(d.id)} (deal #{d.id})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Strategy">
            <select
              className="select"
              value={form.strategy_key}
              onChange={(e) => setForm({ ...form, strategy_key: e.target.value })}
            >
              <option value="long_call">Long Call</option>
              <option value="long_put">Long Put</option>
              <option value="covered_call">Covered Call</option>
              <option value="short_put">Cash-Secured Short Put</option>
              <option value="collar">Collar (one leg per row)</option>
              <option value="manual">Manual / Other</option>
            </select>
          </Field>
          <Field label="Ticker">
            <select
              className="select"
              value={form.ticker}
              onChange={(e) => setForm({ ...form, ticker: e.target.value })}
            >
              <option value="UGA">UGA · Gasoline</option>
              <option value="USO">USO · Crude</option>
              <option value="BNO">BNO · Brent</option>
              <option value="UNL">UNL · Natural Gas</option>
            </select>
          </Field>
          <Field label="Option Type">
            <select
              className="select"
              value={form.option_type}
              onChange={(e) => setForm({ ...form, option_type: e.target.value as "call" | "put" })}
            >
              <option value="call">Call</option>
              <option value="put">Put</option>
            </select>
          </Field>
          <Field label="Side">
            <select
              className="select"
              value={form.side}
              onChange={(e) => setForm({ ...form, side: e.target.value as "long" | "short" })}
            >
              <option value="long">Long (Buyer)</option>
              <option value="short">Short (Seller)</option>
            </select>
          </Field>
          <div className="col-span-2">
            <OptionsChainPicker
              ticker={form.ticker}
              optionType={form.option_type}
              preferredDays={90}
              onPick={(c) => {
                if (!c) return;
                setForm((f) => ({
                  ...f,
                  strike: c.strike,
                  expiry: c.expiry,
                  entry_premium_per_share: c.premium || f.entry_premium_per_share,
                  entry_underlying_price: c.underlyingPrice || f.entry_underlying_price,
                }));
              }}
            />
          </div>
          <Field label="Contracts">
            <input
              className="input"
              type="number"
              min={1}
              value={form.contracts}
              onChange={(e) => setForm({ ...form, contracts: Number(e.target.value) })}
              required
            />
          </Field>
          <Field label="Entry Premium / share (override)">
            <input
              className="input"
              type="number"
              step="0.01"
              value={form.entry_premium_per_share}
              onChange={(e) => setForm({ ...form, entry_premium_per_share: Number(e.target.value) })}
              required
            />
          </Field>
          <Field label="Notes" span={2}>
            <textarea
              className="textarea"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Trade rationale, fill price, broker, anything to remember"
            />
          </Field>
          {err && (
            <div className="col-span-2 pill pill-negative">
              <AlertTriangle className="h-3 w-3" />
              {err}
            </div>
          )}
          <div className="col-span-2 flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
            <button type="submit" disabled={submitting} className="btn btn-accent">
              {submitting ? "Saving..." : <><TrendingUp className="h-4 w-4" /> Track Position</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  span = 1,
}: {
  label: string;
  children: React.ReactNode;
  span?: 1 | 2;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${span === 2 ? "col-span-2" : ""}`}>
      <span className="text-[11px] font-semibold text-[color:var(--muted)] uppercase tracking-wider">{label}</span>
      {children}
    </label>
  );
}
