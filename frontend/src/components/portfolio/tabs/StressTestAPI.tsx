/**
 * StressTestAPI - Stress Test Scenarios with API Integration
 * Displays 4 stress test scenarios: baseline, rate+2%, EBITDA-10%, ESG miss, combined
 */

import { useState } from 'react';
import { useScenarios } from '@/hooks/useScenariosAPI';
import { usePortfolio } from '@/contexts/PortfolioContext';
import reportService, { generateReportPDF } from '@/services/reportService.js';
const { useReportService } = reportService as any;
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ArrowLeft,
  BarChart3,
} from 'lucide-react';

interface StressTestAPIProps {
  onNavigate: (tab: string) => void;
}

const StressTestAPI = ({ onNavigate }: StressTestAPIProps) => {
  const { scenarios, loading, error } = useScenarios();
  const [selectedScenario, setSelectedScenario] = useState<string>('baseline');
  const { setScenario } = usePortfolio() as any;
  const { getPortfolioData, calculateReportMetrics } = useReportService();
  const [isApplying, setIsApplying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const formatPercentage = (value: number) => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const getScenarioColor = (scenarioId: string) => {
    switch (scenarioId) {
      case 'baseline':
        return 'bg-blue-50 border-blue-200';
      case 'rate_plus_2':
        return 'bg-orange-50 border-orange-200';
      case 'ebitda_minus_10':
        return 'bg-red-50 border-red-200';
      case 'esg_miss':
        return 'bg-purple-50 border-purple-200';
      case 'combined':
        return 'bg-red-100 border-red-300';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getScenarioIcon = (scenarioId: string) => {
    switch (scenarioId) {
      case 'baseline':
      case 'rate_plus_2':
        return <TrendingUp className="w-5 h-5 text-orange-600" />;
      case 'ebitda_minus_10':
      case 'esg_miss':
        return <TrendingDown className="w-5 h-5 text-red-600" />;
      case 'combined':
        return <AlertTriangle className="w-5 h-5 text-red-700" />;
      default:
        return <BarChart3 className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-teal-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading scenarios...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-300">
        <CardContent className="p-6">
          <p className="text-red-600">Error loading scenarios: {error}</p>
        </CardContent>
      </Card>
    );
  }

  const currentScenario = scenarios[selectedScenario];

  const handleApplyScenario = (scenarioId: string) => {
    const s = scenarios[scenarioId];
    if (!s) return;
    // map assumptions to setScenario params
    const e = s.assumptions?.ebitdaChange ?? s.assumptions?.ebitdaChange ?? 0;
    const r = s.assumptions?.interestRateChange ?? s.assumptions?.rateHike ?? 0;
    try {
      setIsApplying(true);
      setScenario({ ebitdaDrop: e, interestRateHike: r });
      toast.success(`Applied scenario: ${s.scenarioName}`);
    } catch (err) {
      logger.error('Failed to apply scenario', err);
      toast.error('Failed to apply scenario');
    }
    finally { setIsApplying(false); }
  };

  const handleExportPdf = async () => {
    try {
      setIsExporting(true);
      toast('Generating PDF...', { duration: 2000 });
      const portfolioData = getPortfolioData();
      const scenarioParams = currentScenario?.assumptions || {};
      const blob = await generateReportPDF('stress', portfolioData, scenarioParams);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stress-report-${selectedScenario}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.success('Stress test PDF downloaded');
    } catch (e) {
      logger.error('Export failed', e);
      toast.error('Failed to export PDF');
    }
    finally { setIsExporting(false); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Stress Test Scenarios
          </h1>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Covenant Breach Simulator v1.0</p>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Analyze portfolio impact under different market conditions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => onNavigate('summary')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>

          <Button
            onClick={() => handleApplyScenario(selectedScenario)}
            className="btn-gradient"
            disabled={isApplying || !currentScenario || !(currentScenario.results && currentScenario.results.affectedLoans && currentScenario.results.affectedLoans.length > 0)}
            aria-busy={isApplying}
            title={!currentScenario || !(currentScenario.results && currentScenario.results.affectedLoans && currentScenario.results.affectedLoans.length > 0) ? 'Scenario not applicable' : 'Apply scenario'}
          >
            {isApplying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Apply Scenario
          </Button>

          <Button
            onClick={handleExportPdf}
            className="btn-gradient"
            disabled={isExporting || !currentScenario || !(currentScenario.results && currentScenario.results.affectedLoans && currentScenario.results.affectedLoans.length > 0)}
            aria-busy={isExporting}
            title={!currentScenario || !(currentScenario.results && currentScenario.results.affectedLoans && currentScenario.results.affectedLoans.length > 0) ? 'Nothing to export' : 'Export PDF'}
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Export PDF
          </Button>
        </div>
      </div>

      {/* Scenario Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {Object.entries(scenarios).map(([scenarioId, scenario]) => (
          <button
            key={scenarioId}
            onClick={() => setSelectedScenario(scenarioId)}
            disabled={!(scenario.results && scenario.results.affectedLoans && scenario.results.affectedLoans.length > 0)}
            title={!(scenario.results && scenario.results.affectedLoans && scenario.results.affectedLoans.length > 0) ? 'Scenario not applicable to current data' : ''}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              selectedScenario === scenarioId
                ? 'border-teal-600 bg-teal-50 dark:bg-teal-950'
                : getScenarioColor(scenarioId)
            } ${!(scenario.results && scenario.results.affectedLoans && scenario.results.affectedLoans.length > 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-start gap-2 mb-2">
              {getScenarioIcon(scenarioId)}
              <h3 className="font-semibold text-sm">{scenario.scenarioName}</h3>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">{scenario.description}</p>
            <div className="mt-3 pt-3 border-t border-gray-300/50">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Impact: <span className="font-bold">{formatPercentage(scenario.results.portfolioImpactPercent)}</span>
              </p>
            </div>
          </button>
        ))}
      </div>

      {currentScenario && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Compliance Rate */}
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Compliance Rate</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {currentScenario.results.complianceRate.toFixed(1)}%
                </p>
                <Badge
                  className={`mt-2 ${
                    currentScenario.results.complianceRate >= 80
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {currentScenario.results.complianceRate >= 80 ? 'Acceptable' : 'At Risk'}
                </Badge>
              </CardContent>
            </Card>

            {/* Breach Count */}
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Breached Covenants</p>
                <p className="text-3xl font-bold text-red-600">
                  {currentScenario.results.breachCount}
                </p>
                <p className="text-xs text-red-600 mt-2">
                  {currentScenario.results.affectedLoans.filter(l => l.status === 'breached').length} loans
                </p>
              </CardContent>
            </Card>

            {/* At Risk */}
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">At Risk</p>
                <p className="text-3xl font-bold text-orange-600">
                  {currentScenario.results.atRiskCount}
                </p>
                <p className="text-xs text-orange-600 mt-2">
                  {currentScenario.results.affectedLoans.filter(l => l.status === 'at_risk').length} loans
                </p>
              </CardContent>
            </Card>

            {/* Recovery Period */}
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Recovery Period</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {currentScenario.results.estimatedRecoveryPeriod}
                </p>
                <p className="text-xs text-gray-600 mt-2">to return to baseline</p>
              </CardContent>
            </Card>
          </div>

          {/* Affected Loans */}
          {currentScenario.results.affectedLoans.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Affected Loans ({currentScenario.results.affectedLoans.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {currentScenario.results.affectedLoans.map((loan, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border border-gray-200 ${
                        loan.status === 'breached'
                          ? 'bg-red-50'
                          : loan.status === 'at_risk'
                          ? 'bg-orange-50'
                          : 'bg-green-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{loan.companyName}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {loan.previousStatus} → {loan.status}
                            </Badge>
                            <span className="text-xs text-gray-600">
                              {loan.covenantsCrossedCount} covenant{loan.covenantsCrossedCount !== 1 ? 's' : ''} crossed
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold text-sm ${
                            loan.impactPercent > 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {formatPercentage(loan.impactPercent)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* No Affected Loans */}
          {currentScenario.results.affectedLoans.length === 0 && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-900">No Affected Loans</p>
                    <p className="text-sm text-green-700 mt-1">
                      Portfolio remains resilient under this scenario
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default StressTestAPI;
