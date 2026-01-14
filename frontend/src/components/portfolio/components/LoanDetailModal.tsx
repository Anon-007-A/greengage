/**
 * Loan Detail Modal
 * Shows full loan details when clicking a loan card
 */
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { usePortfolioStatus } from '@/hooks/usePortfolioStatus';
import { calculateStressedGreenScore, getESGCategory } from '@/lib/greenScore';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoanDetailModalProps {
  loanId: string;
  onClose: () => void;
}

const LoanDetailModal = ({ loanId, onClose }: LoanDetailModalProps) => {
  const { loans, simulation } = usePortfolio() as any;
  const loan = loans.find((l: any) => l.id === loanId);
  const ebitdaDropPercent = simulation?.ebitdaDrop ?? 0;
  const interestRateHikeBps = simulation?.interestRateHike ?? 0;
  
  if (!loan) return null;

  const portfolioStatus = usePortfolioStatus([loan] as any, ebitdaDropPercent, interestRateHikeBps);
  const loanStatus = portfolioStatus.loans[0];
  const greenScore = calculateStressedGreenScore(loan, ebitdaDropPercent, interestRateHikeBps);
  const esgCategory = getESGCategory(greenScore);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (d: string | Date) => {
    try {
      const dt = typeof d === 'string' ? new Date(d) : d;
      return dt.toLocaleDateString('en-GB');
    } catch (e) {
      return String(d);
    }
  };

  // --- AI-powered mock recommendations engine (heuristic)
  const computeBreachProbability = (covenants: any[]) => {
    if (!covenants || covenants.length === 0) return 2; // very low if no covenants
    // covenants include cushionPercent and isBreached/isAtRisk
    let score = 0;
    covenants.forEach(c => {
      if (c.isBreached) score += 100;
      else if (c.isAtRisk) score += 60;
      else score += Math.max(0, 20 - (c.cushionPercent || 0) * 0.2);
    });
    // average and dampen
    score = score / covenants.length;
    // clamp
    return Math.round(Math.max(0, Math.min(100, score)));
  };

  const breachProbability = computeBreachProbability(loanStatus?.covenants || []);

  const recommendActions = () => {
    const recs: Array<{ id: string; title: string; reason: string; estReduction: number; color?: string }> = [];

    // If high breach probability
    if (breachProbability >= 60) {
      recs.push({ id: 'waiver', title: 'Negotiate covenant adjustment', reason: 'Reduce covenant pressure and gain temporary relief', estReduction: 30, color: 'bg-red-50' });
    }

    // If interest rate sensitivity (mock check)
    const rateSensitive = loan.interestRate && loan.interestRate > 4; // mock threshold
    if (rateSensitive || (simulation && simulation.interestRateHike && simulation.interestRateHike > 50)) {
      recs.push({ id: 'refinance', title: 'Refinance at current rates', reason: 'Lower interest burden and improve covenant headroom', estReduction: 15, color: 'bg-orange-50' });
    }

    // ESG improvement suggestion if ESG metrics show low progress
    const poorESG = (loan.esgMetrics || []).some((m: any) => m.progressPercent !== undefined && m.progressPercent < 50);
    if (poorESG) {
      // pick top 1-2 metrics to suggest
      const metrics = (loan.esgMetrics || []).filter((m: any) => m.progressPercent < 80).slice(0, 2).map((m: any) => m.name);
      recs.push({ id: 'esg', title: `ESG improvement plan: ${metrics.join(', ') || 'General ESG'}`, reason: 'Improve verified impact metrics to access green refinancing and reduce risk', estReduction: 12, color: 'bg-green-50' });
    }

    // Early repayment if near maturity
    if (loan.maturityDate) {
      try {
        const days = Math.ceil((new Date(loan.maturityDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (days > 0 && days <= 120) {
          recs.push({ id: 'early', title: 'Early repayment option', reason: 'Pay down exposure to remove covenant pressure', estReduction: 40, color: 'bg-teal-50' });
        }
      } catch (e) { /* ignore */ }
    }

    // Portfolio rebalancing if same sector has multiple at-risk loans
    const sameSectorAtRisk = (loans || []).filter((l: any) => l.sector === loan.sector).length > 3;
    if (sameSectorAtRisk) {
      recs.push({ id: 'rebalance', title: 'Portfolio rebalancing', reason: 'Reduce sector concentration to lower systemic exposure', estReduction: 20, color: 'bg-yellow-50' });
    }

    // Ensure 3-5 suggestions
    return recs.slice(0, 5);
  };

  const aiRecommendations = recommendActions();

  // Recommendation modal state
  const [activeRecommendation, setActiveRecommendation] = React.useState<any | null>(null);

  const applyMockImpact = (base: number, reduction: number) => {
    const newVal = Math.max(0, Math.round(base - reduction));
    return { before: base, after: newVal, delta: base - newVal };
  };

  const defaultRecommendations = () => {
    const status = (loanStatus?.status || '').toString().toLowerCase();
    if (status.includes('breach') || status.includes('default')) {
      return [
        'URGENT: Initiate covenant waiver within 15 days',
        'Notify legal and recovery teams immediately',
      ];
    }
    if (status.includes('watch') || status.includes('warning') || status.includes('at_risk')) {
      return [
        'At Risk: Schedule call within 30 days. Metric declining — recommend covenant waiver or capital infusion',
        'Increase monitoring cadence to bi-weekly until metrics stabilise',
      ];
    }
    return ['Compliant: Continue quarterly monitoring'];
  };

  // allow simulating a recommendation which updates global simulation parameters
  const { setScenario } = usePortfolio() as any;
  const [appliedSimId, setAppliedSimId] = React.useState<string | null>(null);

  const handleSimulate = (rec: { id: string; estReduction: number }) => {
    // derive a simple mapping from estimated % reduction to simulation parameter adjustments
    const currentE = simulation?.ebitdaDrop ?? 0;
    const currentR = simulation?.interestRateHike ?? 0;
    // reduce stress by a fraction of estReduction
    const newE = Math.max(0, Math.round(currentE - rec.estReduction * 0.35));
    const newR = Math.max(0, Math.round(currentR - rec.estReduction * 3));
    try {
      // Use the higher-level scenario setter so the scenario is recorded and persisted
      setScenario({ ebitdaDrop: newE, interestRateHike: newR });
      setAppliedSimId(rec.id);
    } catch (e) {
      // ignore
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-semibold">{loan.companyName}</DialogTitle>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Risk Assessment Card */}
          <div className="p-4 rounded-lg border bg-gradient-to-br from-card to-white/70 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Risk Assessment</div>
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-lg font-semibold">{loan.companyName}</div>
                    <div className="text-xs text-muted-foreground">Status: <strong>{loanStatus?.status}</strong></div>
                  </div>
                  <div className="ml-4">
                    <div className="text-xs text-muted-foreground">Breach Probability</div>
                    <div className="flex items-center gap-3">
                      <div className="w-40">
                        <Progress value={breachProbability} className="h-3 rounded-full" />
                      </div>
                      <div className={`text-sm font-semibold ${breachProbability >= 60 ? 'text-red-600' : breachProbability >= 30 ? 'text-yellow-600' : 'text-green-600'}`}>{breachProbability}%</div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">Covenant cushion and stressed projections used to estimate probability</div>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Days until breach (est.)</div>
                <div className="text-xl font-bold">{(() => {
                  const minDays = (loanStatus?.covenants || []).reduce((m: number, c: any) => {
                    const est = c.isBreached ? 0 : Math.max(1, Math.round((c.threshold - c.stressedValue) / (Math.max(0.01, Math.abs((c.stressedValue - (c.currentValue || c.stressedValue))))) * 30)) ;
                    return Math.min(m, est);
                  }, 9999);
                  return minDays === 9999 ? 'N/A' : `${minDays} d`;
                })()}</div>
              </div>
            </div>
          </div>
          {/* Company Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Sector</p>
              <p className="font-medium">{loan.sector}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Loan Amount</p>
              <p className="font-medium">{formatCurrency(loan.loanAmount)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
              <Badge variant={loanStatus?.status === 'BREACHED' ? 'destructive' : 'outline'}>
                {loanStatus?.status || 'Safe'}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">ESG Score</p>
              <p className="font-medium">{Math.round(greenScore)}/100 ({esgCategory})</p>
            </div>
          </div>

          {/* Covenants */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Covenants</h3>
            <div className="space-y-2">
              {loanStatus?.covenants.map((covenant) => (
                <div
                  key={covenant.id}
                  className={cn(
                    'p-3 rounded-lg border',
                    covenant.isBreached
                      ? 'bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-900'
                      : covenant.isAtRisk
                      ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-300 dark:border-yellow-900'
                      : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{covenant.name}</span>
                    <span className="text-sm">
                      {covenant.stressedValue.toFixed(2)}{covenant.unit} / {covenant.threshold.toFixed(2)}{covenant.unit}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Cushion: {covenant.cushionPercent.toFixed(1)}%
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ESG Metrics */}
          {loan.esgMetrics && loan.esgMetrics.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">ESG Metrics</h3>
              <div className="space-y-2">
                {loan.esgMetrics.map((metric) => (
                  <div key={metric.id} className="p-3 rounded-lg border border-gray-200 dark:border-gray-800">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{metric.name}</span>
                      <span className="text-sm">
                        {metric.currentValue.toLocaleString()} {metric.unit}
                      </span>
                    </div>
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-teal-600 h-2 rounded-full"
                          style={{ width: `${metric.progressPercent}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {metric.progressPercent}% of target
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Smart Recommendations</h3>
            <div className="space-y-3">
              {aiRecommendations.map((r) => {
                const impact = applyMockImpact(breachProbability, r.estReduction);
                return (
                  <div key={r.id} className="p-3 rounded-lg border bg-white dark:bg-card">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{r.title}</div>
                        <div className="text-xs text-muted-foreground">{r.reason}</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-semibold ${impact.after < breachProbability ? 'text-green-600' : 'text-red-600'}`}>✓ This action would reduce breach risk by {impact.delta}%</div>
                        <div className="text-xs text-muted-foreground">Projected: {impact.before}% → {impact.after}%</div>
                      </div>
                    </div>
                      <div className="mt-3 flex items-center gap-3">
                        <Button size="sm" className="btn-gradient" onClick={() => handleSimulate(r)} disabled={appliedSimId === r.id}>
                          {appliedSimId === r.id ? 'Simulated' : 'Simulate'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setActiveRecommendation(r)}>Details</Button>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button className="text-sm text-muted-foreground">Why this?</button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-sm">This suggestion is generated using covenant cushion, ESG progress and portfolio exposure heuristics.</div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                  </div>
                );
              })}
              {aiRecommendations.length === 0 && (
                <div className="p-3 rounded border bg-green-50">No immediate actions recommended — loan appears healthy under current stress assumptions.</div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
      {/* Recommendation details modal (opens when user clicks Details) */}
      {activeRecommendation && (
        <RecommendationModal rec={activeRecommendation} onClose={() => setActiveRecommendation(null)} />
      )}
    </Dialog>
  );
};

export default LoanDetailModal;

// Recommendation Details Modal (separate small component)
export const RecommendationModal = ({ rec, onClose }: { rec: any; onClose: () => void }) => {
  if (!rec) return null;
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Recommendation</DialogTitle>
        </DialogHeader>
        <div className="p-4 space-y-3">
          <div>
            <div className="text-sm text-muted-foreground">Problem</div>
            <div className="font-medium">{rec.reason}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Recommended Action</div>
            <div className="font-medium">{rec.title}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Expected Outcome</div>
            <div className="font-medium">Estimated breach risk reduction: {rec.estReduction}%</div>
          </div>
          <div className="text-right">
            <Button onClick={onClose} className="btn-gradient">Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

