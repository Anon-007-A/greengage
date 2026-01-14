/**
 * Status Banner Component
 * Displays portfolio-wide breach and at-risk summary at the top of dashboard
 * Uses centralized portfolio status for consistency
 */
import { AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import { GreenLoan } from '@/types/greenLoan';
import { usePortfolioStatus } from '@/hooks/usePortfolioStatus';
import { calculatePortfolioHeatIndex, getHeatIndexColors } from '@/lib/portfolioHeatIndex';
import { cn } from '@/lib/utils';

interface StatusBannerProps {
  loans: GreenLoan[];
  ebitdaDropPercent: number;
  interestRateHikeBps: number;
}

const StatusBanner = ({ loans, ebitdaDropPercent, interestRateHikeBps }: StatusBannerProps) => {
  const portfolioStatus = usePortfolioStatus(loans, ebitdaDropPercent, interestRateHikeBps);
  const {
    breachedLoanCount,
    atRiskLoanCount,
    totalLoanCount,
    totalBreaches,
    totalAtRisk
  } = portfolioStatus;

  // Calculate Portfolio Heat Index
  const heatMetrics = calculatePortfolioHeatIndex(loans, ebitdaDropPercent, interestRateHikeBps);
  const heatColors = getHeatIndexColors(heatMetrics.riskLevel);

  const hasActiveScenario = ebitdaDropPercent > 0 || interestRateHikeBps > 0;

  // Determine banner severity based on actual status (not just scenario)
  const getBannerSeverity = () => {
    if (breachedLoanCount > 0) return 'critical';
    if (atRiskLoanCount > 0) return 'warning';
    return 'safe';
  };

  const severity = getBannerSeverity();

  const getBannerContent = () => {
    // Baseline scenario (no stress parameters) - but check actual status
    if (!hasActiveScenario) {
      if (breachedLoanCount === 0 && atRiskLoanCount === 0) {
        return {
          icon: CheckCircle2,
          title: 'Portfolio Status: Baseline',
          message: `All ${totalLoanCount} loans are compliant under current conditions. Adjust stress test parameters to simulate scenarios.`,
          bgColor: 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900',
          textColor: 'text-green-800 dark:text-green-200',
          iconColor: 'text-green-600 dark:text-green-400'
        };
      } else {
        // Baseline has issues
        return {
          icon: breachedLoanCount > 0 ? AlertTriangle : AlertCircle,
          title: `Portfolio Status: Baseline - ${breachedLoanCount > 0 ? `${breachedLoanCount} Breached` : `${atRiskLoanCount} At Risk`}`,
          message: `Under current conditions: ${breachedLoanCount} of ${totalLoanCount} loan${breachedLoanCount !== 1 ? 's are' : ' is'} breached${breachedLoanCount > 0 && atRiskLoanCount > 0 ? ' and' : ''}${atRiskLoanCount > 0 ? ` ${atRiskLoanCount} ${atRiskLoanCount === 1 ? 'is' : 'are'} at risk` : ''}. Adjust stress test parameters to explore different scenarios.`,
          bgColor: breachedLoanCount > 0 
            ? 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-900'
            : 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-300 dark:border-yellow-900',
          textColor: breachedLoanCount > 0 
            ? 'text-red-900 dark:text-red-100'
            : 'text-yellow-900 dark:text-yellow-100',
          iconColor: breachedLoanCount > 0 
            ? 'text-red-600 dark:text-red-400'
            : 'text-yellow-600 dark:text-yellow-400'
        };
      }
    }

    // Active stress scenario
    if (severity === 'critical') {
      return {
        icon: AlertTriangle,
        title: `⚠️ ${breachedLoanCount}/${totalLoanCount} Loans Breached`,
        message: `${totalBreaches} covenant breach${totalBreaches !== 1 ? 'es' : ''} detected across ${breachedLoanCount} loan${breachedLoanCount !== 1 ? 's' : ''}. ${atRiskLoanCount > 0 ? `${atRiskLoanCount} additional loan${atRiskLoanCount !== 1 ? 's' : ''} at risk.` : ''}`,
        bgColor: 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-900',
        textColor: 'text-red-900 dark:text-red-100',
        iconColor: 'text-red-600 dark:text-red-400'
      };
    }

    if (severity === 'warning') {
      return {
        icon: AlertCircle,
        title: `${atRiskLoanCount}/${totalLoanCount} Loans At Risk`,
        message: `${totalAtRisk} covenant${totalAtRisk !== 1 ? 's' : ''} within 10% of breach threshold${totalAtRisk !== 1 ? 's' : ''} across ${atRiskLoanCount} loan${atRiskLoanCount !== 1 ? 's' : ''}. Monitor closely.`,
        bgColor: 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-300 dark:border-yellow-900',
        textColor: 'text-yellow-900 dark:text-yellow-100',
        iconColor: 'text-yellow-600 dark:text-yellow-400'
      };
    }

    return {
      icon: CheckCircle2,
      title: 'All Loans Compliant Under Stress',
      message: `All ${totalLoanCount} loans remain within covenant limits under this scenario.`,
      bgColor: 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900',
      textColor: 'text-green-800 dark:text-green-200',
      iconColor: 'text-green-600 dark:text-green-400'
    };
  };

  const banner = getBannerContent();
  const Icon = banner.icon;

  return (
    <div
      className={cn(
        'rounded-lg border-2 p-4 mb-6 animate-fade-in-up',
        banner.bgColor,
        banner.textColor
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className={cn('w-6 h-6 mt-0.5 flex-shrink-0', banner.iconColor)} />
        <div className="flex-1">
          <h2 className="font-display text-lg font-bold mb-1">{banner.title}</h2>
          <p className="text-sm opacity-90 mb-3">{banner.message}</p>

          {/* Portfolio Heat Index Gauge */}
          <div className={cn(
            'rounded-lg p-3 border',
            heatColors.bg,
            heatColors.border,
            heatColors.text
          )}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-xs font-semibold mb-1">Portfolio Heat Index</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-white/30 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full", heatColors.indicator)}
                      style={{ width: `${Math.min(heatMetrics.heatIndex, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold">{heatMetrics.heatIndex}/100</span>
                </div>
              </div>
              <div className="text-right text-xs">
                <p className="font-semibold capitalize">{heatMetrics.riskLevel}</p>
                <p className="opacity-75 text-xs mt-1">
                  Breach: {heatMetrics.breachRatio.toFixed(0)}<br/>
                  At-Risk: {heatMetrics.atRiskRatio.toFixed(0)}<br/>
                  Cushion: {heatMetrics.cushionRatio.toFixed(0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusBanner;

