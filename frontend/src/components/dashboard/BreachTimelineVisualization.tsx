/**
 * Breach Timeline Visualization
 * Gantt-style horizontal timeline showing loan breach timelines
 * Real-time updates as stress test parameters change
 */
import { useMemo } from 'react';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { GreenLoan } from '@/types/greenLoan';
import { predictPortfolioBreachTimelines } from '@/utils/breachTimelinePredictor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, TrendingDown } from 'lucide-react';

interface BreachTimelineProps {
  loans?: GreenLoan[];
  ebitdaDropPercent?: number;
  interestRateHikeBps?: number;
}

interface TimelineItem {
  loanId: string;
  loanName: string;
  status: 'SAFE' | 'AT_RISK' | 'BREACHED';
  daysToBreak: number | null;
  breachMargin: number;
}

export function BreachTimeline({ loans, ebitdaDropPercent, interestRateHikeBps }: BreachTimelineProps) {
  const { loans: ctxLoans, simulation } = usePortfolio();
  // If props not provided, fall back to canonical context values
  const effectiveLoans = loans && loans.length ? loans : (ctxLoans as GreenLoan[]);
  const effectiveEbitda = typeof ebitdaDropPercent === 'number' ? ebitdaDropPercent : (simulation?.ebitdaDrop || 0);
  const effectiveRateHike = typeof interestRateHikeBps === 'number' ? interestRateHikeBps : (simulation?.interestRateHike || 0);
  // Use the predictor to generate timelines (single source of truth for breach timing)
  const timelines = useMemo(() => {
    return predictPortfolioBreachTimelines(effectiveLoans, {
      ebitdaDrop: effectiveEbitda,
      rateHike: effectiveRateHike,
    });
  }, [effectiveLoans, effectiveEbitda, effectiveRateHike]);

  // Map timelines into per-loan items (choose most urgent covenant per loan)
  const timelineItems: TimelineItem[] = useMemo(() => {
    const byLoan = new Map<string, TimelineItem[]>();
    timelines.forEach(t => {
      const days = t.estimatedWeeksToBreachQuarterly > 0 ? Math.round(t.estimatedWeeksToBreachQuarterly * 7) : null;
      const item: TimelineItem = {
        loanId: t.loanId,
        loanName: t.company,
        status: t.actionUrgency === 'LOW' ? 'SAFE' : (t.actionUrgency === 'IMMEDIATE' || t.actionUrgency === 'HIGH' ? (t.estimatedWeeksToBreachQuarterly <= 12 ? 'AT_RISK' : 'AT_RISK') : 'AT_RISK'),
        daysToBreak: days,
        breachMargin: t.cushionPercent || 0,
      };
      const arr = byLoan.get(t.loanId) || [];
      arr.push(item);
      byLoan.set(t.loanId, arr);
    });

    const collapsed: TimelineItem[] = [];
    byLoan.forEach((items) => {
      // choose most urgent (smallest days, or breached) item
      items.sort((a, b) => {
        if (a.daysToBreak === null) return 1;
        if (b.daysToBreak === null) return -1;
        return a.daysToBreak - b.daysToBreak;
      });
      collapsed.push(items[0]);
    });

    // Sort by urgency: smallest days first
    return collapsed.sort((a, b) => {
      if (a.daysToBreak === null) return 1;
      if (b.daysToBreak === null) return -1;
      return a.daysToBreak - b.daysToBreak;
    });
  }, [timelines]);

  // Get zones for the timeline (0-90 days)
  const maxDays = 90;
  const breakdownZones = [
    { label: 'Critical', range: [0, 30], color: 'bg-red-500' },
    { label: 'Warning', range: [30, 60], color: 'bg-amber-500' },
    { label: 'Safe', range: [60, 90], color: 'bg-green-500' },
  ];

  const getBarColor = (status: string, daysToBreak: number | null): string => {
    if (status === 'BREACHED') return 'bg-red-600';
    if (status === 'AT_RISK' && daysToBreak !== null) {
      if (daysToBreak <= 30) return 'bg-red-500';
      if (daysToBreak <= 60) return 'bg-amber-500';
      return 'bg-yellow-500';
    }
    return 'bg-green-500';
  };

  const getStatusLabel = (status: string): string => {
    return status === 'AT_RISK' ? 'At Risk' : status;
  };

  const hasAnyBreaches = timelineItems.some(item => item.status !== 'SAFE');

  return (
    <Card className="mt-6 border-0 shadow-md">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-amber-600" />
              Covenant Breach Timeline
            </CardTitle>
            <CardDescription className="mt-1">
                {effectiveEbitda > 0 || effectiveRateHike > 0
                ? `Under current stress scenario: ${effectiveEbitda}% EBITDA drop, +${effectiveRateHike} bps rates`
                : 'Baseline scenario (0% stress). Adjust parameters above to explore scenarios.'}
            </CardDescription>
          </div>
          <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded">
            <strong>{timelineItems.filter(t => t.status !== 'SAFE').length}</strong> loans at risk
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Legend */}
        <div className="flex flex-wrap gap-4 pb-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-600 rounded-full"></div>
            <span className="text-sm font-medium">Breached</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-sm font-medium">0-30 days</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
            <span className="text-sm font-medium">30-60 days</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-sm font-medium">60-90 days</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium">Safe (&gt;90 days)</span>
          </div>
        </div>

        {/* Timeline Grid */}
        {hasAnyBreaches || ebitdaDropPercent > 0 || interestRateHikeBps > 0 ? (
          <div className="space-y-3">
            {timelineItems.map((item) => {
              const percentage = item.daysToBreak 
                ? Math.min((item.daysToBreak / maxDays) * 100, 100)
                : 100;
              
              return (
                <div key={item.loanId} className="space-y-1">
                  {/* Loan name and status */}
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="font-medium text-gray-900 truncate">{item.loanName}</p>
                      <p className="text-xs text-gray-600">
                        {item.status === 'BREACHED' && '🚨 Covenant breached'}
                        {item.status === 'AT_RISK' && item.daysToBreak && `⚠️ Breach in ${Math.round(item.daysToBreak)} days`}
                        {item.status === 'SAFE' && '✓ Compliant'}
                      </p>
                    </div>
                    
                    {/* Status badge */}
                    <div className="flex-shrink-0">
                      {item.status === 'BREACHED' && (
                        <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded-full border border-red-300">
                          Breached
                        </span>
                      )}
                      {item.status === 'AT_RISK' && (
                        <span className="px-2 py-1 text-xs font-semibold bg-amber-100 text-amber-800 rounded-full border border-amber-300">
                          At Risk
                        </span>
                      )}
                      {item.status === 'SAFE' && (
                        <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full border border-green-300">
                          Safe
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Timeline bar */}
                  <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                    {/* Background zones */}
                    <div className="absolute inset-0 flex">
                      <div className="flex-1 opacity-10 bg-red-500"></div>
                      <div className="flex-1 opacity-10 bg-amber-500"></div>
                      <div className="flex-1 opacity-10 bg-green-500"></div>
                    </div>

                    {/* Zone labels */}
                    <div className="absolute inset-0 flex text-xs font-semibold text-gray-400 px-2 pointer-events-none">
                      <div className="flex-1 flex items-center">0-30d</div>
                      <div className="flex-1 flex items-center justify-center">30-60d</div>
                      <div className="flex-1 flex items-center justify-end">60-90d+</div>
                    </div>

                    {/* Progress bar */}
                    {item.daysToBreak !== null && (
                      <div
                        className={`h-full ${getBarColor(item.status, item.daysToBreak)} transition-all duration-300 rounded-lg flex items-center justify-end pr-2`}
                        style={{ width: `${percentage}%` }}
                        title={`${Math.round(item.daysToBreak)} days to breach`}
                      >
                        <span className="text-xs font-bold text-white drop-shadow-sm">
                          {item.status === 'BREACHED' ? '✕' : Math.round(item.daysToBreak)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty state */
          <div className="py-12 text-center">
            <div className="text-gray-400 mb-2">
              <AlertTriangle className="w-8 h-8 mx-auto opacity-50 mb-2" />
            </div>
            <p className="text-gray-600 font-medium">No urgent breaches predicted</p>
            <p className="text-gray-500 text-sm mt-1">
              All loans are compliant. Use stress test sliders to explore scenarios and see projected breach timelines.
            </p>
          </div>
        )}

        {/* Summary stats */}
        {hasAnyBreaches && (
          <div className="pt-4 border-t">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                <p className="text-xs text-gray-600 font-medium">Breached</p>
                <p className="text-lg font-bold text-red-600">
                  {timelineItems.filter(t => t.status === 'BREACHED').length}
                </p>
              </div>
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                <p className="text-xs text-gray-600 font-medium">At Risk</p>
                <p className="text-lg font-bold text-amber-600">
                  {timelineItems.filter(t => t.status === 'AT_RISK').length}
                </p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                <p className="text-xs text-gray-600 font-medium">Safe</p>
                <p className="text-lg font-bold text-green-600">
                  {timelineItems.filter(t => t.status === 'SAFE').length}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
