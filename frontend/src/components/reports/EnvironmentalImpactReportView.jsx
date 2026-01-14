import React from 'react';

export default function EnvironmentalImpactReportView({ data = {} }) {
  const esg = data.esgScores || { environmental: 0, social: 0, governance: 0 };
  const greenLoanData = data.greenLoanData || { count: 0, value: 0, bySector: {} };
  const sdg = data.sdgAlignment || [];
  const climate = data.climateMetrics || {};

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold text-teal-600">Environmental Impact Report</h1>
      <div className="text-sm text-gray-500">Generated: {new Date().toLocaleString()}</div>

      <div className="flex gap-4 mt-4">
        <div className="flex-1 bg-white border rounded p-3"><div className="text-xs text-gray-500">ESG Environmental Score</div><div className="text-xl font-bold">{esg.environmental}%</div></div>
        <div className="flex-1 bg-white border rounded p-3"><div className="text-xs text-gray-500">ESG Social Score</div><div className="text-xl font-bold">{esg.social}%</div></div>
        <div className="flex-1 bg-white border rounded p-3"><div className="text-xs text-gray-500">ESG Governance Score</div><div className="text-xl font-bold">{esg.governance}%</div></div>
        <div className="flex-1 bg-white border rounded p-3"><div className="text-xs text-gray-500">Green Loan Portfolio</div><div className="text-xl font-bold">{greenLoanData.count ? `${Math.round((greenLoanData.value / Math.max(1, data.totalPortfolioValue || 1)) * 100)}%` : '0%'}</div></div>
      </div>

      <h3 className="mt-6 font-semibold">ESG Performance Scorecard</h3>
      <div className="flex gap-3">
        <div className="flex-1 border rounded p-3">
          <div className="font-semibold">Environmental</div>
          <div className="text-2xl font-bold">{esg.environmental}/100</div>
          <div className="text-sm">Carbon emissions: {climate.co2Reduction || 0} metric tons reduced</div>
          <div className="text-sm">Water usage: {climate.waterSaved || 0} liters saved</div>
          <div className="text-sm">Renewable energy: {climate.renewablePct || 0}%</div>
        </div>
        <div className="flex-1 border rounded p-3">
          <div className="font-semibold">Social</div>
          <div className="text-2xl font-bold">{esg.social}/100</div>
          <div className="text-sm">Labor practices compliance: {data.socialMetrics && data.socialMetrics.laborCompliance ? `${data.socialMetrics.laborCompliance}%` : 'N/A'}</div>
          <div className="text-sm">Diversity: {data.socialMetrics && data.socialMetrics.womenPct ? `${data.socialMetrics.womenPct}%` : 'N/A'}</div>
        </div>
        <div className="flex-1 border rounded p-3">
          <div className="font-semibold">Governance</div>
          <div className="text-2xl font-bold">{esg.governance}/100</div>
          <div className="text-sm">Board independence: {data.governanceMetrics && data.governanceMetrics.boardIndependence ? `${data.governanceMetrics.boardIndependence}%` : 'N/A'}</div>
          <div className="text-sm">Compliance record: {data.governanceMetrics && data.governanceMetrics.violations ? `${data.governanceMetrics.violations}` : '0'}</div>
        </div>
      </div>

      <h3 className="mt-6 font-semibold">Green Loan Portfolio Breakdown</h3>
      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm">
          <thead><tr className="bg-gray-100"><th className="px-3 py-2">Sector</th><th className="px-3 py-2">Green Loans Count</th><th className="px-3 py-2">Total Value (€M)</th><th className="px-3 py-2">% of Portfolio</th><th className="px-3 py-2">ESG Score</th><th className="px-3 py-2">Impact</th></tr></thead>
          <tbody>
            {Object.keys(greenLoanData.bySector || {}).map(s => (<tr key={s}><td className="px-3 py-2">{s}</td><td className="px-3 py-2">{greenLoanData.bySector[s]}</td><td className="px-3 py-2">€{Math.round((greenLoanData.value||0)/1e6)}</td><td className="px-3 py-2">{Math.round(((greenLoanData.bySector[s]||0) / Math.max(1, greenLoanData.count || 1)) * 100)}%</td><td className="px-3 py-2">-</td><td className="px-3 py-2">-</td></tr>))}
          </tbody>
        </table>
      </div>

      <h3 className="mt-6 font-semibold">UN Sustainable Development Goals Alignment</h3>
      <div className="space-y-2">
        {sdg.map(s => (
          <div key={s.sdg} className="p-2 border rounded">
            <div className="font-semibold">SDG {s.sdg} — {s.name || 'N/A'}</div>
            <div className="text-sm">Supporting Loans: {s.loans || 0} | Portfolio Exposure: {s.exposure || 'N/A'}</div>
            <div className="text-sm">Impact: {s.impact || '-'}</div>
          </div>
        ))}
      </div>

      <h3 className="mt-6 font-semibold">Climate & Environmental Metrics</h3>
      <div className="text-sm">
        <div>Annual CO2 Reduction: {climate.co2Reduction || 0} metric tons</div>
        <div>Clean Energy Generated: {climate.cleanEnergyMWh || 0} MWh/year</div>
        <div>Water Conserved: {climate.waterSaved || 0} liters/year</div>
        <div>Waste Diverted: {climate.wasteDiverted || 0} metric tons</div>
        <div>Renewable Capacity: {climate.renewableCapacity || 0} MW</div>
      </div>

      <h3 className="mt-6 font-semibold">Green vs Non-Green Loan Performance</h3>
      <div className="overflow-auto border rounded p-2 text-sm">
        <div>Comparison metrics are available in the full export.</div>
      </div>
    </div>
  );
}
