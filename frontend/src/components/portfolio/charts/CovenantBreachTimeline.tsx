/**
 * Covenant Breach Timeline (redesigned)
 * Metrics row, stacked area timeline, legend, and collapsible affected loans list.
 */

import { useState, useMemo } from 'react';
import { usePortfolio } from '@/contexts/PortfolioContext';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronDown, ChevronUp } from 'lucide-react';

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

const clamp = (v: number, a = 0, b = 11) => Math.max(a, Math.min(b, v));
const fmt = (n: any) => `${Math.round(Number(n ?? 0))}`;

const CovenantBreachTimeline = () => {
  const { loans = [], simulation } = usePortfolio();
  const [expanded, setExpanded] = useState(false);

  const ebitdaDrop = simulation?.ebitdaDrop ?? 0;
  const rateHike = simulation?.interestRateHike ?? 0;

  const { monthsData, totals, affectedList } = useMemo(() => {
    try {
      const months = Array.from({ length: 12 }).map((_, i) => ({ name: MONTHS[i], breached: 0, urgent: 0, warning: 0, safe: 0, companies: [] as string[] }));
      const affected: any[] = [];

      loans.forEach((loan: any) => {
        const covs = loan.covenants || [];
        let minDays = Infinity;

        covs.forEach((cov: any) => {
          const threshold = Number(cov.threshold ?? cov.limit ?? 0) || 0;
          const current = Number(cov.current ?? cov.currentValue ?? cov.stressedValue ?? 0) || 0;
          let monthlyDeclineRate = 0;
          if (Array.isArray(cov.trend) && cov.trend.length >= 2) {
            const first = Number(cov.trend[0] ?? 0);
            const last = Number(cov.trend[cov.trend.length - 1] ?? 0);
            monthlyDeclineRate = Math.abs((last - first) / Math.max(1, cov.trend.length - 1));
          }
          if (!monthlyDeclineRate || monthlyDeclineRate <= 0) monthlyDeclineRate = 0.01;
          // raw days (can be negative if already breached)
          const rawDays = (threshold - current) / (monthlyDeclineRate * 30.44);
          // days to breach from now (non-negative for display) but keep rawDays for breached detection
          const days = Number.isFinite(rawDays) ? rawDays : 9999;
          if (days < minDays) minDays = days;
        });

        const raw = isFinite(minDays) ? minDays : 9999;
        const daysToBreach = Math.max(0, Math.round(raw));
        const status = raw <= 0 ? 'breached' : daysToBreach <= 30 ? 'urgent' : daysToBreach <= 90 ? 'warning' : 'safe';
        const monthIndex = clamp(Math.floor(Math.max(0, daysToBreach) / 30));
        const bucket = months[monthIndex];
        if (status === 'breached') bucket.breached += 1;
        else if (status === 'urgent') bucket.urgent += 1;
        else if (status === 'warning') bucket.warning += 1;
        else bucket.safe += 1;
        if (bucket.companies.length < 10) bucket.companies.push(loan.companyName ?? loan.company ?? 'Unknown');

        affected.push({ id: loan.id, company: loan.companyName ?? loan.company ?? 'Unknown', daysToBreach, status, severity: Math.round(loan.riskScore?.overall ?? 0) });
      });

      const totals = { breached: 0, urgent: 0, warning: 0, safe: 0, recoveryDays: 0 } as any;
      months.forEach(m => { totals.breached += m.breached; totals.urgent += m.urgent; totals.warning += m.warning; totals.safe += m.safe; });
      const posDays = affected.filter(a => a.daysToBreach > 0).map(a => a.daysToBreach);
      totals.recoveryDays = posDays.length ? Math.round(posDays.reduce((s, v) => s + v, 0) / posDays.length) : 0;

      affected.sort((a, b) => a.daysToBreach - b.daysToBreach);
      return { monthsData: months, totals, affectedList: affected };
    } catch (e) {
      return { monthsData: [], totals: { breached: 0, urgent: 0, warning: 0, safe: 0, recoveryDays: 0 }, affectedList: [] };
    }
  }, [loans, ebitdaDrop, rateHike]);

  if (!monthsData || monthsData.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="font-semibold text-gray-800">Covenant Breach Timeline</div>
        <div className="text-sm text-gray-600 mt-3">No breach data</div>
      </div>
    );
  }

  const chartData = monthsData.map((m: any) => ({ name: m.name, breached: m.breached || 0, urgent: m.urgent || 0, warning: m.warning || 0, safe: m.safe || 0, companies: m.companies }));
  const maxY = Math.max(100, ...chartData.map((d: any) => d.breached + d.urgent + d.warning + d.safe));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const p = payload[0].payload;
    return (
      <div className="bg-white p-3 rounded shadow-sm border">
        <div className="font-semibold text-gray-800">{label}</div>
        <div className="text-sm mt-1">{`${p.breached} breached, ${p.urgent} 0-30d, ${p.warning} 30-90d, ${p.safe} safe`}</div>
        {p.companies && p.companies.length > 0 && (
          <div className="text-xs mt-2 text-gray-600">Affected: {p.companies.join(', ')}</div>
        )}
      </div>
    );
  };

  return (
    <div id="chart-covenant-breach" className="bg-white p-6 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Covenant Breach Timeline</h3>
          <p className="text-sm text-gray-600">Under current stress: {ebitdaDrop}% EBITDA, {rateHike}bps rates</p>
        </div>
        <div className="grid grid-cols-4 gap-3 w-1/2">
          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <div className="p-3 rounded border bg-red-50 hover:shadow-glow transition-shadow cursor-help">
                  <div className="text-xs text-gray-600">Breached Loans</div>
                  <div className="text-2xl font-bold text-[#DC3545]">{fmt(totals.breached)}</div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm font-medium">Breached</div>
                <div className="text-xs text-muted-foreground">Loans already below covenant thresholds.</div>
              </TooltipContent>
            </UITooltip>

            <UITooltip>
              <TooltipTrigger asChild>
                <div className="p-3 rounded border bg-orange-50 hover:shadow-glow transition-shadow cursor-help">
                  <div className="text-xs text-gray-600">At Risk (0-30d)</div>
                  <div className="text-2xl font-bold text-[#FFC107]">{fmt(totals.urgent)}</div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm font-medium">High risk</div>
                <div className="text-xs text-muted-foreground">Loans likely to breach within 30 days.</div>
              </TooltipContent>
            </UITooltip>

            <UITooltip>
              <TooltipTrigger asChild>
                <div className="p-3 rounded border bg-yellow-50 hover:shadow-glow transition-shadow cursor-help">
                  <div className="text-xs text-gray-600">Warning (30-90d)</div>
                  <div className="text-2xl font-bold text-[#FFD700]">{fmt(totals.warning)}</div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm font-medium">Warning</div>
                <div className="text-xs text-muted-foreground">Loans trending toward breach within 30–90 days.</div>
              </TooltipContent>
            </UITooltip>

            <UITooltip>
              <TooltipTrigger asChild>
                <div className="p-3 rounded border bg-green-50 hover:shadow-glow transition-shadow cursor-help">
                  <div className="text-xs text-gray-600">Safe</div>
                  <div className="text-2xl font-bold text-[#28A745]">{fmt(totals.safe)}</div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm font-medium">Safe</div>
                <div className="text-xs text-muted-foreground">Loans not expected to breach in the next 90 days.</div>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        </div>
      </div>

      <div style={{ height: 350 }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
            <CartesianGrid stroke="#f3f4f6" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, Math.ceil(maxY)]} tick={{ fontSize: 12 }} />
            <RechartsTooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" />
            <Area type="monotone" dataKey="safe" stackId="1" fill="#28A745" stroke="#28A745" />
            <Area type="monotone" dataKey="warning" stackId="1" fill="#FFD700" stroke="#FFD700" />
            <Area type="monotone" dataKey="urgent" stackId="1" fill="#FFC107" stroke="#FFC107" />
            <Area type="monotone" dataKey="breached" stackId="1" fill="#DC3545" stroke="#DC3545" />
            <Line type="monotone" dataKey="breached" stroke="#8B0000" strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm"><span className="w-3 h-3 rounded-full bg-[#DC3545] inline-block"/> Breached</div>
          <div className="flex items-center gap-2 text-sm"><span className="w-3 h-3 rounded-full bg-[#FFC107] inline-block"/> 0-30 Days</div>
          <div className="flex items-center gap-2 text-sm"><span className="w-3 h-3 rounded-full bg-[#FFD700] inline-block"/> 30-90 Days</div>
          <div className="flex items-center gap-2 text-sm"><span className="w-3 h-3 rounded-full bg-[#28A745] inline-block"/> Safe</div>
        </div>
        <div className="text-sm text-gray-600">Current Scenario: {ebitdaDrop}% EBITDA, {rateHike}bps rates</div>
      </div>

      <div className="mt-6 border-t pt-4">
        <button className="flex items-center justify-between w-full" onClick={() => setExpanded(!expanded)}>
          <div className="text-sm font-semibold">Top Affected Loans ({affectedList.length})</div>
          <div className="text-sm text-gray-600 flex items-center gap-2">
            <span>Show</span>
            {expanded ? <ChevronUp /> : <ChevronDown />}
          </div>
        </button>

        {expanded && (
          <div className="mt-3 max-h-64 overflow-y-auto border rounded">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="p-2 text-left">Company</th>
                  <th className="p-2 text-right">Days</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-right">Severity</th>
                </tr>
              </thead>
              <tbody>
                {affectedList.slice(0, 10).map((row: any) => (
                  <tr key={row.id} className={`${row.status === 'breached' ? 'bg-red-50' : row.status === 'urgent' ? 'bg-orange-50' : row.status === 'warning' ? 'bg-yellow-50' : ''} hover:shadow-glow transition-shadow`}> 
                    <td className="p-2">
                      <TooltipProvider>
                        <UITooltip>
                          <TooltipTrigger asChild>
                            <div className="cursor-help underline decoration-dotted decoration-muted/40">{row.company}</div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-sm font-medium">{row.company}</div>
                            <div className="text-xs text-muted-foreground">Status: {row.status} • Days to breach: {fmt(row.daysToBreach)}</div>
                          </TooltipContent>
                        </UITooltip>
                      </TooltipProvider>
                    </td>
                    <td className="p-2 text-right">{fmt(row.daysToBreach)}</td>
                    <td className="p-2">{row.status}</td>
                    <td className="p-2 text-right">{row.severity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CovenantBreachTimeline;
