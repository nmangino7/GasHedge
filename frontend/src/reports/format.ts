// Shared formatting helpers for client-facing reports (PDF + PPTX).

export function money(n: number, dp = 0): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });
}

export function pct(fraction: number, dp = 1): string {
  return `${(fraction * 100).toFixed(dp)}%`;
}

export function pctValue(value: number, dp = 1): string {
  return `${value.toFixed(dp)}%`;
}

export function signedMoney(n: number): string {
  return `${n >= 0 ? "+" : "-"}${money(Math.abs(n))}`;
}

export function todayLong(): string {
  return new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
