/**
 * Risk Heatmap Component
 * Enhanced visual grid showing loan statuses with covenant metrics and AI-powered insights
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GreenLoan } from '@/types/greenLoan';
import { usePortfolioStatus } from '@/hooks/usePortfolioStatus';
import { generateBreachInsight } from '@/lib/aiInsightsService';
import { calculateBaselineGreenScore } from '@/lib/greenScore';
import { calculateOverallLoanSeverity } from '@/lib/breachCalculator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, AlertCircle, Loader2, Lightbulb } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { logger } from '@/lib/logger';

interface RiskHeatmapProps {
  loans: GreenLoan[];
  ebitdaDropPercent: number;
  interestRateHikeBps: number;
  onLoanClick?: (loanId: string) => void;
}

/**
 * Individual heatmap tile with AI Insights
 */
const HeatmapTile = ({
  loan,
  status,
  breachCount,
  atRiskCount,
  worstCovenant,
  covenants,
  closestCov,
  onLoanClick,
  formatCurrency,
  getTileColor,
  getStatusLabel,
  ebitdaDropPercent,
  interestRateHikeBps
}: any) => {
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  const loadAIInsight = async () => {
    if (insight) return; // Already loaded
    if (!closestCov || (status === 'SAFE')) return; // No insight needed for safe loans

    setLoadingInsight(true);
    try {
      const baselineScore = calculateBaselineGreenScore(loan);
      const severity = calculateOverallLoanSeverity(loan.covenants, ebitdaDropPercent, interestRateHikeBps);
      const esgCategory = baselineScore >= 80 ? 'Dark Green' : baselineScore >= 50 ? 'Light Green' : 'Transition';

      const result = await generateBreachInsight(
        loan.id,
        loan.companyName,
        closestCov.name,
        closestCov.stressedValue,
        closestCov.threshold,
        loan.sector,
        loan.loanAmount,
        esgCategory,
        severity
      );

      setInsight(result.summary);
    } catch (error) {
      logger.error('Error loading AI insight:', error);
    } finally {
      setLoadingInsight(false);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onLoanClick}
          className={cn(
            'relative w-full rounded-lg border-2 p-4 transition-all hover:scale-[1.02] hover:shadow-lg cursor-pointer',
            'flex items-center gap-4 text-left',
            getTileColor(status)
          )}
        >
          {/* Colored indicator bar (left) */}
          <div
            className={cn(
              'w-2 h-full rounded-l absolute left-0 top-0',
              status === 'BREACHED' ? 'bg-red-700' :
              status === 'AT_RISK' ? 'bg-yellow-700' :
              'bg-green-700'
            )}
          />

          {/* Middle: Company info and status */}
          <div className="flex-1 ml-2">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-white font-semibold text-base">
                  {loan.companyName}
                </p>
                <p className="text-white/80 text-sm">
                  {formatCurrency(loan.loanAmount)}
                </p>
              </div>
              <div
                className={cn(
                  'px-3 py-1 rounded text-sm font-medium',
                  status === 'BREACHED'
                    ? 'bg-red-600/30 text-white border border-red-300'
                    : status === 'AT_RISK'
                    ? 'bg-yellow-600/30 text-white border border-yellow-300'
                    : 'bg-green-600/30 text-white border border-green-300'
                )}
              >
                {getStatusLabel(status, breachCount, atRiskCount)}
              </div>
            </div>

            {/* Covenant metrics */}
            {closestCov && (
              <div className="mt-2 pt-2 border-t border-white/20">
                <p className="text-white/90 text-xs">
                  <span className="font-medium">{closestCov.name}:</span>{' '}
                  {closestCov.stressedValue.toFixed(2)}{closestCov.unit} / {closestCov.threshold.toFixed(2)}{closestCov.unit}
                  {closestCov.cushionPercent > 0 && (
                    <span className="ml-2">
                      ({closestCov.cushionPercent.toFixed(1)}% cushion)
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* AI Insights Indicator */}
          {status !== 'SAFE' && (
            <div className="flex-shrink-0">
              <Lightbulb className="w-5 h-5 text-yellow-300 animate-pulse" />
            </div>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-sm">
        <div className="space-y-3">
          <div>
            <p className="font-semibold text-sm">{loan.companyName}</p>
            <p className="text-xs text-muted-foreground">{loan.sector}</p>
            <p className="text-xs text-muted-foreground mt-1">Loan: {formatCurrency(loan.loanAmount)}</p>
          </div>

          <div className="pt-2 border-t border-border">
            <p className="text-xs font-medium mb-2">
              Status: {status === 'BREACHED' ? '🔴 Breached' : status === 'AT_RISK' ? '🟡 At Risk' : '🟢 Safe'}
            </p>

            {covenants.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground mb-1">Covenant Metrics:</p>
                {covenants.slice(0, 2).map((cov: any) => (
                  <div key={cov.id} className="text-xs">
                    <p className="font-medium">{cov.name}:</p>
                    <p className="text-muted-foreground ml-2">
                      {cov.stressedValue.toFixed(2)}{cov.unit}
                      {' '}(threshold: {cov.threshold.toFixed(2)}{cov.unit})
                      {' '}
                      <span
                        className={cn(
                          cov.isBreached ? 'text-red-400' :
                          cov.isAtRisk ? 'text-yellow-400' :
                          'text-green-400'
                        )}
                      >
                        [{cov.isBreached ? 'Breached' : cov.isAtRisk ? 'At Risk' : 'Safe'}]
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* AI Insights Section */}
            {status !== 'SAFE' && (
              <div className="mt-3 pt-3 border-t border-border">
                <button
                  onClick={loadAIInsight}
                  className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 mb-2"
                  disabled={loadingInsight}
                >
                  {loadingInsight ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Generating insight...
                    </>
                  ) : insight ? (
                    <>
                      <Lightbulb className="w-3 h-3" />
                      AI Insight
                    </>
                  ) : (
                    <>
                      <Lightbulb className="w-3 h-3" />
                      Get AI Insight
                    </>
                  )}
                </button>
                {insight && (
                  <p className="text-xs text-muted-foreground italic bg-blue-50 dark:bg-blue-950/20 p-2 rounded border border-blue-200 dark:border-blue-900">
                    💡 {insight}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

const RiskHeatmap = ({ loans, ebitdaDropPercent, interestRateHikeBps, onLoanClick }: RiskHeatmapProps) => {
  // Use centralized portfolio status
  const portfolioStatus = usePortfolioStatus(loans, ebitdaDropPercent, interestRateHikeBps);
  const loanStatuses = portfolioStatus.loans;
  const { safeLoanCount, atRiskLoanCount, breachedLoanCount, totalLoanCount } = portfolioStatus;

  const getTileColor = (status: 'BREACHED' | 'AT_RISK' | 'SAFE') => {
    switch (status) {
      case 'BREACHED':
        return 'bg-red-500 hover:bg-red-600 border-red-700';
      case 'AT_RISK':
        return 'bg-yellow-500 hover:bg-yellow-600 border-yellow-700';
      default:
        return 'bg-green-500 hover:bg-green-600 border-green-700';
    }
  };

  const getStatusLabel = (status: 'BREACHED' | 'AT_RISK' | 'SAFE', breachCount: number, atRiskCount: number) => {
    switch (status) {
      case 'BREACHED':
        return breachCount > 1 ? `Breached (${breachCount})` : 'Breached';
      case 'AT_RISK':
        return atRiskCount > 1 ? `At Risk (${atRiskCount})` : 'At Risk';
      default:
        return 'Safe';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  };

  // Get closest covenant to breach for display
  const getClosestCovenant = (loanStatus: typeof loanStatuses[0]) => {
    if (!loanStatus.covenants || loanStatus.covenants.length === 0) return null;

    const sorted = [...loanStatus.covenants].sort((a, b) => {
      const aCushion = Math.abs(a.cushionPercent);
      const bCushion = Math.abs(b.cushionPercent);
      return aCushion - bCushion;
    });

    return sorted[0];
  };

  // Prepare chart data for portfolio composition
  const chartData = [
    { name: 'Safe', value: safeLoanCount, color: '#22c55e' },
    { name: 'At Risk', value: atRiskLoanCount, color: '#eab308' },
    { name: 'Breached', value: breachedLoanCount, color: '#ef4444' },
  ];

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-start justify-between mb-3">
          <div>
            <CardTitle className="font-display text-xl">Risk Heatmap</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Visual overview of covenant status across portfolio. Hover for details and AI insights.
            </p>
          </div>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500 border-2 border-green-700"></div>
            <span className="text-xs text-muted-foreground">Safe</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-500 border-2 border-yellow-700"></div>
            <span className="text-xs text-muted-foreground">At Risk</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500 border-2 border-red-700"></div>
            <span className="text-xs text-muted-foreground">Breached</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <TooltipProvider>
          <div className="space-y-3">
            {loanStatuses.map((loanStatus) => {
              const { loan, status, breachCount, atRiskCount, worstCovenant, covenants } = loanStatus;
              const closestCov = getClosestCovenant(loanStatus);

              return (
                <HeatmapTile
                  key={loan.id}
                  loan={loan}
                  status={status}
                  breachCount={breachCount}
                  atRiskCount={atRiskCount}
                  worstCovenant={worstCovenant}
                  covenants={covenants}
                  closestCov={closestCov}
                  onLoanClick={() => onLoanClick?.(loan.id)}
                  formatCurrency={formatCurrency}
                  getTileColor={getTileColor}
                  getStatusLabel={getStatusLabel}
                  ebitdaDropPercent={ebitdaDropPercent}
                  interestRateHikeBps={interestRateHikeBps}
                />
              );
            })}
          </div>
        </TooltipProvider>

        {/* Mini Bar Chart: Portfolio Composition by Risk Status */}
        <div className="pt-4 border-t border-border">
          <h3 className="text-sm font-semibold mb-3">Portfolio Composition by Risk Status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" tick={{ fill: 'currentColor' }} className="text-xs" />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={80}
                tick={{ fill: 'currentColor' }}
                className="text-xs"
              />
              <RechartsTooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-background border border-border rounded-lg p-2 shadow-lg">
                        <p className="font-semibold text-sm">{data.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {data.value} loan{data.value !== 1 ? 's' : ''} ({Math.round((data.value / totalLoanCount) * 100)}% of portfolio)
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default RiskHeatmap;
