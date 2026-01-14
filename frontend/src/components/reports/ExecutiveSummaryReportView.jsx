import React from 'react';

export default function ExecutiveSummaryReportView({ data = {} }) {
  const key = data.keyMetrics || {};
  const risks = data.criticalRisks || [];
  const opps = data.opportunities || [];
  const actions = data.actionItems || { urgent: [], highPriority: [], mediumPriority: [] };
  const recs = data.strategicRecommendations || [];

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-teal-800">Executive Summary Report</h1>
      <div className="text-sm text-gray-500">Generated: {new Date().toLocaleString()}</div>

      <div className="flex gap-4 mt-4">
        <div className="flex-1 bg-white border rounded p-4 text-center">
          <div className="text-xs text-gray-500">Portfolio Value</div>
          <div className="text-2xl font-bold">€{((key.portfolioValue || key.totalValue) / 1e9 || 0).toFixed(2)}B</div>
        </div>
        <div className="flex-1 bg-white border rounded p-4 text-center">
          <div className="text-xs text-gray-500">Compliance Rate</div>
          <div className="text-2xl font-bold">{key.complianceRate || 0}%</div>
        </div>
        <div className="flex-1 bg-white border rounded p-4 text-center">
          <div className="text-xs text-gray-500">At-Risk Loans</div>
          <div className="text-2xl font-bold">{key.atRiskCount || key.atRisk || 0}</div>
        </div>
        <div className="flex-1 bg-white border rounded p-4 text-center">
          <div className="text-xs text-gray-500">Green Exposure</div>
          <div className="text-2xl font-bold">{key.greenPct || 0}%</div>
        </div>
      </div>

      <div className="mt-6 bg-gray-50 p-4 rounded">
        <h3 className="font-semibold">Portfolio Overview</h3>
        <p className="text-sm">{data.overviewText || `Our portfolio of €${((key.portfolioValue||key.totalValue) || 0).toLocaleString()} across ${(key.loanCount||0)} loans is currently ${key.complianceRate||0}% compliant. Renewable Energy sector represents ${key.renewablePct||0}% of portfolio with strong ESG performance.`}</p>
      </div>

      <h3 className="mt-6 font-semibold bg-red-100 p-2 rounded">CRITICAL RISKS (Top 3)</h3>
      <div className="space-y-3">
        {risks.slice(0,3).map((r, i) => (
          <div key={i} className="border border-red-200 bg-red-50 p-3 rounded">
            <div className="font-bold">{r.name || r.company || `Risk ${i+1}`}</div>
            <div className="text-sm">Description: {r.description || 'N/A'}</div>
            <div className="text-sm">Current Impact: {r.affected || r.affectedLoans || r.affectedCount || 0} loans affected, €{r.exposure || r.exposureM || 0}M exposure</div>
            <div className="text-sm">Severity: {r.severity || 'CRITICAL'}</div>
            <div className="text-sm">Probability: {r.probability || '-'}</div>
            <div className="text-sm">Recommended Action: {r.recommended || r.recommendation || '-'}</div>
          </div>
        ))}
      </div>

      <h3 className="mt-6 font-semibold bg-green-100 p-2 rounded">OPPORTUNITIES (Top 3)</h3>
      <div className="space-y-3">
        {opps.slice(0,3).map((o, i) => (
          <div key={i} className="border border-green-200 bg-green-50 p-3 rounded">
            <div className="font-bold">{o.name || o.company || `Opportunity ${i+1}`}</div>
            <div className="text-sm">Description: {o.description || '-'}</div>
            <div className="text-sm">Potential Benefit: {o.benefit || o.benefitEst || '-'}</div>
            <div className="text-sm">Timeline: {o.timeline || '-'}</div>
            <div className="text-sm">Required Investment: {o.investment || '-'}</div>
            <div className="text-sm">Expected ROI: {o.roi || '-'}</div>
          </div>
        ))}
      </div>

      <h3 className="mt-6 font-semibold">IMMEDIATE ACTION ITEMS</h3>
      <div className="space-y-2 text-sm">
        <div className="font-semibold">URGENT (This Week):</div>
        <ul className="list-disc ml-6">
          {(actions.urgent || []).map((a, i) => <li key={i}>{a.action || a}</li>)}
        </ul>

        <div className="font-semibold mt-2">HIGH PRIORITY (This Month):</div>
        <ul className="list-disc ml-6">{(actions.highPriority || []).map((a,i) => <li key={i}>{a.action || a}</li>)}</ul>

        <div className="font-semibold mt-2">MEDIUM PRIORITY (This Quarter):</div>
        <ul className="list-disc ml-6">{(actions.mediumPriority || []).map((a,i) => <li key={i}>{a.action || a}</li>)}</ul>
      </div>

      <h3 className="mt-6 font-semibold">STRATEGIC RECOMMENDATIONS</h3>
      <div className="space-y-3 text-sm">
        {recs.map((r, i) => (
          <div key={i} className="border rounded p-3">
            <div className="font-bold">{r.name}</div>
            <div className="text-sm">What: {r.description || '-'}</div>
            <div className="text-sm">Investment: {r.investment || '-'}</div>
            <div className="text-sm">Timeline: {r.timeline || '-'}</div>
            <div className="text-sm">Expected ROI: {r.roi || '-'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
