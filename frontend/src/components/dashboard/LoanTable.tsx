import React, { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GreenLoan, RiskLevel } from '@/types/greenLoan';
import { useGreenGaugeStore } from '@/store/useGreenGaugeStore';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { usePortfolioStatus } from '@/hooks/usePortfolioStatus';
import { ChevronRight, TrendingUp, TrendingDown, Minus, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import RiskScoreBadge from '@/components/shared/RiskScoreBadge';
// Lightweight inline sparkline used instead of per-row Recharts to improve performance
const Sparkline: React.FC<{ values: number[]; color?: string; width?: number; height?: number }> = ({ values, color = '#8884d8', width = 64, height = 24 }) => {
  if (!values || values.length === 0) return <div className="w-16 h-8" />;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const len = values.length;
  const points = values.map((v, i) => {
    const x = (i / Math.max(1, len - 1)) * width;
    const y = height - ((v - min) / Math.max(1e-6, max - min)) * height;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-16 h-8">
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" opacity={0.95} />
    </svg>
  );
};
import { calculateStressedGreenScore, getESGCategory } from '@/lib/greenScore';
import CovenantStatusBadge from './CovenantStatusBadge';

interface LoanTableProps {
  loans: GreenLoan[];
}

// Memoized row component to avoid re-renders on parent updates
const LoanRow = React.memo(function LoanRow({
  loan,
  idx,
  formatCurrency,
  getStatusBadge,
  getESGBadge,
  getClosestCovenant,
  getSparklineData,
  getSparklineColor,
  onNavigate
}: any) {
  return (
    <TableRow 
      key={loan.id}
      className={cn(
        "cursor-pointer transition-colors hover:bg-muted/50 animate-fade-in-up",
      )}
      style={{ animationDelay: `${(idx + 3) * 0.05}s` }}
      onClick={() => onNavigate(loan.id)}
    >
      <TableCell>
        <div>
          <p className="font-medium text-foreground">{loan.companyName}</p>
          <p className="text-xs text-muted-foreground">{loan.relationshipManager}</p>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">{loan.sector}</TableCell>
      <TableCell className="text-right font-medium">{formatCurrency(loan.loanAmount)}</TableCell>
      <TableCell>{getStatusBadge(loan._computedStatus)}</TableCell>
      <TableCell className="text-center">{getESGBadge(loan)}</TableCell>
      <TableCell className="text-center">
        {loan.covenants && loan.covenants.length > 0 ? (
          <div className="flex items-center justify-center gap-2">
            <CovenantStatusBadge 
              covenant={loan.covenants[0]} 
              loanId={loan.id}
            />
            {loan.covenants.length > 1 && (
              <span className="text-xs text-muted-foreground">+{loan.covenants.length - 1}</span>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">No covenants</span>
        )}
      </TableCell>
      <TableCell className="text-center">
        {(() => {
          const closestCov = getClosestCovenant(loan);
          if (!closestCov) return <span className="text-xs text-muted-foreground">N/A</span>;
          const cushion = closestCov.cushionPercent;
          const isPositive = cushion > 0;
          return (
            <div className="text-xs">
              <p className="font-medium">{closestCov.name}</p>
              <p className={cn(
                'text-xs',
                closestCov.isBreached ? 'text-red-600 dark:text-red-400' :
                closestCov.isAtRisk ? 'text-yellow-600 dark:text-yellow-400' :
                'text-green-600 dark:text-green-400'
              )}>
                {closestCov.stressedValue.toFixed(2)}{closestCov.unit}
                {isPositive && ` (${cushion.toFixed(1)}% cushion)`}
                {!isPositive && ` (${Math.abs(cushion).toFixed(1)}% over)`}
              </p>
            </div>
          );
        })()}
      </TableCell>
      <TableCell className="text-center">
        <RiskScoreBadge score={loan.riskScore.overall} level={loan.riskScore.level} />
      </TableCell>
      <TableCell className="text-center">
        <div className="flex items-center justify-center gap-1">
          {loan._trendIcon}
          <span className="text-xs text-muted-foreground capitalize">{loan.riskScore.trend}</span>
        </div>
      </TableCell>
      <TableCell>
        {(() => {
          const covenant = loan.covenants && loan.covenants[0];
          const values = covenant && covenant.trend ? covenant.trend : [];
          return (
            <div className="w-16 h-8">
              <Sparkline values={values} color={getSparklineColor(loan.riskScore.level)} width={64} height={24} />
            </div>
          );
        })()}
      </TableCell>
      <TableCell>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
});

const LoanTable = ({ loans }: LoanTableProps) => {
  const navigate = useNavigate();
  const { filterStatus, setFilterStatus } = useGreenGaugeStore();
  const { simulation } = usePortfolio();
  const ebitdaDropPercent = simulation?.ebitdaDrop || 0;
  const interestRateHikeBps = simulation?.interestRateHike || 0;
  
  // Use centralized portfolio status for consistent loan statuses
  const portfolioStatus = usePortfolioStatus(loans, ebitdaDropPercent, interestRateHikeBps);
  const loanStatusMap = useMemo(() => new Map(portfolioStatus.loans.map((ls: any) => [ls.loan.id, ls])), [portfolioStatus.loans]);

  // Get loan status from centralized status (aligned with breach/at-risk logic)
  const getLoanStatus = useCallback((loan: GreenLoan) => {
    const loanStatus = loanStatusMap.get(loan.id);
    if (!loanStatus) return 'active';
    if (loanStatus.status === 'BREACHED') return 'breached';
    if (loanStatus.status === 'AT_RISK') return 'at_risk';
    return 'active';
  }, [loanStatusMap]);

  // Get closest covenant to breach
  const getClosestCovenant = useCallback((loan: GreenLoan) => {
    const loanStatus = loanStatusMap.get(loan.id);
    if (!loanStatus || !loanStatus.covenants || loanStatus.covenants.length === 0) return null;
    const sorted = [...loanStatus.covenants].sort((a: any, b: any) => Math.abs(a.cushionPercent) - Math.abs(b.cushionPercent));
    return sorted[0];
  }, [loanStatusMap]);

  const getStatusBadge = useCallback((status: string) => {
    switch (status) {
      case 'breached':
        return <Badge variant="danger" className="inline-flex items-center gap-2"><span>Breached</span></Badge>;
      case 'at_risk':
        return <Badge variant="warning" className="inline-flex items-center gap-2"><span>At Risk</span></Badge>;
      case 'active':
        return <Badge variant="success" className="inline-flex items-center gap-2"><span>Active</span></Badge>;
      case 'watchlist':
        return <Badge variant="warning" className="inline-flex items-center gap-2"><span>Watchlist</span></Badge>;
      case 'default':
        return <Badge variant="danger" className="inline-flex items-center gap-2"><span>Default</span></Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }, []);

  const getTrendIcon = useCallback((trend: 'improving' | 'stable' | 'deteriorating') => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-success" />;
      case 'deteriorating':
        return <TrendingDown className="w-4 h-4 text-danger" />;
      default:
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  }, []);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  }, []);

  // Generate sparkline data from covenant trends
  const getSparklineData = useCallback((loan: GreenLoan) => {
    const covenant = loan.covenants[0];
    if (!covenant) return [];
    return covenant.trend.map((value: any, index: number) => ({ value, index }));
  }, []);

  const getSparklineColor = useCallback((level: RiskLevel) => {
    switch (level) {
      case 'low': return 'hsl(var(--success))';
      case 'medium': return 'hsl(var(--warning))';
      case 'high': 
      case 'critical': return 'hsl(var(--danger))';
      default: return 'hsl(var(--muted-foreground))';
    }
  }, []);

  // Sparkline is defined at module top for reuse

  const getESGBadge = useCallback((loan: GreenLoan) => {
    const greenScore = calculateStressedGreenScore(loan, ebitdaDropPercent, interestRateHikeBps);
    const category = getESGCategory(greenScore);
    const getBadgeColor = () => {
      switch (category) {
        case 'Dark Green':
          return 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-800';
        case 'Light Green':
          return 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-800';
        default:
          return 'bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-800';
      }
    };
    return (
      <Badge variant="outline" className={cn('text-xs font-medium', getBadgeColor())}>
        {category}
      </Badge>
    );
  }, [ebitdaDropPercent, interestRateHikeBps]);

  const handleFilterChange = useCallback((val: any) => setFilterStatus(val), [setFilterStatus]);

  const handleRowNavigate = useCallback((id: string) => navigate(`/loan/${id}`), [navigate]);

  // Filter loans according to legacy UI filterStatus (mapped to computed statuses)
  const filteredLoans = useMemo(() => {
    if (!filterStatus || filterStatus === 'all') return loans;
    return loans.filter(loan => {
      const ls = loanStatusMap.get(loan.id);
      const s = (ls?.status || 'SAFE').toString().toLowerCase();
      const matches = ((): boolean => {
        switch (filterStatus) {
          case 'active':
            return ['safe', 'compliant', 'active'].includes(s);
          case 'watchlist':
            return ['watchlist', 'at_risk', 'warning'].includes(s);
          case 'default':
            return ['default', 'breached', 'breach'].includes(s);
          default:
            return s === String(filterStatus || '').toLowerCase();
        }
      })();
      return matches;
    });
  }, [loans, filterStatus, loanStatusMap]);

  const precomputed = useMemo(() => filteredLoans.map((loan, i) => ({
    loan,
    idx: i,
    _computedStatus: getLoanStatus(loan),
    _trendIcon: getTrendIcon(loan.riskScore.trend)
  })), [filteredLoans, getLoanStatus, getTrendIcon]);

  return (
    <Card className="border-border/50 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-xl">Loan Portfolio</CardTitle>
            <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={filterStatus} onValueChange={handleFilterChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Loans</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="watchlist">Watchlist</SelectItem>
                <SelectItem value="default">Default</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Sector</TableHead>
              <TableHead className="text-right">Loan Value</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">ESG</TableHead>
              <TableHead className="text-center">Covenant</TableHead>
              <TableHead className="text-center">Closest to Breach</TableHead>
              <TableHead className="text-center">Risk Score</TableHead>
              <TableHead className="text-center">Trend</TableHead>
              <TableHead className="w-20">Sparkline</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loans.map((loan, i) => (
              <TableRow 
                key={loan.id}
                className={cn(
                  "cursor-pointer transition-colors hover:bg-muted/50 animate-fade-in-up",
                )}
                style={{ animationDelay: `${(i + 3) * 0.05}s` }}
                onClick={() => navigate(`/loan/${loan.id}`)}
              >
                <TableCell>
                  <div>
                    <p className="font-medium text-foreground">{loan.companyName}</p>
                    <p className="text-xs text-muted-foreground">{loan.relationshipManager}</p>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{loan.sector}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(loan.loanAmount)}</TableCell>
                <TableCell>{getStatusBadge(getLoanStatus(loan))}</TableCell>
                <TableCell className="text-center">
                  {getESGBadge(loan)}
                </TableCell>
                <TableCell className="text-center">
                  {loan.covenants && loan.covenants.length > 0 ? (
                    <div className="flex items-center justify-center gap-2">
                      <CovenantStatusBadge 
                        covenant={loan.covenants[0]} 
                        loanId={loan.id}
                      />
                      {loan.covenants.length > 1 && (
                        <span className="text-xs text-muted-foreground">
                          +{loan.covenants.length - 1}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">No covenants</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {(() => {
                    const closestCov = getClosestCovenant(loan);
                    if (!closestCov) return <span className="text-xs text-muted-foreground">N/A</span>;
                    
                    const cushion = closestCov.cushionPercent;
                    const isPositive = cushion > 0;
                    
                    return (
                      <div className="text-xs">
                        <p className="font-medium">{closestCov.name}</p>
                        <p className={cn(
                          'text-xs',
                          closestCov.isBreached ? 'text-red-600 dark:text-red-400' :
                          closestCov.isAtRisk ? 'text-yellow-600 dark:text-yellow-400' :
                          'text-green-600 dark:text-green-400'
                        )}>
                          {closestCov.stressedValue.toFixed(2)}{closestCov.unit}
                          {isPositive && ` (${cushion.toFixed(1)}% cushion)`}
                          {!isPositive && ` (${Math.abs(cushion).toFixed(1)}% over)`}
                        </p>
                      </div>
                    );
                  })()}
                </TableCell>
                <TableCell className="text-center">
                  <RiskScoreBadge score={loan.riskScore.overall} level={loan.riskScore.level} />
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    {getTrendIcon(loan.riskScore.trend)}
                    <span className="text-xs text-muted-foreground capitalize">{loan.riskScore.trend}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {(() => {
                    const covenant = loan.covenants && loan.covenants[0];
                    const values = covenant && covenant.trend ? covenant.trend : [];
                    return (
                      <div className="w-16 h-8">
                        <Sparkline values={values} color={getSparklineColor(loan.riskScore.level)} width={64} height={24} />
                      </div>
                    );
                  })()}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {loans.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No loans match your search criteria</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default React.memo(LoanTable);
