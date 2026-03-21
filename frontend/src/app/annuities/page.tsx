"use client";
import { useState } from "react";
import { Shield, BookOpen, AlertTriangle, DollarSign, Clock, ArrowRight } from "lucide-react";
import ComplianceDisclaimer from "@/components/ComplianceDisclaimer";
import Link from "next/link";

const SURRENDER_SCHEDULES = {
  variable: [
    { year: 1, charge_pct: 7 },
    { year: 2, charge_pct: 6 },
    { year: 3, charge_pct: 5 },
    { year: 4, charge_pct: 4 },
    { year: 5, charge_pct: 3 },
    { year: 6, charge_pct: 2 },
    { year: 7, charge_pct: 1 },
    { year: 8, charge_pct: 0 },
  ],
  fixed: [
    { year: 1, charge_pct: 8 },
    { year: 2, charge_pct: 7 },
    { year: 3, charge_pct: 6 },
    { year: 4, charge_pct: 5 },
    { year: 5, charge_pct: 4 },
    { year: 6, charge_pct: 3 },
    { year: 7, charge_pct: 2 },
    { year: 8, charge_pct: 1 },
    { year: 9, charge_pct: 0 },
  ],
};

export default function AnnuitiesPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "how_it_works" | "withdrawal" | "comparison">("overview");
  const [showVariableSchedule, setShowVariableSchedule] = useState(false);
  const [showFixedSchedule, setShowFixedSchedule] = useState(false);

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Annuity Hedging</h1>
          <p className="text-sm text-gray-500 mt-1">Tax-deferred fuel cost protection using annuity products</p>
        </div>
      </div>

      {/* 59½ Rule Warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-amber-900">Important: Age 59½ Rule</h4>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              Annuity withdrawals before age 59½ incur a <strong>10% IRS early withdrawal penalty</strong> on gains.
              However, you <strong>can still access your money</strong> — see the Withdrawal tab for all options including
              72(t)/SEPP payments that avoid the penalty at any age.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6">
        {[
          { key: "overview" as const, label: "Overview", icon: Shield },
          { key: "how_it_works" as const, label: "How It Works", icon: BookOpen },
          { key: "withdrawal" as const, label: "Withdrawals & 59½", icon: DollarSign },
          { key: "comparison" as const, label: "ETF vs Annuity", icon: ArrowRight },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-md text-xs font-medium transition-all ${
              activeTab === tab.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Variable Annuity */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">Variable Annuity</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-600">Low Liquidity</span>
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Commodity Sub-Accounts</h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-4">
                Invest in commodity-linked sub-accounts (energy/oil funds) within a tax-deferred annuity wrapper.
                Value fluctuates with fuel markets, providing a direct hedge. Higher fees but more upside potential.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Annual Fees</span>
                  <span className="text-gray-900 font-medium">~2.1%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 flex items-center gap-1"><Clock className="h-3 w-3" /> Surrender Period</span>
                  <span className="text-gray-900 font-medium">7 years</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Free Withdrawal</span>
                  <span className="text-gray-900 font-medium">10%/year</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">IRS Penalty (under 59½)</span>
                  <span className="text-red-600 font-medium">10% on gains</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Tax Deferred</span>
                  <span className="text-green-600 font-medium">Yes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Principal Protection</span>
                  <span className="text-red-600 font-medium">No</span>
                </div>
              </div>
              <button
                onClick={() => setShowVariableSchedule(!showVariableSchedule)}
                className="mt-3 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                {showVariableSchedule ? "Hide" : "Show"} Surrender Schedule
              </button>
              {showVariableSchedule && (
                <div className="mt-2 bg-gray-50 rounded-md p-3">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-1 text-gray-500 font-medium">Year</th>
                        <th className="text-right py-1 text-gray-500 font-medium">Surrender Charge</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SURRENDER_SCHEDULES.variable.map((s) => (
                        <tr key={s.year} className="border-b border-gray-100">
                          <td className="py-1 text-gray-700">Year {s.year}</td>
                          <td className="py-1 text-right text-gray-700">{s.charge_pct}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Fixed Indexed Annuity */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">Fixed Indexed</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-600">Low Liquidity</span>
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Commodity Index</h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-4">
                Returns tied to a commodity price index with principal protection. Floor of 0% return (won&apos;t lose principal)
                with a cap on upside. Lower fees, but gains are capped and may not fully track fuel prices.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Annual Fees</span>
                  <span className="text-gray-900 font-medium">~1.5%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 flex items-center gap-1"><Clock className="h-3 w-3" /> Surrender Period</span>
                  <span className="text-gray-900 font-medium">8 years</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Free Withdrawal</span>
                  <span className="text-gray-900 font-medium">10%/year</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">IRS Penalty (under 59½)</span>
                  <span className="text-red-600 font-medium">10% on gains</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Tax Deferred</span>
                  <span className="text-green-600 font-medium">Yes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Principal Protection</span>
                  <span className="text-green-600 font-medium">Yes (0% floor)</span>
                </div>
              </div>
              <button
                onClick={() => setShowFixedSchedule(!showFixedSchedule)}
                className="mt-3 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                {showFixedSchedule ? "Hide" : "Show"} Surrender Schedule
              </button>
              {showFixedSchedule && (
                <div className="mt-2 bg-gray-50 rounded-md p-3">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-1 text-gray-500 font-medium">Year</th>
                        <th className="text-right py-1 text-gray-500 font-medium">Surrender Charge</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SURRENDER_SCHEDULES.fixed.map((s) => (
                        <tr key={s.year} className="border-b border-gray-100">
                          <td className="py-1 text-gray-700">Year {s.year}</td>
                          <td className="py-1 text-right text-gray-700">{s.charge_pct}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <p className="text-sm text-indigo-800">
              <strong>Want company-specific annuity estimates?</strong> Go to{" "}
              <Link href="/companies" className="underline font-medium">Companies</Link>,
              select a company, then click &quot;View Hedging&quot; to see annuity options tailored to their fuel usage and costs.
            </p>
          </div>
        </div>
      )}

      {/* Tab: How It Works */}
      {activeTab === "how_it_works" && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-indigo-600" /> How Annuities Work for Fuel Hedging
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              An annuity is an insurance contract where you make a lump-sum payment (premium) to an insurance company.
              For fuel hedging, you choose annuity products with <strong>commodity or energy sub-accounts</strong> so your
              investment value moves with fuel prices — when fuel costs rise, your annuity value rises too, offsetting
              higher operating costs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-indigo-50 rounded-lg p-4">
              <div className="text-indigo-700 font-semibold text-xs uppercase tracking-wide mb-2">Step 1</div>
              <h4 className="text-sm font-medium text-gray-900 mb-1">Fund the Annuity</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Pay a premium based on the portion of fuel costs you want to hedge. For example, to hedge 50% of a
                $200,000 annual fuel bill, you&apos;d invest ~$100,000 into the annuity.
              </p>
            </div>
            <div className="bg-indigo-50 rounded-lg p-4">
              <div className="text-indigo-700 font-semibold text-xs uppercase tracking-wide mb-2">Step 2</div>
              <h4 className="text-sm font-medium text-gray-900 mb-1">Choose Sub-Accounts</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Select energy/commodity sub-accounts (Variable Annuity) or a commodity-linked index (Fixed Indexed Annuity).
                Your money grows tax-deferred tied to fuel market performance.
              </p>
            </div>
            <div className="bg-indigo-50 rounded-lg p-4">
              <div className="text-indigo-700 font-semibold text-xs uppercase tracking-wide mb-2">Step 3</div>
              <h4 className="text-sm font-medium text-gray-900 mb-1">Withdraw When Needed</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                When fuel prices spike, withdraw funds to cover increased costs. Use the 10% free withdrawal annually,
                or set up 72(t) payments. The gains offset your higher fuel bills.
              </p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Two Types of Annuities</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700">Variable</span>
                  <span className="text-sm font-medium text-gray-900">Variable Annuity</span>
                </div>
                <ul className="space-y-1.5 text-xs text-gray-600">
                  <li className="flex gap-1.5"><span className="text-green-500 shrink-0">+</span> Invests directly in commodity sub-accounts</li>
                  <li className="flex gap-1.5"><span className="text-green-500 shrink-0">+</span> Value moves with energy markets — strong hedge</li>
                  <li className="flex gap-1.5"><span className="text-green-500 shrink-0">+</span> Tax-deferred growth</li>
                  <li className="flex gap-1.5"><span className="text-red-500 shrink-0">-</span> Higher fees (~2.1% annually)</li>
                  <li className="flex gap-1.5"><span className="text-red-500 shrink-0">-</span> No principal protection — value can drop</li>
                  <li className="flex gap-1.5"><span className="text-red-500 shrink-0">-</span> 7-year surrender period</li>
                </ul>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700">Fixed Indexed</span>
                  <span className="text-sm font-medium text-gray-900">Fixed Indexed Annuity</span>
                </div>
                <ul className="space-y-1.5 text-xs text-gray-600">
                  <li className="flex gap-1.5"><span className="text-green-500 shrink-0">+</span> Principal protection — can&apos;t lose your initial investment</li>
                  <li className="flex gap-1.5"><span className="text-green-500 shrink-0">+</span> Returns linked to commodity index (floor of 0%)</li>
                  <li className="flex gap-1.5"><span className="text-green-500 shrink-0">+</span> Lower fees (~1.5%)</li>
                  <li className="flex gap-1.5"><span className="text-red-500 shrink-0">-</span> Gains are capped — may not fully track fuel spikes</li>
                  <li className="flex gap-1.5"><span className="text-red-500 shrink-0">-</span> Weaker correlation to actual fuel prices</li>
                  <li className="flex gap-1.5"><span className="text-red-500 shrink-0">-</span> 8-year surrender period</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">When to Consider Annuities vs ETFs</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="bg-green-50 rounded-lg p-3">
                <h5 className="font-semibold text-green-800 mb-1">Annuities Make Sense When:</h5>
                <ul className="space-y-1 text-green-700">
                  <li>• Business owner is over 59½ (no IRS penalty)</li>
                  <li>• Long-term hedging horizon (5+ years)</li>
                  <li>• Tax deferral is valuable (high tax bracket)</li>
                  <li>• Principal protection is important (FIA)</li>
                  <li>• Don&apos;t need to access all funds quickly</li>
                </ul>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <h5 className="font-semibold text-blue-800 mb-1">ETFs Make Sense When:</h5>
                <ul className="space-y-1 text-blue-700">
                  <li>• Need full liquidity — sell anytime</li>
                  <li>• Business owner is under 59½</li>
                  <li>• Want lower fees (0.8-1.0% vs 1.5-2.1%)</li>
                  <li>• Short-term hedging (under 5 years)</li>
                  <li>• Want strongest fuel price correlation</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Withdrawals & 59½ */}
      {activeTab === "withdrawal" && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Accessing Your Money (Even Under 59½)</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              A common concern: <strong>&quot;Am I locked in? What if I need the money before 59½?&quot;</strong> The answer is
              <strong> no, you are not locked in</strong>. There are multiple ways to access your funds at any age. Here are all your options:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                <h4 className="text-sm font-semibold text-gray-900">Free Withdrawal (10%/year)</h4>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Most annuity contracts allow you to withdraw up to <strong>10% of the account value each year</strong> without the
                insurer charging a surrender fee. If you&apos;re under 59½, the IRS 10% penalty still applies to gains,
                but you won&apos;t owe surrender charges to the insurance company.
              </p>
              <div className="mt-2 bg-gray-50 rounded p-2 text-[11px] text-gray-500">
                <strong>Example:</strong> $100,000 annuity = $10,000/year free withdrawal. If $3,000 is gains, IRS penalty = $300 (under 59½).
              </div>
            </div>

            <div className="border border-green-200 bg-green-50/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                <h4 className="text-sm font-semibold text-gray-900">72(t) / SEPP — No IRS Penalty at Any Age</h4>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                IRS Rule 72(t) lets you take <strong>Substantially Equal Periodic Payments (SEPP)</strong> from your annuity at
                <strong> any age without the 10% penalty</strong>. Payments must continue for 5 years or until
                you reach 59½ (whichever is longer).
              </p>
              <div className="mt-2 bg-white rounded p-2 text-[11px] text-green-700 border border-green-200">
                <strong>Best option for business owners under 59½</strong> who need regular withdrawals. No IRS penalty. No surrender charges after the free withdrawal amount.
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                <h4 className="text-sm font-semibold text-gray-900">Full Surrender</h4>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                You can <strong>cash out entirely at any time</strong>. You&apos;ll pay the surrender charge for the current year
                (e.g., 7% in year 1, declining over time) plus the 10% IRS penalty on any gains if under 59½.
                After the surrender period ends, no surrender charges apply.
              </p>
              <div className="mt-2 bg-gray-50 rounded p-2 text-[11px] text-gray-500">
                <strong>Example:</strong> $100K annuity, year 2, $8K gains. Surrender charge: 6% of $100K = $6,000. IRS penalty (under 59½): 10% of $8K = $800. Total cost: $6,800.
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                <h4 className="text-sm font-semibold text-gray-900">1035 Tax-Free Exchange</h4>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Transfer your annuity to a <strong>different insurance company&apos;s product without triggering any taxes</strong>.
                Useful if you find a better annuity with lower fees, better sub-accounts, or shorter surrender periods.
                No IRS penalty applies to 1035 exchanges.
              </p>
              <div className="mt-2 bg-gray-50 rounded p-2 text-[11px] text-gray-500">
                <strong>Note:</strong> The new annuity may have its own surrender period. Some carriers waive or reduce surrender charges for incoming 1035 exchanges.
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Quick Reference: What Penalties Apply?</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Scenario</th>
                    <th className="text-center py-2 px-3 text-gray-500 font-medium">Surrender Charge</th>
                    <th className="text-center py-2 px-3 text-gray-500 font-medium">10% IRS Penalty</th>
                    <th className="text-center py-2 px-3 text-gray-500 font-medium">Income Tax</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 px-3 text-gray-700 font-medium">Over 59½, past surrender period</td>
                    <td className="py-2 px-3 text-center text-green-600">None</td>
                    <td className="py-2 px-3 text-center text-green-600">None</td>
                    <td className="py-2 px-3 text-center text-gray-600">On gains only</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 px-3 text-gray-700 font-medium">Over 59½, during surrender period (10% free)</td>
                    <td className="py-2 px-3 text-center text-green-600">None</td>
                    <td className="py-2 px-3 text-center text-green-600">None</td>
                    <td className="py-2 px-3 text-center text-gray-600">On gains only</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 px-3 text-gray-700 font-medium">Under 59½, 72(t)/SEPP payments</td>
                    <td className="py-2 px-3 text-center text-amber-600">Maybe (if &gt;10%)</td>
                    <td className="py-2 px-3 text-center text-green-600 font-medium">None</td>
                    <td className="py-2 px-3 text-center text-gray-600">On gains only</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 px-3 text-gray-700 font-medium">Under 59½, free 10% withdrawal</td>
                    <td className="py-2 px-3 text-center text-green-600">None</td>
                    <td className="py-2 px-3 text-center text-red-600">10% on gains</td>
                    <td className="py-2 px-3 text-center text-gray-600">On gains only</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-gray-700 font-medium">Under 59½, full surrender in year 1</td>
                    <td className="py-2 px-3 text-center text-red-600">7-8%</td>
                    <td className="py-2 px-3 text-center text-red-600">10% on gains</td>
                    <td className="py-2 px-3 text-center text-gray-600">On gains only</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: ETF vs Annuity */}
      {activeTab === "comparison" && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">ETF vs Annuity Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Feature</th>
                  <th className="text-center py-2 px-3 text-xs text-gray-500 font-medium">ETF (UGA/USO)</th>
                  <th className="text-center py-2 px-3 text-xs text-gray-500 font-medium">Variable Annuity</th>
                  <th className="text-center py-2 px-3 text-xs text-gray-500 font-medium">Fixed Indexed Annuity</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                <tr className="border-b border-gray-50">
                  <td className="py-2 px-3 text-gray-700 font-medium">Liquidity</td>
                  <td className="py-2 px-3 text-center text-green-600 font-medium">Sell anytime</td>
                  <td className="py-2 px-3 text-center text-red-600">Surrender charges apply</td>
                  <td className="py-2 px-3 text-center text-red-600">Surrender charges apply</td>
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="py-2 px-3 text-gray-700 font-medium">Annual Fees</td>
                  <td className="py-2 px-3 text-center text-green-600">~0.8-1.0%</td>
                  <td className="py-2 px-3 text-center text-amber-600">~2.0-2.5%</td>
                  <td className="py-2 px-3 text-center text-amber-600">~1.5%</td>
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="py-2 px-3 text-gray-700 font-medium">Tax Treatment</td>
                  <td className="py-2 px-3 text-center text-gray-600">Capital gains + K-1</td>
                  <td className="py-2 px-3 text-center text-green-600">Tax-deferred growth</td>
                  <td className="py-2 px-3 text-center text-green-600">Tax-deferred growth</td>
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="py-2 px-3 text-gray-700 font-medium">Age 59½ Penalty</td>
                  <td className="py-2 px-3 text-center text-green-600 font-medium">None</td>
                  <td className="py-2 px-3 text-center text-red-600">10% IRS penalty</td>
                  <td className="py-2 px-3 text-center text-red-600">10% IRS penalty</td>
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="py-2 px-3 text-gray-700 font-medium">Principal Protection</td>
                  <td className="py-2 px-3 text-center text-red-600">No</td>
                  <td className="py-2 px-3 text-center text-red-600">No</td>
                  <td className="py-2 px-3 text-center text-green-600 font-medium">Yes (0% floor)</td>
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="py-2 px-3 text-gray-700 font-medium">Fuel Price Correlation</td>
                  <td className="py-2 px-3 text-center text-green-600 font-medium">High (78-88%)</td>
                  <td className="py-2 px-3 text-center text-amber-600">Moderate (varies)</td>
                  <td className="py-2 px-3 text-center text-amber-600">Low-Moderate (capped)</td>
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="py-2 px-3 text-gray-700 font-medium">Complexity</td>
                  <td className="py-2 px-3 text-center text-green-600">Low — buy/sell like stocks</td>
                  <td className="py-2 px-3 text-center text-amber-600">Medium — insurance contract</td>
                  <td className="py-2 px-3 text-center text-amber-600">Medium — insurance contract</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-gray-700 font-medium">Best For</td>
                  <td className="py-2 px-3 text-center text-gray-600">Active hedging, full liquidity needed</td>
                  <td className="py-2 px-3 text-center text-gray-600">Tax-deferred, long-term hedging</td>
                  <td className="py-2 px-3 text-center text-gray-600">Conservative, principal safety</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ComplianceDisclaimer />
    </div>
  );
}
