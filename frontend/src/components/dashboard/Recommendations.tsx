/**
 * Recommendations Component
 * AI-powered actionable recommendations for covenant and ESG remediation
 */
import { useMemo } from 'react';
import { GreenLoan } from '@/types/greenLoan';
import { usePortfolioStatus } from '@/hooks/usePortfolioStatus';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Lightbulb, TrendingUp, Target } from 'lucide-react';

interface RecommendationsProps {
  loans: GreenLoan[];
  ebitdaDropPercent?: number;
  interestRateHikeBps?: number;
}

interface Recommendation {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'covenant' | 'esg' | 'liquidity' | 'strategy';
  title: string;
  description: string;
  affectedLoans: string[];
  action: string;
}

export function Recommendations({
  loans,
  ebitdaDropPercent = 0,
  interestRateHikeBps = 0,
}: RecommendationsProps) {
  const portfolioStatus = usePortfolioStatus(loans, ebitdaDropPercent, interestRateHikeBps);

  const recommendations = useMemo(() => {
    const recs: Recommendation[] = [];

    // Check for breached loans
    const breachedLoans = portfolioStatus.loans.filter(l => l.status === 'BREACHED');
    if (breachedLoans.length > 0) {
      recs.push({
        id: 'covenant-breach-alert',
        severity: 'critical',
        category: 'covenant',
        title: 'Immediate Covenant Breach Alert',
        description: `${breachedLoans.length} loan(s) are currently in breach of covenant requirements.`,
        affectedLoans: breachedLoans.map(l => l.loan.companyName),
        action: 'Engage lenders immediately for waiver negotiation or restructuring discussions.',
      });
    }

    // Check for at-risk loans
    const atRiskLoans = portfolioStatus.loans.filter(l => l.status === 'AT_RISK');
    if (atRiskLoans.length > 0) {
      recs.push({
        id: 'at-risk-monitoring',
        severity: 'high',
        category: 'covenant',
        title: 'Monitor At-Risk Loans',
        description: `${atRiskLoans.length} loan(s) are at risk of breaching covenants within 6 months.`,
        affectedLoans: atRiskLoans.map(l => l.loan.companyName),
        action: 'Establish quarterly monitoring checklist; consider proactive covenant relief discussions.',
      });
    }

    // Check for ESG underperformance
    const esgUnderperformers = loans.filter(l => {
      const avgProgress = l.esgMetrics.reduce((sum, m) => sum + m.progressPercent, 0) / (l.esgMetrics.length || 1);
      return avgProgress < 50;
    });
    if (esgUnderperformers.length > 0) {
      recs.push({
        id: 'esg-underperformance',
        severity: 'high',
        category: 'esg',
        title: 'ESG Performance Gap',
        description: `${esgUnderperformers.length} borrower(s) are below 50% ESG target progress.`,
        affectedLoans: esgUnderperformers.map(l => l.companyName),
        action: 'Request detailed ESG remediation plan; offer technical support or green capex financing.',
      });
    }

    // Stress scenario recommendation
    if (ebitdaDropPercent > 10 || interestRateHikeBps > 200) {
      recs.push({
        id: 'stress-scenario-planning',
        severity: 'medium',
        category: 'strategy',
        title: 'Stress Scenario Planning',
        description: 'Current stress scenario exceeds typical tolerance thresholds.',
        affectedLoans: [],
        action: 'Develop contingency plans for EBITDA volatility and interest rate hedging strategies.',
      });
    }

    // Liquidity recommendation for portfolio
    const totalValue = loans.reduce((sum, l) => sum + l.loanAmount, 0);
    if (breachedLoans.length > 0 || atRiskLoans.length > 1) {
      recs.push({
        id: 'liquidity-buffer',
        severity: 'medium',
        category: 'liquidity',
        title: 'Liquidity Buffer Assessment',
        description: 'Recommend stress-testing liquidity to ensure portfolio resilience.',
        affectedLoans: [],
        action: 'Analyze cash flow impact of potential covenant waivers or restructurings.',
      });
    }

    // EU Taxonomy recommendation
    recs.push({
      id: 'eu-taxonomy-alignment',
      severity: 'low',
      category: 'strategy',
      title: 'Enhance EU Taxonomy Alignment',
      description: 'Improve documentation of loan alignment with EU Taxonomy criteria.',
      affectedLoans: [],
      action: 'Standardize ESG metric tracking and obtain third-party verification where possible.',
    });

    return recs;
  }, [portfolioStatus, ebitdaDropPercent, interestRateHikeBps, loans]);

  const getSeverityColor = (severity: string) => {
    const colors = {
      critical: 'bg-red-100 text-red-800 border-red-300',
      high: 'bg-orange-100 text-orange-800 border-orange-300',
      medium: 'bg-amber-100 text-amber-800 border-amber-300',
      low: 'bg-blue-100 text-blue-800 border-blue-300',
    };
    return colors[severity as keyof typeof colors] || '';
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      covenant: AlertTriangle,
      esg: TrendingUp,
      liquidity: Target,
      strategy: Lightbulb,
    };
    const Icon = icons[category as keyof typeof icons] || Lightbulb;
    return <Icon className="w-5 h-5" />;
  };

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-4">
        <CardTitle>Smart Recommendations</CardTitle>
        <CardDescription>
          AI-powered insights for covenant and ESG remediation
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {recommendations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Lightbulb className="mx-auto w-12 h-12 text-gray-400 mb-2" />
            <p className="font-medium">All Systems Nominal</p>
            <p className="text-sm">No critical recommendations at this time.</p>
          </div>
        ) : (
          recommendations.map((rec) => (
            <div
              key={rec.id}
              className={`rounded-lg border-l-4 p-4 ${getSeverityColor(rec.severity)}`}
            >
              <div className="flex items-start gap-3 mb-2">
                <div className="text-lg">{getCategoryIcon(rec.category)}</div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold">{rec.title}</h4>
                      <p className="text-sm mt-1">{rec.description}</p>
                    </div>
                    <Badge className={`flex-shrink-0 text-xs font-semibold`}>
                      {rec.severity.toUpperCase()}
                    </Badge>
                  </div>
                  {rec.affectedLoans.length > 0 && (
                    <p className="text-xs mt-2">
                      <strong>Affected:</strong> {rec.affectedLoans.join(', ')}
                    </p>
                  )}
                  <p className="text-xs mt-2 italic">{rec.action}</p>
                </div>
              </div>
            </div>
          ))
        )}

        {/* Call-to-action buttons */}
        {recommendations.length > 0 && (
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => {
                const csv = recommendations.map(r => `"${r.title}","${r.severity}","${r.description}","${r.action}"`).join('\n');
                const bom = '\uFEFF';
                const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `recommendations_${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export Recommendations
            </Button>
            <Button size="sm" className="flex-1">
              Create Action Items
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
