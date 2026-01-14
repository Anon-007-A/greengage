import React from 'react';

export default function RiskAssessmentReportView({ data = {} }) {
  const buckets = data.riskDistribution || { safe: [], lowMedium: [], mediumHigh: [], high: [], critical: [] };
  const topRisky = data.topRiskyLoans || [];
  const vulnerabilityBySector = data.vulnerabilityBySector || [];
  const riskFactors = data.riskFactors || [];

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold text-red-600">Risk Assessment Report</h1>
      <div className="text-sm text-gray-500">Generated: {new Date().toLocaleString()}</div>

      <div className="flex gap-3 mt-4">
        <div className="flex-1 bg-white border rounded p-3 text-center">
          <div className="text-xs text-gray-500">Safe (0-20%)</div>
          <div className="text-xl font-bold">{(buckets.safe && buckets.safe.length) || 0}</div>
        </div>
        <div className="flex-1 bg-white border rounded p-3 text-center">
          <div className="text-xs text-gray-500">Low-Medium (20-40%)</div>
          <div className="text-xl font-bold">{(buckets.lowMedium && buckets.lowMedium.length) || 0}</div>
        </div>
        <div className="flex-1 bg-white border rounded p-3 text-center">
          <div className="text-xs text-gray-500">Medium-High (40-60%)</div>
          <div className="text-xl font-bold">{(buckets.mediumHigh && buckets.mediumHigh.length) || 0}</div>
        </div>
        <div className="flex-1 bg-white border rounded p-3 text-center">
          <div className="text-xs text-gray-500">High (60-80%)</div>
          <div className="text-xl font-bold">{(buckets.high && buckets.high.length) || 0}</div>
        </div>
        <div className="flex-1 bg-white border rounded p-3 text-center">
          <div className="text-xs text-gray-500">Critical (80-100%)</div>
          <div className="text-xl font-bold">{(buckets.critical && buckets.critical.length) || 0}</div>
        </div>
      </div>

      <h3 className="mt-6 font-semibold">Risk Distribution</h3>
      <div className="space-y-4">
        {['safe','lowMedium','mediumHigh','high','critical'].map(key => (
          <div key={key} className="p-2 border rounded">
            <div className="font-medium">{key.charAt(0).toUpperCase() + key.slice(1)}</div>
            <div className="text-sm">Count: {(buckets[key] && buckets[key].length) || 0}</div>
            <div className="text-sm">{(buckets[key] || []).map(l => l.companyName || l.company).slice(0,10).join(', ')}</div>
          </div>
        ))}
      </div>

      <h3 className="mt-6 font-semibold">Top 15 Highest Risk Loans</h3>
      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm">
          <thead><tr className="bg-gray-100"><th className="px-3 py-2">Rank</th><th className="px-3 py-2">Company</th><th className="px-3 py-2">Risk Score</th><th className="px-3 py-2">Sector</th><th className="px-3 py-2">Primary Risk Factor</th><th className="px-3 py-2">Breach Probability</th><th className="px-3 py-2">Mitigation</th></tr></thead>
          <tbody>
            {topRisky.slice(0,15).map((r, i) => (
              <tr key={r.company || i}><td className="px-3 py-2">{r.rank || i+1}</td><td className="px-3 py-2">{r.company}</td><td className="px-3 py-2">{r.riskScore}</td><td className="px-3 py-2">{r.sector || 'N/A'}</td><td className="px-3 py-2">{r.primaryRisk || 'N/A'}</td><td className="px-3 py-2">{r.breachProbability ? `${r.breachProbability}%` : '-'}</td><td className="px-3 py-2">{r.mitigation || '-'}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="mt-6 font-semibold">Vulnerability Assessment by Sector</h3>
      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm">
          <thead><tr className="bg-gray-100"><th className="px-3 py-2">Sector</th><th className="px-3 py-2">Vulnerability Level</th><th className="px-3 py-2">Primary Risk</th><th className="px-3 py-2">Secondary Risk</th><th className="px-3 py-2">Count Vulnerable</th></tr></thead>
          <tbody>
            {vulnerabilityBySector.map(v => (<tr key={v.sector}><td className="px-3 py-2">{v.sector}</td><td className="px-3 py-2">{v.vulnerability}</td><td className="px-3 py-2">{v.primaryRisk || '-'}</td><td className="px-3 py-2">{v.secondaryRisk || '-'}</td><td className="px-3 py-2">{v.count || 0}</td></tr>))}
          </tbody>
        </table>
      </div>

      <h3 className="mt-6 font-semibold">Key Risk Factors</h3>
      <div className="space-y-3">
        {riskFactors.map((f, i) => (
          <div key={i} className="p-3 border rounded">
            <div className="font-bold text-red-600">{f.name}</div>
            <div className="text-sm">Description: {f.description || 'See factor analysis'}</div>
            <div className="text-sm">Affected Loans: {(f.affectedLoans && f.affectedLoans.length) || 0}</div>
            <div className="text-sm">Top 3 Affected: {(f.affectedLoans || []).slice(0,3).join(', ')}</div>
            <div className="text-sm">Mitigation: {f.mitigation || '-'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
