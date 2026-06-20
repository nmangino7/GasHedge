import { describe, it, expect } from "vitest";
import { callPrice, putPrice, BlackScholesInputs } from "@/domain/finance/black-scholes";

const base: BlackScholesInputs = {
  spot: 100,
  strike: 100,
  timeToExpiryYears: 1,
  volatility: 0.2,
  riskFreeRate: 0.05,
};

describe("Black-Scholes pricing", () => {
  it("matches the canonical reference value (S=K=100, T=1, σ=0.2, r=0.05)", () => {
    // Well-known textbook values for this exact set of inputs.
    expect(callPrice(base)).toBeCloseTo(10.4506, 3);
    expect(putPrice(base)).toBeCloseTo(5.5735, 3);
  });

  it("satisfies put-call parity C - P = S·e^(-qT) - K·e^(-rT) across a grid", () => {
    const grid: BlackScholesInputs[] = [];
    for (const spot of [80, 100, 120]) {
      for (const strike of [90, 100, 110]) {
        for (const t of [0.25, 1, 2]) {
          for (const vol of [0.15, 0.35]) {
            grid.push({ ...base, spot, strike, timeToExpiryYears: t, volatility: vol, dividendYield: 0.01 });
          }
        }
      }
    }
    for (const i of grid) {
      const lhs = callPrice(i) - putPrice(i);
      const q = i.dividendYield ?? 0;
      const rhs =
        i.spot * Math.exp(-q * i.timeToExpiryYears) -
        i.strike * Math.exp(-i.riskFreeRate * i.timeToExpiryYears);
      expect(lhs).toBeCloseTo(rhs, 6);
    }
  });

  it("returns intrinsic value at expiry (T <= 0)", () => {
    expect(callPrice({ ...base, spot: 110, timeToExpiryYears: 0 })).toBe(10);
    expect(putPrice({ ...base, spot: 90, timeToExpiryYears: 0 })).toBe(10);
    expect(callPrice({ ...base, spot: 90, timeToExpiryYears: 0 })).toBe(0);
  });

  it("is monotic in spot: deep ITM call ~ discounted intrinsic, deep OTM ~ 0", () => {
    expect(callPrice({ ...base, spot: 1000 })).toBeGreaterThan(callPrice({ ...base, spot: 100 }));
    expect(callPrice({ ...base, spot: 10 })).toBeLessThan(0.01);
    expect(putPrice({ ...base, spot: 1000 })).toBeLessThan(0.01);
  });
});
