import { RiskLevel } from '@/types/greenLoan';
import { cn } from '@/lib/utils';

interface RiskScoreBadgeProps {
  score: number;
  level: RiskLevel;
  size?: 'sm' | 'md' | 'lg';
}

const RiskScoreBadge = ({ score, level, size = 'md' }: RiskScoreBadgeProps) => {
  const getColors = () => {
    switch (level) {
      case 'low':
        return 'bg-success/10 text-success border-success/30';
      case 'medium':
        return 'bg-warning/10 text-warning border-warning/30';
      case 'high':
        return 'bg-danger/10 text-danger border-danger/30';
      case 'critical':
        return 'bg-danger text-danger-foreground border-danger';
      default:
        return 'bg-muted text-muted-foreground border-muted';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-0.5 text-xs';
      case 'lg':
        return 'px-4 py-2 text-lg';
      default:
        return 'px-3 py-1 text-sm';
    }
  };

  return (
    <span 
      className={cn(
        "inline-flex items-center justify-center rounded-full font-medium border",
        getColors(),
        getSizeClasses()
      )}
    >
      {score}
    </span>
  );
};

export default RiskScoreBadge;
