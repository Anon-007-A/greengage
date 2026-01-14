/**
 * Scenario Impact Preview
 * Real-time preview of loan status changes under current stress parameters
 */
import { useMemo } from 'react';
import { GreenLoan } from '@/types/greenLoan';
import { usePortfolioStatus } from '@/hooks/usePortfolioStatus';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, TrendingDown, CheckCircle2, AlertCircle } from 'lucide-react';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { useNavigate } from 'react-router-dom';

interface ScenarioImpactPreviewProps {
  loans: GreenLoan[];
  ebitdaDropPercent: number;
  interestRateHikeBps: number;
  baselineMetrics?: {
    breachedCount: number;
    atRiskCount: number;
    greenScore: number;
  };
}

interface StressLoanStatus {
  loanId: string;
  companyName: string;
  baselineStatus: 'safe' | 'warning' | 'breach';
  stressedStatus: 'safe' | 'warning' | 'breach';
  baselineBreachCount: number;
  stressedBreachCount: number;
  worstSeverity: number;
}

export const ScenarioImpactPreview = ({
  loans,
  ebitdaDropPercent,
  interestRateHikeBps,
  baselineMetrics
}: ScenarioImpactPreviewProps) => {
  // Use centralized portfolio status to ensure consistency
  const baselineStatus = usePortfolioStatus(loans, 0, 0);
  const stressedStatus = usePortfolioStatus(loans, ebitdaDropPercent, interestRateHikeBps);

  const scenarioAnalysis = useMemo(() => {
    const stressedBreachedCount = stressedStatus.breachedLoanCount;
    const stressedAtRiskCount = stressedStatus.atRiskLoanCount;
    // allow overriding display baseline counts via baselineMetrics (passed from GlobalData)
    const baselineBreachedCount = baselineMetrics?.breachedCount ?? baselineStatus.breachedLoanCount;
    const baselineAtRiskCount = baselineMetrics?.atRiskCount ?? baselineStatus.atRiskLoanCount;

    const breachDelta = stressedBreachedCount - baselineBreachedCount;
    const atRiskDelta = stressedAtRiskCount - baselineAtRiskCount;

    const affectedLoans = stressedStatus.loans
      .map((ls) => ({
        loanId: ls.loan.id,
        companyName: ls.loan.companyName,
        baselineStatus: baselineStatus.loans.find(b => b.loan.id === ls.loan.id)?.status || 'SAFE',
        stressedStatus: ls.status,
        baselineBreachCount: baselineStatus.loans.find(b => b.loan.id === ls.loan.id)?.breachCount || 0,
        stressedBreachCount: ls.breachCount || 0,
        worstSeverity: ls.covenants.reduce((m, c) => Math.max(m, c.isBreached ? 2 : c.isAtRisk ? 1 : 0), 0)
      }))
      .filter(l => l.worstSeverity > 0)
      .sort((a, b) => b.worstSeverity - a.worstSeverity);

    return {
      stressedBreachedCount,
      stressedAtRiskCount,
      baselineBreachedCount,
      baselineAtRiskCount,
      breachDelta,
      atRiskDelta,
      totalLoans: loans.length,
      affectedLoans,
      sortedLoans: affectedLoans
    };
  }, [baselineStatus, stressedStatus, loans]);

  const isStressed = ebitdaDropPercent > 0 || interestRateHikeBps > 0;

  if (!isStressed) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-blue-900">
            Scenario Impact Preview
          </CardTitle>
          <CardDescription className="text-blue-700">
            Adjust sliders to see real-time impact on covenant compliance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-xs text-blue-800">
              Current scenario: <strong>Baseline (0% stress)</strong>
            </p>
            <div className="flex gap-4">
              <div className="rounded bg-white/50 px-3 py-2">
                <p className="text-xs text-gray-600">Loans Breached</p>
                <p className="text-lg font-bold text-green-700">{scenarioAnalysis.baselineBreachedCount}</p>
              </div>
              <div className="rounded bg-white/50 px-3 py-2">
                <p className="text-xs text-gray-600">Loans At Risk</p>
                <p className="text-lg font-bold text-amber-600">{scenarioAnalysis.baselineAtRiskCount}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-red-900">
          Scenario Impact Preview
        </CardTitle>
        <CardDescription className="text-red-700">
          Under a {ebitdaDropPercent}% EBITDA drop and {interestRateHikeBps} bps rate hike
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Impact Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded bg-white/60 px-3 py-2">
            <p className="text-xs text-gray-600">Loans Breached</p>
            <p className="text-lg font-bold text-red-700">{scenarioAnalysis.stressedBreachedCount}</p>
            <p className="text-xs text-gray-600 mt-1">
              {scenarioAnalysis.breachDelta > 0 ? (
                <span className="text-red-600 font-semibold">
                  ↑ {scenarioAnalysis.breachDelta} from baseline
                </span>
              ) : scenarioAnalysis.breachDelta < 0 ? (
                <span className="text-green-600 font-semibold">
                  ↓ {Math.abs(scenarioAnalysis.breachDelta)} from baseline
                </span>
              ) : (
                <span className="text-gray-600">No change</span>
              )}
            </p>
          </div>

          <div className="rounded bg-white/60 px-3 py-2">
            <p className="text-xs text-gray-600">Loans At Risk</p>
            <p className="text-lg font-bold text-amber-600">{scenarioAnalysis.stressedAtRiskCount}</p>
            <p className="text-xs text-gray-600 mt-1">
              {scenarioAnalysis.atRiskDelta > 0 ? (
                <span className="text-amber-600 font-semibold">
                  ↑ {scenarioAnalysis.atRiskDelta} from baseline
                </span>
              ) : scenarioAnalysis.atRiskDelta < 0 ? (
                <span className="text-green-600 font-semibold">
                  ↓ {Math.abs(scenarioAnalysis.atRiskDelta)} from baseline
                </span>
              ) : (
                <span className="text-gray-600">No change</span>
              )}
            </p>
          </div>

          <div className="rounded bg-white/60 px-3 py-2">
            <p className="text-xs text-gray-600">Safe Loans</p>
            <p className="text-lg font-bold text-green-700">
              {scenarioAnalysis.totalLoans - scenarioAnalysis.stressedBreachedCount - scenarioAnalysis.stressedAtRiskCount}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {scenarioAnalysis.totalLoans} total
            </p>
          </div>
        </div>

        {/* Affected Loans */}
        {scenarioAnalysis.affectedLoans.length > 0 && (
          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-gray-700 mb-2">
              Most Affected Loans (by severity)
            </p>
            <div className="space-y-2">
              {scenarioAnalysis.affectedLoans.slice(0, 3).map((loan) => {
                const statusChanged = loan.baselineStatus !== loan.stressedStatus;
                return (
                  <div
                    key={loan.loanId}
                    className="flex items-start justify-between rounded bg-white/60 px-2 py-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">
                        {loan.companyName}
                      </p>
                      <div className="flex gap-2 mt-1">
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            loan.stressedStatus === 'BREACHED'
                              ? 'bg-red-100 text-red-800 border-red-300'
                              : loan.stressedStatus === 'AT_RISK'
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-green-100 text-green-800 border-green-300'
                          }`}
                        >
                          {loan.stressedStatus === 'BREACHED' ? 'BREACH' : loan.stressedStatus === 'AT_RISK' ? 'AT RISK' : 'SAFE'}
                        </Badge>
                        {statusChanged && (
                          <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800 border-purple-300">
                            Changed
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-2">
                      <p className="text-xs font-bold text-red-600">
                        {Math.round(loan.worstSeverity)}%
                      </p>
                      <p className="text-xs text-gray-600">severity</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recommendation */}
        {scenarioAnalysis.breachDelta > 0 || scenarioAnalysis.atRiskDelta > 0 ? (
          <div className="flex gap-2 rounded bg-amber-100 px-3 py-2 border border-amber-300">
            <AlertTriangle className="h-4 w-4 text-amber-700 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              This scenario would result in <strong>{scenarioAnalysis.breachDelta > 0 ? scenarioAnalysis.breachDelta + ' additional breach(es)' : ''}{scenarioAnalysis.breachDelta > 0 && scenarioAnalysis.atRiskDelta > 0 ? ' and ' : ''}{scenarioAnalysis.atRiskDelta > 0 ? scenarioAnalysis.atRiskDelta + ' additional at-risk loan(s)' : ''}</strong>. Consider liquidity management and covenant negotiation strategies.
            </p>
          </div>
        ) : (
          <div className="flex gap-2 rounded bg-green-100 px-3 py-2 border border-green-300">
            <CheckCircle2 className="h-4 w-4 text-green-700 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-green-800">
              Portfolio shows <strong>improved or stable compliance</strong> under this scenario.
            </p>
          </div>
        )}
      </CardContent>

      <div className="px-4 pb-4 pt-2">
        <div className="flex gap-2 justify-end">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-sm">View Recommendations</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Actionable Recommendations</AlertDialogTitle>
                <AlertDialogDescription>
                  Suggested remediation actions based on the most affected loans in this scenario.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-3 mt-2">
                {scenarioAnalysis.affectedLoans.slice(0,6).map((l) => (
                  <div key={l.loanId} className="rounded p-3 bg-background/50">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">{l.companyName}</div>
                      <div className="text-xs text-muted-foreground">Status: {l.stressedStatus.toUpperCase()}</div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Suggestion: {l.stressedStatus === 'BREACHED' ? 'Engage lender for covenant waiver or liquidity support.' : 'Monitor closely and consider covenant relief or additional covenants.'}
                    </div>
                  </div>
                ))}
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Close</AlertDialogCancel>
                <AlertDialogAction onClick={() => { window.location.href = '/reports'; }}>Create Action</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button onClick={() => { window.location.href = '/reports'; }} className="text-sm">Create Action</Button>
        </div>
      </div>
    </Card>
  );
};
