/**
 * Covenant Breach Timeline Chart
 * Horizontal stacked bar chart showing breach timeline distribution
 */
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, Cell, CartesianGrid } from 'recharts';
import { Tooltip as UITooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useState } from 'react';
import { usePortfolioStatus } from '@/hooks/usePortfolioStatus';
import { GreenLoan } from '@/types/greenLoan';

interface BreachTimelineChartProps {
  loans: GreenLoan[];
  ebitdaDropPercent: number;
  interestRateHikeBps: number;
  onLoanClick?: (id: string) => void;
}

const BreachTimelineChart = ({ loans, ebitdaDropPercent, interestRateHikeBps, onLoanClick }: BreachTimelineChartProps) => {
  const portfolioStatus = usePortfolioStatus(loans, ebitdaDropPercent, interestRateHikeBps);

  // Calculate timeline distribution
  const breached = portfolioStatus.breachedLoanCount;
  const atRisk0_30 = portfolioStatus.loans.filter(ls => {
    const closest = ls.covenants.find(c => c.isAtRisk && !c.isBreached);
    return closest && closest.cushionPercent < 5; // Very close to breach
  }).length;
  const atRisk30_60 = portfolioStatus.loans.filter(ls => {
    const closest = ls.covenants.find(c => c.isAtRisk && !c.isBreached);
    return closest && closest.cushionPercent >= 5 && closest.cushionPercent < 7;
  }).length;
  const atRisk60_90 = portfolioStatus.loans.filter(ls => {
    const closest = ls.covenants.find(c => c.isAtRisk && !c.isBreached);
    return closest && closest.cushionPercent >= 7 && closest.cushionPercent < 10;
  }).length;
  const safe = portfolioStatus.safeLoanCount;

  const data = [
    {
      category: 'Portfolio',
      breached,
      '0-30d': atRisk0_30,
      '30-60d': atRisk30_60,
      '60-90d': atRisk60_90,
      safe
    }
  ];

  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);
  const [hoveredLoan, setHoveredLoan] = useState<string | null>(null);

  const segmentInfo: Record<string, { label: string; action: string; meaning: string; color: string }> = {
    breached: { label: 'Breached', action: 'Immediate action: Restructure / recovery', meaning: 'Loans below covenant thresholds', color: '#DC3545' },
    '0-30d': { label: '0-30 Days', action: 'Monitor closely', meaning: 'High immediate risk', color: '#FF6B6B' },
    '30-60d': { label: '30-60 Days', action: 'Prepare engagement', meaning: 'Evolving risk', color: '#FF9F43' },
    '60-90d': { label: '60-90 Days', action: 'Quarterly review', meaning: 'Watchlist', color: '#FFD93D' },
    safe: { label: 'Safe', action: 'No immediate action', meaning: 'Within covenant limits', color: '#28A745' }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      // Show richer info per segment
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg max-w-xs">
          <p className="font-semibold text-sm mb-2">Covenant Status Distribution</p>
          {payload.map((entry: any, index: number) => {
            const key = entry.name;
            const info = segmentInfo[key] || { label: key, action: 'Review', meaning: '', color: entry.color };
            return (
              <div key={index} className="mb-1">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium" style={{ color: info.color }}>{info.label}</div>
                  <div className="text-sm">{entry.value} loans</div>
                </div>
                <div className="text-xs text-muted-foreground">{info.meaning} • Recommended: {info.action}</div>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <TooltipProvider>
      <div style={{ cursor: hoveredSegment ? 'pointer' : 'default' }}>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
        <XAxis 
          type="number" 
          stroke="#6B7280" 
          tick={{ fontSize: 12, fill: '#6B7280' }}
          axisLine={{ stroke: '#E5E7EB' }}
        />
        <YAxis 
          dataKey="category" 
          type="category" 
          stroke="#6B7280" 
          width={80}
          tick={{ fontSize: 12, fill: '#6B7280' }}
          axisLine={{ stroke: '#E5E7EB' }}
        />
          <Tooltip 
            content={<CustomTooltip />}
            wrapperStyle={{ backgroundColor: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: '8px' }}
          />
        <Legend 
          wrapperStyle={{ fontSize: '12px', color: '#6B7280' }}
          iconType="square"
        />
        <Bar
          dataKey="breached"
          stackId="a"
          fill="#DC3545"
          name="Breached"
          animationDuration={500}
          onMouseEnter={() => setHoveredSegment('breached')}
          onMouseLeave={() => setHoveredSegment(null)}
          fillOpacity={hoveredSegment && hoveredSegment !== 'breached' ? 0.6 : 1}
        />
        <Bar
          dataKey="0-30d"
          stackId="a"
          fill="#FF6B6B"
          name="0-30 days"
          animationDuration={500}
          onMouseEnter={() => setHoveredSegment('0-30d')}
          onMouseLeave={() => setHoveredSegment(null)}
          fillOpacity={hoveredSegment && hoveredSegment !== '0-30d' ? 0.6 : 1}
        />
        <Bar
          dataKey="30-60d"
          stackId="a"
          fill="#FF9F43"
          name="30-60 days"
          animationDuration={500}
          onMouseEnter={() => setHoveredSegment('30-60d')}
          onMouseLeave={() => setHoveredSegment(null)}
          fillOpacity={hoveredSegment && hoveredSegment !== '30-60d' ? 0.6 : 1}
        />
        <Bar
          dataKey="60-90d"
          stackId="a"
          fill="#FFD93D"
          name="60-90 days"
          animationDuration={500}
          onMouseEnter={() => setHoveredSegment('60-90d')}
          onMouseLeave={() => setHoveredSegment(null)}
          fillOpacity={hoveredSegment && hoveredSegment !== '60-90d' ? 0.6 : 1}
        />
        <Bar
          dataKey="safe"
          stackId="a"
          fill="#28A745"
          name="Safe"
          animationDuration={500}
          onMouseEnter={() => setHoveredSegment('safe')}
          onMouseLeave={() => setHoveredSegment(null)}
          fillOpacity={hoveredSegment && hoveredSegment !== 'safe' ? 0.6 : 1}
        />
      </BarChart>
      </ResponsiveContainer>

      {/* Interactive loan timeline list */}
      <div className="mt-4">
        <div className="text-sm text-gray-600 mb-2">Top loans timeline (hover for details, click to open)</div>
        <div className="grid gap-2 max-h-64 overflow-y-auto">
          {loans.slice(0, 50).map((loan) => {
            // derive daysToBreach from loan.covenants (use min)
            const covs = loan.covenants || [];
            const mins = covs.map((c: any) => c.daysToBreachEstimate ?? c.daysToBreach ?? 9999);
            const days = Math.min(...mins);
            const displayDays = Number.isFinite(days) ? Math.max(0, Math.round(days)) : 9999;
            const pct = Math.min(100, Math.round((displayDays / 120) * 100));
            const status = displayDays === 0 ? 'breached' : displayDays <= 30 ? 'urgent' : displayDays <= 60 ? '30-60d' : displayDays <= 90 ? '60-90d' : 'safe';
            const color = status === 'breached' ? '#DC3545' : status === 'urgent' ? '#FF6B6B' : status === '30-60d' ? '#FF9F43' : status === '60-90d' ? '#FFD93D' : '#28A745';
            const covenantRatio = covs.length ? (covs[0].current ?? covs[0].ratio ?? null) : null;

            return (
              <div key={loan.id} className={`flex items-center gap-3 p-2 rounded ${hoveredLoan === loan.id ? 'shadow-lg' : 'hover:shadow-md'} transition-shadow`} style={{ alignItems: 'center' }}>
                <div className="w-48 text-sm truncate" title={loan.companyName || loan.company || ''}>{loan.companyName || loan.company || 'Unnamed'}</div>

                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger asChild>
                        <div
                          role="button"
                          onClick={() => onLoanClick && onLoanClick(loan.id)}
                          onMouseEnter={() => setHoveredLoan(loan.id)}
                          onMouseLeave={() => setHoveredLoan(null)}
                          onDoubleClick={() => { /* noop */ }}
                          className="relative flex-1 h-3 rounded-full cursor-pointer"
                          onKeyDown={() => {}}
                          style={{ background: '#F3F4F6' }}
                        >
                        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 6 }} />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-sm font-medium">{loan.companyName || loan.company || 'Loan'}</div>
                      <div className="text-xs text-muted-foreground">{displayDays === 9999 ? 'No estimate' : `${displayDays} days remaining`}</div>
                      {covenantRatio != null && <div className="text-xs text-muted-foreground">Current covenant ratio: {String(covenantRatio)}</div>}
                      <div className="mt-2 text-xs"><button className="text-primary underline" onClick={() => onLoanClick && onLoanClick(loan.id)} >Open loan details</button></div>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>

                <div className="w-16 text-right text-sm text-gray-600">{displayDays === 9999 ? '—' : `${displayDays}d`}</div>
              </div>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default BreachTimelineChart;

