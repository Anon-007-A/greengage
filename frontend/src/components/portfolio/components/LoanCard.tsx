/**
 * Enhanced Loan Card Component
 * Rich details: Company, Value, Status, Covenant ratio, ESG score
 * White background with colored left border
 */
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GreenLoan } from '@/types/greenLoan';
import { usePortfolioStatus } from '@/hooks/usePortfolioStatus';
import { calculateStressedGreenScore, getESGCategory } from '@/lib/greenScore';
import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, AlertCircle, ArrowRight, X, Check } from 'lucide-react';

interface LoanCardProps {
  loan: GreenLoan;
  ebitdaDropPercent: number;
  interestRateHikeBps: number;
  onClick?: () => void;
  highlightQuery?: string;
}

const LoanCard = ({ loan, ebitdaDropPercent, interestRateHikeBps, onClick, highlightQuery }: LoanCardProps) => {
  const portfolioStatus = usePortfolioStatus([loan], ebitdaDropPercent, interestRateHikeBps);
  const loanStatus = portfolioStatus.loans[0];
  const greenScore = calculateStressedGreenScore(loan, ebitdaDropPercent, interestRateHikeBps);
  const esgCategory = getESGCategory(greenScore);

  const status = loanStatus?.status || 'SAFE';
  const breachCount = loanStatus?.breachCount || 0;
  const atRiskCount = loanStatus?.atRiskCount || 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'BREACHED':
        return {
          borderColor: '#DC3545',
          bgColor: 'bg-red-50 dark:bg-red-950/20',
          textColor: 'text-red-900 dark:text-red-100',
          icon: AlertTriangle,
          iconColor: 'text-red-600',
          badge: '🔴 Breached',
          badgeColor: 'bg-red-100 text-red-800 border-red-300'
        };
      case 'AT_RISK':
        return {
          borderColor: '#FF9F43',
          bgColor: 'bg-orange-50 dark:bg-orange-950/20',
          textColor: 'text-orange-900 dark:text-orange-100',
          icon: AlertCircle,
          iconColor: 'text-orange-600',
          badge: '🟡 At Risk',
          badgeColor: 'bg-orange-100 text-orange-800 border-orange-300'
        };
      default:
        return {
          borderColor: '#28A745',
          bgColor: 'bg-green-50 dark:bg-green-950/20',
          textColor: 'text-green-900 dark:text-green-100',
          icon: CheckCircle2,
          iconColor: 'text-green-600',
          badge: '🟢 Safe',
          badgeColor: 'bg-green-100 text-green-800 border-green-300'
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  // Get most critical covenant
  const criticalCovenant = loanStatus?.covenants
    .filter(c => c.isBreached || c.isAtRisk)
    .sort((a, b) => a.cushionPercent - b.cushionPercent)[0];

  // Calculate covenant ratio and percentage change
  const covenantRatio = criticalCovenant 
    ? `${criticalCovenant.stressedValue.toFixed(2)}x / ${criticalCovenant.threshold.toFixed(2)}x`
    : 'N/A';
  
  const covenantChange = criticalCovenant
    ? criticalCovenant.isBreached
      ? `-${Math.abs(criticalCovenant.breachMargin / criticalCovenant.threshold * 100).toFixed(1)}%`
      : `+${criticalCovenant.cushionPercent.toFixed(1)}%`
    : '';

  const getESGColor = () => {
    if (greenScore >= 80) return { color: '#28A745', label: 'Dark Green' };
    if (greenScore >= 50) return { color: '#66DD00', label: 'Light Green' };
    return { color: '#FFAA00', label: 'Transition' };
  };

  const esgInfo = getESGColor();

  const highlightText = (text: string, query?: string) => {
    if (!query || !query.trim()) return text;
    try {
      const q = query.trim().toLowerCase();
      const idx = text.toLowerCase().indexOf(q);
      if (idx === -1) return text;
      return (
        <span>
          {text.substring(0, idx)}
          <span className="bg-yellow-200 dark:bg-yellow-600/40 px-0.5">{text.substring(idx, idx + q.length)}</span>
          {text.substring(idx + q.length)}
        </span>
      );
    } catch (e) {
      return text;
    }
  };

  return (
    <Card
      className={cn(
        'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 transition-all duration-200 cursor-pointer',
        onClick && 'cursor-pointer'
      )}
      style={{
        borderLeft: `4px solid ${statusConfig.borderColor}`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        borderRadius: '8px',
        transition: 'all 200ms ease-out'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
        e.currentTarget.style.transform = 'scale(1.02)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
        e.currentTarget.style.transform = 'scale(1)';
      }}
      onClick={onClick}
    >
      <CardContent className="p-5">
        {/* Row 1: Status Badge + Company Name + Value */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge className={cn('text-xs font-semibold', statusConfig.badgeColor)}>
              {statusConfig.badge}
            </Badge>
            <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
              {highlightText(loan.companyName, highlightQuery)}
            </h3>
          </div>
          <p className="text-base font-bold text-gray-900 dark:text-gray-100">
            {formatCurrency(loan.loanAmount)}
          </p>
        </div>

        {/* Row 2: Industry/Sector */}
        <div className="mb-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">{highlightText(loan.sector, highlightQuery)}</p>
        </div>

        {/* Row 3: Covenant Details */}
        {criticalCovenant && (
          <div className="mb-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {criticalCovenant.name}:
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {covenantRatio}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {criticalCovenant.isBreached ? (
                <>
                  <X className="w-4 h-4 text-red-600" />
                  <span className="text-xs font-medium text-red-600">
                    Breached ({covenantChange})
                  </span>
                </>
              ) : criticalCovenant.isAtRisk ? (
                <>
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                  <span className="text-xs font-medium text-orange-600">
                    At Risk ({covenantChange})
                  </span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-medium text-green-600">
                    Safe ({covenantChange})
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Row 4: ESG Score */}
        <div className="mb-4 flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
          <span className="text-sm text-gray-600 dark:text-gray-400">ESG Score:</span>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold" style={{ color: esgInfo.color }}>
              {Math.round(greenScore)}/100
            </span>
            <Badge 
              variant="outline" 
              className="text-xs"
              style={{ 
                borderColor: esgInfo.color,
                color: esgInfo.color
              }}
            >
              {esgInfo.label}
            </Badge>
          </div>
        </div>

        {/* Row 5: View Details Link */}
        <button
          className="w-full flex items-center justify-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
        >
          View Details →
        </button>
      </CardContent>
    </Card>
  );
};

export default LoanCard;
