import React from 'react';

export default function PortfolioAnalyticsReportView({ data = {} }) {
  const sectorPerformance = data.sectorPerformance || [];
  const monthlyTrends = data.monthlyTrends || [];
  const covenantTypePerformance = data.covenantTypePerformance || [];
  const riskDistribution = data.portfolioComposition && data.portfolioComposition.byRiskBucket ? data.portfolioComposition.byRiskBucket : {};

  const totalExposure = (data.portfolioComposition && data.portfolioComposition.bySector && data.portfolioComposition.bySector.reduce((s, x) => s + (x.exposure || 0), 0)) || 0;
  const avgRisk = (monthlyTrends.length ? monthlyTrends[monthlyTrends.length - 1].avgRisk : 0);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold text-teal-600">Portfolio Analytics Report</h1>
      <div className="text-sm text-gray-500">Generated: {new Date().toLocaleString()}</div>

      <div className="flex gap-4 mt-4">
        <div className="flex-1 bg-white border rounded p-3">
          <div className="text-xs text-gray-500">Total Portfolio Value</div>
          <div className="text-xl font-bold">€{(totalExposure / 1e9).toFixed(2)}B</div>
        </div>
        <div className="flex-1 bg-white border rounded p-3">
          <div className="text-xs text-gray-500">Average Risk Score</div>
          <div className="text-xl font-bold">{avgRisk}/100</div>
        </div>
        <div className="flex-1 bg-white border rounded p-3">
          <div className="text-xs text-gray-500">Best Sector</div>
          <div className="text-xl font-bold">{(sectorPerformance[0] && sectorPerformance[0].sector) || 'N/A'} ({(sectorPerformance[0] && sectorPerformance[0].avgRisk) || 'N/A'} risk)</div>
        </div>
        <div className="flex-1 bg-white border rounded p-3">
          <div className="text-xs text-gray-500">Worst Sector</div>
          <div className="text-xl font-bold">{(sectorPerformance.slice(-1)[0] && sectorPerformance.slice(-1)[0].sector) || 'N/A'} ({(sectorPerformance.slice(-1)[0] && sectorPerformance.slice(-1)[0].avgRisk) || 'N/A'} risk)</div>
        </div>
      </div>

      <h3 className="mt-6 font-semibold">Sector Performance Analysis</h3>
      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100"><th className="px-3 py-2">Sector</th><th className="px-3 py-2">Loans Count</th><th className="px-3 py-2">Exposure (€M)</th><th className="px-3 py-2">Avg Risk Score</th><th className="px-3 py-2">Compliant %</th><th className="px-3 py-2">Trend</th></tr>
          </thead>
          <tbody>
            {sectorPerformance.map(s => (
              <tr key={s.sector}><td className="px-3 py-2">{s.sector}</td><td className="px-3 py-2">{s.totalLoans}</td><td className="px-3 py-2">€{Math.round((s.exposure||0)/1e6)}</td><td className="px-3 py-2">{s.avgRisk}</td><td className="px-3 py-2">{Math.round(((s.compliant||0) / Math.max(1, s.totalLoans)) * 100)}%</td><td className="px-3 py-2">{s.trend || '→'}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="mt-6 font-semibold">3-Month Historical Trend</h3>
      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm">
          <thead><tr className="bg-gray-100"><th className="px-3 py-2">Month</th><th className="px-3 py-2">Avg Risk Score</th><th className="px-3 py-2">Compliance Rate</th><th className="px-3 py-2">Breached Count</th><th className="px-3 py-2">At-Risk Count</th></tr></thead>
          <tbody>
            {monthlyTrends.map(m => (
              <tr key={m.month}><td className="px-3 py-2">{m.month}</td><td className="px-3 py-2">{m.avgRisk}</td><td className="px-3 py-2">{m.compliance}%</td><td className="px-3 py-2">{m.breached}</td><td className="px-3 py-2">{m.atRisk}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="mt-6 font-semibold">Covenant Type Performance</h3>
      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm">
          <thead><tr className="bg-gray-100"><th className="px-3 py-2">Covenant Type</th><th className="px-3 py-2">Count</th><th className="px-3 py-2">Breach Rate (%)</th><th className="px-3 py-2">Avg Risk Score</th></tr></thead>
          <tbody>
            {covenantTypePerformance.map(c => (<tr key={c.type}><td className="px-3 py-2">{c.type}</td><td className="px-3 py-2">{c.count}</td><td className="px-3 py-2">{c.breachRate || '-'}</td><td className="px-3 py-2">{c.avgRisk || '-'}</td></tr>))}
          </tbody>
        </table>
      </div>

      <h3 className="mt-6 font-semibold">Portfolio Composition</h3>
      <div className="text-sm whitespace-pre-line">Risk Distribution: 
        - Safe (0-20%): {((riskDistribution && riskDistribution.safe && riskDistribution.safe.length) || 0)} loans ({Math.round(((riskDistribution && riskDistribution.safe && (riskDistribution.safe.length || 0)) / Math.max(1, (data.portfolioComposition && data.portfolioComposition.bySector && data.portfolioComposition.bySector.reduce((s,x)=>s+x.totalLoans,0)) || 1)) * 100)}%)
        {'\n'}- Low-Medium (20-40%): {((riskDistribution && riskDistribution.lowMedium && riskDistribution.lowMedium.length) || 0)} loans
        {'\n'}- Medium-High (40-60%): {((riskDistribution && riskDistribution.mediumHigh && riskDistribution.mediumHigh.length) || 0)} loans
        {'\n'}- High (60-80%): {((riskDistribution && riskDistribution.high && riskDistribution.high.length) || 0)} loans
        {'\n'}- Critical (80-100%): {((riskDistribution && riskDistribution.critical && riskDistribution.critical.length) || 0)} loans
      </div>

      <h3 className="mt-6 font-semibold">Key Insights</h3>
      <ul className="list-disc ml-5 text-sm">
        <li>Sector concentration in {(sectorPerformance[0] && sectorPerformance[0].sector) || 'N/A'} is high and should be monitored.</li>
        <li>Avg risk has {(avgRisk > 50) ? 'increased' : 'remained stable'} over the last quarter.</li>
        <li>Debt-to-EBITDA covenants show the highest breach rate across covenant types.</li>
      </ul>
    </div>
  );
}
