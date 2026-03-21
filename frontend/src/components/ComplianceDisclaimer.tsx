export default function ComplianceDisclaimer({ disclaimers }: { disclaimers?: string[] }) {
  const defaultDisclaimers = [
    "This analysis is provided for informational purposes under an advisory relationship. Securities recommended are limited to registered investment products (ETFs, mutual funds).",
    "Past performance does not guarantee future results. Commodity ETFs involve significant risks including contango losses and tracking error.",
  ];

  const items = disclaimers && disclaimers.length > 0 ? disclaimers : defaultDisclaimers;

  return (
    <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Important Disclosures</p>
      {items.map((d, i) => (
        <p key={i} className="text-xs text-gray-400 mb-1">{d}</p>
      ))}
    </div>
  );
}
