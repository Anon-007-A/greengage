/**
 * Covenant Status Badge with Real-time Breach Calculation
 * Updates color based on stress test parameters
 */
import { Badge } from '@/components/ui/badge';
import { Covenant } from '@/types/greenLoan';
import { calculateBreachRisk } from '@/lib/breachCalculator';
import { useGreenGaugeStore } from '@/store/useGreenGaugeStore';
import { cn } from '@/lib/utils';

interface CovenantStatusBadgeProps {
  covenant: Covenant;
  loanId: string;
  onClick?: () => void;
  className?: string;
}

const CovenantStatusBadge = ({ covenant, loanId, onClick, className }: CovenantStatusBadgeProps) => {
  const { ebitdaDropPercent, interestRateHikeBps, setSelectedCovenant } = useGreenGaugeStore();

  // Calculate real-time breach risk
  const breachCalc = calculateBreachRisk(covenant, ebitdaDropPercent, interestRateHikeBps);
  const displayStatus = breachCalc.status;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      setSelectedCovenant(loanId, covenant.id);
    }
  };

  const getBadgeVariant = () => {
    switch (displayStatus) {
      case 'breach':
        return 'destructive';
      case 'warning':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getBadgeColor = () => {
    switch (displayStatus) {
      case 'breach':
        return 'border-red-500 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/20';
      case 'warning':
        return 'border-yellow-500 text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/20';
      default:
        return 'border-green-500 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/20';
    }
  };

  return (
    <Badge
      variant={getBadgeVariant()}
      className={cn(
        'cursor-pointer transition-all hover:scale-105',
        displayStatus === 'compliant' && getBadgeColor(),
        className
      )}
      onClick={handleClick}
    >
      {displayStatus.toUpperCase()}
    </Badge>
  );
};

export default CovenantStatusBadge;

