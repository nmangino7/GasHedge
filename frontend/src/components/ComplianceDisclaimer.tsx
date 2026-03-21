export default function ComplianceDisclaimer({ disclaimers }: { disclaimers?: string[] }) {
  const defaultDisclaimers = [
    "This analysis is provided for informational purposes under an advisory relationship. Securities recommended are limited to registered investment products (ETFs, mutual funds).",
    "Past performance does not guarantee future results. Commodity ETFs involve significant risks including contango losses and tracking error.",
    "Annuity products are insurance contracts, not securities. Withdrawals before age 59½ may be subject to a 10% IRS early withdrawal penalty on gains. Surrender charges may apply during the surrender period. Annuity guarantees are backed by the financial strength of the issuing insurance company, not by any government agency.",
    "Tax-deferred does not mean tax-free. Annuity withdrawals are taxed as ordinary income. Consult a qualified tax advisor before making annuity investment decisions.",
  ];

  const items = disclaimers && disclaimers.length > 0 ? disclaimers : defaultDisclaimers;

  return (
    <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Important Disclosures</p>
      {items.map((d, i) => (
        <p key={i} className="text-xs text-gray-500 mb-1 leading-relaxed">{d}</p>
      ))}
    </div>
  );
}
