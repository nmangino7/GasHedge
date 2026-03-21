export default function ComplianceDisclaimer({ disclaimers }: { disclaimers?: string[] }) {
  const defaultDisclaimers = [
    "This analysis is provided for informational purposes under an advisory relationship. Securities recommended are limited to registered investment products (ETFs, mutual funds).",
    "Past performance does not guarantee future results. Commodity ETFs involve significant risks including contango losses and tracking error.",
    "Commodity ETFs structured as limited partnerships issue Schedule K-1 tax forms. Gains are taxed at a blended 60/40 long-term/short-term rate. Consult a qualified tax advisor.",
    "Hedging strategies should be evaluated based on each company's specific financial situation, risk tolerance, and fuel cost exposure. Not all strategies are suitable for all businesses.",
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
