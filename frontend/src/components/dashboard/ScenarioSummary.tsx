/**
 * Scenario Summary Component
 * Human-readable explanation of the current stress test scenario
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GreenLoan } from '@/types/greenLoan';
import { calculatePortfolioGreenScore } from '@/lib/greenScore';
import { usePortfolioStatus } from '@/hooks/usePortfolioStatus';
import { calculateOverallLoanSeverity } from '@/lib/breachCalculator';
import { getCovenantAction, getSeverityColors } from '@/lib/covenantActionService';
import { TrendingDown, TrendingUp, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ScenarioSummaryProps {
  loans: GreenLoan[];
  ebitdaDropPercent: number;
  interestRateHikeBps: number;
  onExport?: () => void;
}

interface BreachDetail {
  loanName: string;
  covenantName: string;
  currentValue: number;
  stressedValue: number;
  threshold: number;
  breachMargin: number;
}

const ScenarioSummary = ({ loans, ebitdaDropPercent, interestRateHikeBps, onExport }: ScenarioSummaryProps) => {
  // Use centralized portfolio status (single source of truth)
  const portfolioStatus = usePortfolioStatus(loans, ebitdaDropPercent, interestRateHikeBps);
  const {
    breachedLoanCount,
    atRiskLoanCount,
    totalLoanCount,
    totalBreaches,
    totalAtRisk,
    covenantTypesBreached,
    covenantTypesAtRisk,
    loans: loanStatuses
  } = portfolioStatus;

  const hasActiveScenario = ebitdaDropPercent > 0 || interestRateHikeBps > 0;

  // Build breach and at-risk details from centralized status
  const breaches: BreachDetail[] = [];
  const atRisk: BreachDetail[] = [];

  loanStatuses.forEach(loanStatus => {
    loanStatus.covenants.forEach(cov => {
      if (cov.isBreached) {
        breaches.push({
          loanName: loanStatus.loan.companyName,
          covenantName: cov.name,
          currentValue: cov.currentValue,
          stressedValue: cov.stressedValue,
          threshold: cov.threshold,
          breachMargin: cov.breachMargin
        });
      } else if (cov.isAtRisk) {
        atRisk.push({
          loanName: loanStatus.loan.companyName,
          covenantName: cov.name,
          currentValue: cov.currentValue,
          stressedValue: cov.stressedValue,
          threshold: cov.threshold,
          breachMargin: cov.breachMargin
        });
      }
    });
  });

  // Calculate green scores
  const baselineGreenScore = calculatePortfolioGreenScore(loans, 0, 0);
  const stressedGreenScore = calculatePortfolioGreenScore(loans, ebitdaDropPercent, interestRateHikeBps);

  const generateSummaryText = () => {
    // Current Portfolio State (no stress parameters) - renamed from "Baseline Scenario"
    if (!hasActiveScenario) {
      let description = '';
      let impactDesc = '';
      
      if (breachedLoanCount === 0 && atRiskLoanCount === 0) {
        description = `All ${totalLoanCount} loans are compliant under current conditions. Adjust stress test parameters to explore scenarios.`;
        impactDesc = 'No impact on covenant compliance under current conditions.';
      } else {
        const mainCovenants = covenantTypesBreached.length > 0 
          ? covenantTypesBreached.slice(0, 2).join(' and ')
          : covenantTypesAtRisk.slice(0, 2).join(' and ');
        description = `Under current conditions: ${breachedLoanCount} of ${totalLoanCount} loan${breachedLoanCount !== 1 ? 's are' : ' is'} breached${breachedLoanCount > 0 && atRiskLoanCount > 0 ? ' and' : ''}${atRiskLoanCount > 0 ? ` ${atRiskLoanCount} ${atRiskLoanCount === 1 ? 'is' : 'are'} at risk` : ''}.`;
        impactDesc = `${breachedLoanCount} breached and ${atRiskLoanCount} at risk, primarily driven by ${mainCovenants}. These loans require monitoring.`;
      }

      return {
        title: 'Current Portfolio State',
        description: description,
        impact: impactDesc,
        esgImpact: `ESG Impact: Portfolio Green Score ${baselineGreenScore}/100. Dark Green loans at baseline: ${portfolioStatus.darkGreenLoanCount}.`
      };
    }

    // Active stress scenario
    const scenarioParts: string[] = [];
    if (ebitdaDropPercent > 0) {
      scenarioParts.push(`${ebitdaDropPercent}% EBITDA reduction`);
    }
    if (interestRateHikeBps > 0) {
      scenarioParts.push(`+${interestRateHikeBps} bps rate change`);
    }

    const scenarioDesc = scenarioParts.join(' and ');

    // Generate dynamic impact description
    let impactDesc = '';
    if (breachedLoanCount === 0 && atRiskLoanCount === 0) {
      impactDesc = `Under ${scenarioDesc}, all ${totalLoanCount} loans remain compliant with existing covenants. The portfolio Green Score stays at ${stressedGreenScore}/100.`;
    } else {
      const mainCovenants = covenantTypesBreached.length > 0
        ? covenantTypesBreached.slice(0, 2).join(' and ')
        : covenantTypesAtRisk.slice(0, 2).join(' and ');
      
      impactDesc = `Under ${scenarioDesc}, ${breachedLoanCount} of ${totalLoanCount} loan${breachedLoanCount !== 1 ? 's breach' : ' breaches'} at least one covenant`;
      if (atRiskLoanCount > 0) {
        impactDesc += ` and ${atRiskLoanCount} move${atRiskLoanCount !== 1 ? '' : 's'} into At Risk status`;
      }
      impactDesc += `, mainly due to ${mainCovenants}.`;
    }

    // Generate professional ESG impact with recommended actions
    let esgImpact = '';
    const severity = ebitdaDropPercent >= 20 || interestRateHikeBps >= 200 ? 'severe' : ebitdaDropPercent >= 10 || interestRateHikeBps >= 100 ? 'moderate' : 'mild';
    
    if (baselineGreenScore !== stressedGreenScore) {
      const greenScoreChange = baselineGreenScore - stressedGreenScore;
      esgImpact = `The Portfolio Green Score declines from ${baselineGreenScore} to ${stressedGreenScore} (${greenScoreChange > 0 ? '-' : '+'}${Math.abs(greenScoreChange)} points), indicating ESG deterioration under this ${severity} macroeconomic scenario.`;
    } else {
      esgImpact = `Portfolio Green Score remains stable at ${stressedGreenScore}/100 under this ${severity} scenario.`;
    }

    // Generate recommended actions
    const recommendedActions: string[] = [];
    if (breachedLoanCount > 0) {
      recommendedActions.push('waiver negotiation', 'covenant reset');
    }
    if (atRiskLoanCount > 0) {
      recommendedActions.push('enhanced operational monitoring');
    }
    if (breachedLoanCount > 0 || atRiskLoanCount > 0) {
      recommendedActions.push('partial sell-down consideration');
    }
    const actionsText = recommendedActions.length > 0 
      ? ` Recommended actions: ${recommendedActions.slice(0, 3).join(', ')}.`
      : '';

    return {
      title: 'Stress Test Scenario',
      description: `Under a ${ebitdaDropPercent}% EBITDA reduction and ${interestRateHikeBps} bps rate increase, the portfolio experiences ${breachedLoanCount} covenant breach${breachedLoanCount !== 1 ? 'es' : ''} and ${atRiskLoanCount} at-risk flag${atRiskLoanCount !== 1 ? 's' : ''}, primarily impacting ${covenantTypesBreached.length > 0 ? covenantTypesBreached.slice(0, 2).join(' and ') : covenantTypesAtRisk.slice(0, 2).join(' and ')}.`,
      impact: impactDesc + actionsText,
      esgImpact: esgImpact
    };
  };

  const summary = generateSummaryText();

  const getTopBreaches = () => {
    return breaches
      .sort((a, b) => Math.abs(b.breachMargin) - Math.abs(a.breachMargin))
      .slice(0, 3);
  };

  const getTopAtRisk = () => {
    return atRisk
      .sort((a, b) => Math.abs(a.breachMargin) - Math.abs(b.breachMargin))
      .slice(0, 3);
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-display text-xl flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Scenario Summary
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Plain English explanation of stress test impact
            </p>
          </div>
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport} className="gap-2">
              <Download className="w-4 h-4" />
              Export Report
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scenario Description */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm text-foreground">{summary.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{summary.description}</p>
        </div>

        {/* Impact Statement */}
        <div className={cn(
          'rounded-lg p-3 border',
          breachedLoanCount > 0 
            ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900'
            : atRiskLoanCount > 0
            ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900'
            : 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900'
        )}>
          <div className="flex items-start gap-2">
            {breachedLoanCount > 0 ? (
              <TrendingDown className={cn('w-4 h-4 mt-0.5 flex-shrink-0', 'text-red-600 dark:text-red-400')} />
            ) : atRiskLoanCount > 0 ? (
              <TrendingUp className={cn('w-4 h-4 mt-0.5 flex-shrink-0', 'text-yellow-600 dark:text-yellow-400')} />
            ) : (
              <TrendingUp className={cn('w-4 h-4 mt-0.5 flex-shrink-0', 'text-green-600 dark:text-green-400')} />
            )}
            <div className="flex-1 space-y-2">
              <p className={cn(
                'text-sm leading-relaxed',
                breachedLoanCount > 0 
                  ? 'text-red-900 dark:text-red-100'
                  : atRiskLoanCount > 0
                  ? 'text-yellow-900 dark:text-yellow-100'
                  : 'text-green-900 dark:text-green-100'
              )}>
                <strong>Impact:</strong> {summary.impact}
              </p>
              {summary.esgImpact && (
                <p className={cn(
                  'text-sm leading-relaxed',
                  baselineGreenScore !== stressedGreenScore
                    ? 'text-orange-700 dark:text-orange-300'
                    : 'text-muted-foreground'
                )}>
                  <strong>ESG Impact:</strong> {summary.esgImpact}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Key Breaches */}
        {breaches.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-foreground">Key Breaches:</h4>
            <div className="space-y-2">
              {getTopBreaches().map((breach, idx) => {
                // Find the loan to get breach severity and generate action
                const loan = loans.find(l => l.companyName === breach.loanName);
                const overallSeverity = loan ? calculateOverallLoanSeverity(loan.covenants, ebitdaDropPercent, interestRateHikeBps) : 50;
                const action = loan ? getCovenantAction(loan, overallSeverity, ebitdaDropPercent, interestRateHikeBps) : null;
                const colors = getSeverityColors(overallSeverity);

                return (
                  <div key={idx} className={cn("rounded p-3 border", colors.bg, colors.border)}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className={cn("font-medium", colors.text)}>
                          {breach.loanName} — {breach.covenantName}
                        </p>
                        <p className={cn("text-xs mt-1", colors.accent)}>
                          Severity: {Math.round(overallSeverity)}/100
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={cn("text-sm font-bold", colors.accent)}>
                          {breach.stressedValue.toFixed(2)}x
                        </p>
                        <p className={cn("text-xs", colors.accent)}>
                          vs {breach.threshold.toFixed(2)}x
                        </p>
                      </div>
                    </div>

                    <p className={cn("text-xs mt-2 pt-2 border-t", colors.accent, colors.border.replace('border-', 'border-t-'))}>
                      {Math.abs(breach.breachMargin).toFixed(2)}x over threshold
                    </p>

                    {action && (
                      <>
                        <p className={cn("text-xs font-semibold mt-2", colors.text)}>
                          ⚡ {action.action}
                        </p>
                        <p className={cn("text-xs mt-1", colors.accent)}>
                          {action.rationale}
                        </p>
                        {action.esgNote && (
                          <p className={cn("text-xs mt-1.5 pl-2 border-l-2", colors.accent, colors.border.replace('border-', 'border-l-'))}>
                            {action.esgNote}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* At Risk Covenants */}
        {atRisk.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-foreground">At Risk (within 10% of threshold):</h4>
            <div className="space-y-2">
              {getTopAtRisk().map((risk, idx) => {
                // Find the loan and calculate severity for at-risk items
                const loan = loans.find(l => l.companyName === risk.loanName);
                const overallSeverity = loan ? calculateOverallLoanSeverity(loan.covenants, ebitdaDropPercent, interestRateHikeBps) : 30;
                const action = loan ? getCovenantAction(loan, overallSeverity, ebitdaDropPercent, interestRateHikeBps) : null;
                const colors = getSeverityColors(overallSeverity);

                const cushionPercent = ((Math.abs(risk.breachMargin) / risk.threshold) * 100);

                return (
                  <div key={idx} className={cn("rounded p-3 border", colors.bg, colors.border)}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className={cn("font-medium", colors.text)}>
                          {risk.loanName} — {risk.covenantName}
                        </p>
                        <p className={cn("text-xs mt-1", colors.accent)}>
                          Cushion: {cushionPercent.toFixed(1)}% remaining
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={cn("text-sm font-bold", colors.accent)}>
                          {risk.stressedValue.toFixed(2)}x
                        </p>
                        <p className={cn("text-xs", colors.accent)}>
                          vs {risk.threshold.toFixed(2)}x
                        </p>
                      </div>
                    </div>

                    {action && (
                      <>
                        <p className={cn("text-xs font-semibold mt-2", colors.text)}>
                          ⚠️ {action.action}
                        </p>
                        <p className={cn("text-xs mt-1", colors.accent)}>
                          {action.rationale}
                        </p>
                        {action.esgNote && (
                          <p className={cn("text-xs mt-1.5 pl-2 border-l-2", colors.accent, colors.border.replace('border-', 'border-l-'))}>
                            {action.esgNote}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No Issues - only show if truly no issues */}
        {breachedLoanCount === 0 && atRiskLoanCount === 0 && !hasActiveScenario && (
          <div className="text-center py-4 text-sm text-muted-foreground">
            Adjust stress test parameters to see scenario impact
          </div>
        )}

        {hasActiveScenario && breachedLoanCount === 0 && atRiskLoanCount === 0 && (
          <div className="text-center py-4 text-sm text-green-700 dark:text-green-300">
            ✓ All loans remain compliant under this scenario
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ScenarioSummary;

