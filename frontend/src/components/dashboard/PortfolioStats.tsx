import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, AlertTriangle, Leaf, Zap, PiggyBank, ShieldAlert, AlertCircle, Sprout, Heart } from 'lucide-react';
import { PortfolioSummary, GreenLoan } from '@/types/greenLoan';
import { calculatePortfolioGreenScore, calculatePortfolioESGResilience } from '@/lib/greenScore';
import { usePortfolioStatus } from '@/hooks/usePortfolioStatus';
import { cn } from '@/lib/utils';

interface PortfolioStatsProps {
  summary: PortfolioSummary;
  loans: GreenLoan[];
  ebitdaDropPercent: number;
  interestRateHikeBps: number;
}

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

const AnimatedCounter = ({ value, prefix = '', suffix = '', decimals = 0 }: AnimatedCounterProps) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(current);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  const formatValue = (val: number) => {
    if (val >= 1000000) {
      return (val / 1000000).toFixed(1) + 'M';
    }
    if (val >= 1000) {
      return (val / 1000).toFixed(decimals) + 'K';
    }
    return val.toFixed(decimals);
  };

  return (
    <span className="animate-count-up">
      {prefix}{formatValue(displayValue)}{suffix}
    </span>
  );
};

const PortfolioStats = ({ summary, loans, ebitdaDropPercent, interestRateHikeBps }: PortfolioStatsProps) => {
  // Use centralized portfolio status (single source of truth)
  const portfolioStatus = usePortfolioStatus(loans, ebitdaDropPercent, interestRateHikeBps);
  const {
    breachedLoanCount,
    atRiskLoanCount,
    totalBreaches,
    totalPortfolioValue,
    portfolioGreenScore,
    avgRiskScore
  } = portfolioStatus;

  // Calculate ESG Resilience
  const esgResilience = calculatePortfolioESGResilience(loans, ebitdaDropPercent, interestRateHikeBps);

  const stats = [
    {
      label: 'Total Portfolio',
      value: totalPortfolioValue,
      prefix: '€',
      suffix: '',
      icon: PiggyBank,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Breached Loans',
      value: breachedLoanCount,
      suffix: ` of ${summary.totalLoans}`,
      icon: ShieldAlert,
      color: breachedLoanCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground',
      bgColor: breachedLoanCount > 0 ? 'bg-red-50 dark:bg-red-950/20' : 'bg-muted/50',
    },
    {
      label: 'At Risk Loans',
      value: atRiskLoanCount,
      suffix: ` of ${summary.totalLoans}`,
      icon: AlertCircle,
      color: atRiskLoanCount > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-muted-foreground',
      bgColor: atRiskLoanCount > 0 ? 'bg-yellow-50 dark:bg-yellow-950/20' : 'bg-muted/50',
    },
    {
      label: 'Portfolio Green Score',
      value: portfolioGreenScore,
      suffix: '/100',
      icon: Sprout,
      color: portfolioGreenScore >= 80 ? 'text-green-600 dark:text-green-400' : portfolioGreenScore >= 50 ? 'text-yellow-600 dark:text-yellow-400' : 'text-orange-600 dark:text-orange-400',
      bgColor: portfolioGreenScore >= 80 ? 'bg-green-50 dark:bg-green-950/20' : portfolioGreenScore >= 50 ? 'bg-yellow-50 dark:bg-yellow-950/20' : 'bg-orange-50 dark:bg-orange-950/20',
    },
    {
      label: 'ESG Resilience',
      value: esgResilience,
      suffix: '/100',
      icon: Heart,
      color: esgResilience >= 70 ? 'text-green-600 dark:text-green-400' : esgResilience >= 50 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400',
      bgColor: esgResilience >= 70 ? 'bg-green-50 dark:bg-green-950/20' : esgResilience >= 50 ? 'bg-yellow-50 dark:bg-yellow-950/20' : 'bg-red-50 dark:bg-red-950/20',
    },
    {
      label: 'Avg Risk Score',
      value: avgRiskScore,
      suffix: '/100',
      icon: avgRiskScore > 50 ? TrendingDown : TrendingUp,
      color: avgRiskScore > 50 ? 'text-warning' : 'text-success',
      bgColor: avgRiskScore > 50 ? 'bg-warning/10' : 'bg-success/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {stats.map((stat, i) => (
        <Card 
          key={stat.label} 
          className={cn(
            "hover-lift border-border/50 animate-fade-in-up",
          )}
          style={{ animationDelay: `${i * 0.1}s` }}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", stat.bgColor)}>
                <stat.icon className={cn("w-5 h-5", stat.color)} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                <p className={cn("text-xl font-display font-bold", stat.color)}>
                  <AnimatedCounter 
                    value={stat.value} 
                    prefix={stat.prefix || ''} 
                    suffix={stat.suffix || ''} 
                  />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default React.memo(PortfolioStats);
