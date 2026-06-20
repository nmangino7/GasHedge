import { describe, it, expect } from "vitest";
import { callGreeks, putGreeks } from "@/domain/finance/greeks";
import { callPrice, putPrice, BlackScholesInputs } from "@/domain/finance/black-scholes";

const base: BlackScholesInputs = {
  spot: 100,
  strike: 105,
  timeToExpiryYears: 0.5,
  volatility: 0.3,
  riskFreeRate: 0.045,
  dividendYield: 0.0,
};

describe("Greeks (finite-difference verification)", () => {
  it("delta ≈ d(price)/d(spot)", () => {
    const h = 0.01;
    const callFd = (callPrice({ ...base, spot: base.spot + h }) - callPrice({ ...base, spot: base.spot - h })) / (2 * h);
    const putFd = (putPrice({ ...base, spot: base.spot + h }) - putPrice({ ...base, spot: base.spot - h })) / (2 * h);
    expect(callGreeks(base).delta).toBeCloseTo(callFd, 4);
    expect(putGreeks(base).delta).toBeCloseTo(putFd, 4);
  });

  it("gamma ≈ d²(price)/d(spot)²", () => {
    const h = 0.5;
    const fd =
      (callPrice({ ...base, spot: base.spot + h }) - 2 * callPrice(base) + callPrice({ ...base, spot: base.spot - h })) /
      (h * h);
    expect(callGreeks(base).gamma).toBeCloseTo(fd, 4);
  });

  it("vega ≈ d(price)/d(vol) per 1 percentage point", () => {
    const h = 0.0001;
    const fd = (callPrice({ ...base, volatility: base.volatility + h }) - callPrice({ ...base, volatility: base.volatility - h })) / (2 * h);
    // our vega is per 1% (÷100), so compare to fd/100
    expect(callGreeks(base).vega).toBeCloseTo(fd / 100, 3);
  });

  it("theta ≈ -d(price)/d(t) per calendar day", () => {
    const h = 1 / 365 / 10;
    // price decreases as time passes → derivative wrt remaining time is positive; theta is the per-day decay
    const fd = (callPrice({ ...base, timeToExpiryYears: base.timeToExpiryYears + h }) - callPrice({ ...base, timeToExpiryYears: base.timeToExpiryYears - h })) / (2 * h);
    expect(callGreeks(base).theta).toBeCloseTo(-fd / 365, 2);
  });

  it("call_delta - put_delta == e^(-qT)", () => {
    const q = base.dividendYield ?? 0;
    expect(callGreeks(base).delta - putGreeks(base).delta).toBeCloseTo(Math.exp(-q * base.timeToExpiryYears), 8);
  });
});
