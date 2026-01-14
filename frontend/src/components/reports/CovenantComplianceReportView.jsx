import React from 'react';

export default function CovenantComplianceReportView({ data = {} }) {
  const breachedLoans = data.breachedLoans || [];
  const atRiskLoans = data.atRiskLoans || [];
  const complianceRate = Number(data.complianceRate || 0).toFixed(1);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold text-teal-600">Covenant Compliance Report</h1>
      <div className="text-sm text-gray-500">Generated: {new Date().toLocaleString()}</div>

      <div className="flex gap-4 mt-4">
        <div className="flex-1 bg-white border rounded p-3">
          <div className="text-xs text-gray-500">Compliance Rate</div>
          <div className="text-xl font-bold">{complianceRate}%</div>
          <div className="text-xs text-gray-400">of loans fully compliant</div>
        </div>
        <div className="flex-1 bg-white border rounded p-3">
          <div className="text-xs text-gray-500">Breached Loans</div>
          <div className="text-xl font-bold">{breachedLoans.length}</div>
          <div className="text-xs text-gray-400">requiring action</div>
        </div>
        <div className="flex-1 bg-white border rounded p-3">
          <div className="text-xs text-gray-500">At-Risk Loans</div>
          <div className="text-xl font-bold">{atRiskLoans.length}</div>
          <div className="text-xs text-gray-400">approaching breach</div>
        </div>
      </div>

      <h2 className="mt-6 text-red-600 font-semibold flex items-center">⚠ Breached Covenants</h2>
      <div className="mt-2 space-y-3">
        {breachedLoans.length === 0 && <div className="text-sm text-gray-500">No breached covenants</div>}
        {breachedLoans.map((l) => (
          <div key={l.id || l.company} className="border border-red-200 bg-red-50 p-3 rounded">
            <div className="font-bold text-red-700">{l.company}</div>
            <div className="text-sm">Covenant Type: {((l.covenants && l.covenants[0] && l.covenants[0].type) || l.covenantType || 'N/A')}</div>
            <div className="text-sm">Threshold: {((l.covenants && l.covenants[0] && l.covenants[0].threshold) || '-')} | Current: {((l.covenants && l.covenants[0] && l.covenants[0].current) || '-')}</div>
            <div className="text-sm">Days in Breach: {l.daysToBreach ?? 'N/A'}</div>
            <div className="text-sm">Severity: {(l.severity || 'CRITICAL')}</div>
            <div className="text-sm">Recommended Action: {(l.recommendedAction || 'Initiate covenant waiver discussion')}</div>
          </div>
        ))}
      </div>

      <h2 className="mt-6 text-orange-600 font-semibold flex items-center">⚠ At-Risk Loans</h2>
      <div className="mt-2 space-y-3">
        {atRiskLoans.length === 0 && <div className="text-sm text-gray-500">No at-risk loans</div>}
        {atRiskLoans.map((l) => (
          <div key={l.id || l.company} className="border border-orange-200 bg-orange-50 p-3 rounded">
            <div className="font-semibold">{l.company}</div>
            <div className="text-sm">Covenant Type: {((l.covenants && l.covenants[0] && l.covenants[0].type) || l.covenantType || 'N/A')}</div>
            <div className="text-sm">Current Value: {((l.covenants && l.covenants[0] && l.covenants[0].current) || '-')} | Threshold: {((l.covenants && l.covenants[0] && l.covenants[0].threshold) || '-')}</div>
            <div className="text-sm">Days Until Breach: {l.daysToBreach ?? 'N/A'}</div>
            <div className="text-sm">Trend: {l.trendPct ? `Declining ${l.trendPct}% per month` : 'N/A'}</div>
            <div className="text-sm">Recommended Preventive Action: {(l.recommendedAction || 'Monitor and engage borrower')}</div>
          </div>
        ))}
      </div>

      <h3 className="mt-6 font-semibold">Compliance Summary</h3>
      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-3 py-2 text-left">Company</th>
              <th className="px-3 py-2 text-left">Covenant Type</th>
              <th className="px-3 py-2 text-left">Current</th>
              <th className="px-3 py-2 text-left">Threshold</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {[...breachedLoans.map(l => ({...l, _rowType: 'breached'})), ...atRiskLoans.map(l => ({...l, _rowType: 'atRisk'}))].map((r, idx) => (
              <tr key={r.id || `${r.company}-${idx}`} className={r._rowType === 'breached' ? 'bg-red-50' : 'bg-orange-50'}>
                <td className="px-3 py-2">{r.company}</td>
                <td className="px-3 py-2">{(r.covenants && r.covenants[0] && r.covenants[0].type) || r.covenantType || '-'}</td>
                <td className="px-3 py-2">{(r.covenants && r.covenants[0] && r.covenants[0].current) || '-'}</td>
                <td className="px-3 py-2">{(r.covenants && r.covenants[0] && r.covenants[0].threshold) || '-'}</td>
                <td className="px-3 py-2">{r._rowType === 'breached' ? 'Breached' : 'At-Risk'}</td>
                <td className="px-3 py-2">{r.recommendedAction || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-gray-500">CONFIDENTIAL - For Internal Use Only | {new Date().toLocaleDateString()}</div>
    </div>
  );
}
