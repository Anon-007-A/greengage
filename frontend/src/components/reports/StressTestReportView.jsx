import React from 'react';

export default function StressTestReportView({ data = {} }) {
  const stressParams = data.stressParams || data.stressParams || {};
  const baseline = data.baseline || {};
  const stressed = data.stressed || {};
  const impacted = data.impactedLoans || [];
  const sectorImpact = data.sectorImpact || [];
  const recovery = data.recoveryTimeline || [];

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold text-purple-600">Stress Test Results Report</h1>
      <div className="text-sm text-gray-500">Generated: {new Date().toLocaleString()}</div>

      <div className="mt-4 p-3 border rounded bg-gray-50">Scenario: {stressParams.ebitdaDrop || 0}% EBITDA Drop + {stressParams.rateHike || 0} bps Rate Increase</div>

      <h3 className="mt-6 font-semibold">Impact Summary</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 border rounded">Breached Loans: <strong>{baseline.breached || 0} → {stressed.breached || 0}</strong></div>
        <div className="p-3 border rounded">At-Risk Loans: <strong>{baseline.atRisk || 0} → {stressed.atRisk || 0}</strong></div>
        <div className="p-3 border rounded">Compliance Rate: <strong>{baseline.complianceRate || 0}% → {stressed.complianceRate || stressed.complianceRate || 0}%</strong></div>
        <div className="p-3 border rounded">Avg Risk Score: <strong>{baseline.avgRisk || 0} → {stressed.avgRisk || 0}</strong></div>
      </div>

      <h3 className="mt-6 font-semibold">Baseline Metrics</h3>
      <div className="text-sm">Current Portfolio Status (0% stress)</div>
      <ul className="list-disc ml-6 text-sm">
        <li>Total Loans: {baseline.totalLoans || (data.totalLoans || 0)}</li>
        <li>Breached: {baseline.breached || 0}</li>
        <li>At-Risk: {baseline.atRisk || 0}</li>
        <li>Safe: {baseline.safe || 0}</li>
        <li>Compliance Rate: {baseline.complianceRate || 0}%</li>
      </ul>

      <h3 className="mt-6 font-semibold">Stressed Scenario Metrics</h3>
      <div className="text-sm">Portfolio Status Under Scenario</div>
      <ul className="list-disc ml-6 text-sm">
        <li>Total Loans: {stressed.totalLoans || (data.totalLoans || 0)}</li>
        <li>Breached: {stressed.breached || 0}</li>
        <li>At-Risk: {stressed.atRisk || 0}</li>
        <li>Safe: {stressed.safe || 0}</li>
        <li>Compliance Rate: {stressed.complianceRate || 0}%</li>
      </ul>

      <h3 className="mt-6 font-semibold">Most Affected Loans (Top 10)</h3>
      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm">
          <thead><tr className="bg-gray-100"><th className="px-3 py-2">Company</th><th className="px-3 py-2">Current Status</th><th className="px-3 py-2">Stressed Status</th><th className="px-3 py-2">Covenant Hit</th><th className="px-3 py-2">Days to Breach (Stressed)</th><th className="px-3 py-2">Impact</th></tr></thead>
          <tbody>
            {impacted.slice(0,10).map((r, i) => (
              <tr key={r.company || i}><td className="px-3 py-2">{r.company}</td><td className="px-3 py-2">{r.currentStatus}</td><td className="px-3 py-2">{r.stressedStatus}</td><td className="px-3 py-2">{r.covenantAffected}</td><td className="px-3 py-2">{r.daysToBreach || '-'}</td><td className="px-3 py-2">{r.impact || '-'}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="mt-6 font-semibold">Sector Impact Analysis</h3>
      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm">
          <thead><tr className="bg-gray-100"><th className="px-3 py-2">Sector</th><th className="px-3 py-2">Current Breaches</th><th className="px-3 py-2">Stressed Breaches</th><th className="px-3 py-2">New Breaches</th><th className="px-3 py-2">Susceptibility</th></tr></thead>
          <tbody>
            {Object.values(sectorImpact).map(s => (<tr key={s.sector}><td className="px-3 py-2">{s.sector}</td><td className="px-3 py-2">{s.current || 0}</td><td className="px-3 py-2">{s.stressed || s.impacted || 0}</td><td className="px-3 py-2">{(s.stressed || s.impacted || 0) - (s.current || 0)}</td><td className="px-3 py-2">{s.susceptibility || '-'}</td></tr>))}
          </tbody>
        </table>
      </div>

      <h3 className="mt-6 font-semibold">Recovery Timeline</h3>
      <div className="text-sm">
        {recovery.length ? recovery.map(r => (<div key={r.day}>Day {r.day}: {r.breached} loans still breached</div>)) : <div>No recovery projection available</div>}
      </div>
    </div>
  );
}
