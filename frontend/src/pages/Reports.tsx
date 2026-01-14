import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { useGreenGaugeStore } from '@/store/useGreenGaugeStore';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { usePortfolioStatus } from '@/hooks/usePortfolioStatus';
import { calculatePortfolioSummary } from '@/data/generatedMockLoans';
import { formatCurrency, formatEnergyGWh, formatCO2 } from '@/utils/formatters';
import { useGlobalData } from '@/context/GlobalDataContext';
import { calculatePortfolioGreenScore } from '@/lib/greenScore';
import { FileText, Download, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ReportModal from '@/components/ReportModal';
import { logger } from '@/lib/logger';
import { generateCSRDReportPDF } from '@/utils/generatePDF';
import Skeleton from '@/components/Skeleton';

const Reports = () => {
  // Prefer canonical loans from PortfolioContext to ensure single source of truth
  const { loans: ctxLoans, updateSimulatorParameters, simulation } = usePortfolio();
  const [reportMode, setReportMode] = useState<'baseline' | 'custom'>('baseline');
  const [customEbitdaDrop, setCustomEbitdaDrop] = useState(simulation?.ebitdaDrop || 0);
  const [customRateHike, setCustomRateHike] = useState(simulation?.interestRateHike || 0);
  const { toast } = useToast();

  const complianceChecks = [
    { name: 'CSRD Data Collection', status: 'complete', description: 'ESG metrics and financial data aggregated' },
    { name: 'EU Taxonomy Assessment', status: 'complete', description: 'Portfolio aligned with EU Taxonomy' },
    { name: 'TCFD Disclosure', status: 'complete', description: 'Climate risk disclosures prepared' },
    { name: 'Stress Testing', status: 'complete', description: 'Portfolio stress tested under scenarios' },
  ];

  // Determine which scenario to use for report
  const reportEbitdaDrop = reportMode === 'baseline' ? 0 : customEbitdaDrop;
  const reportRateHike = reportMode === 'baseline' ? 0 : customRateHike;

  // Calculate compliance metrics
  const euTaxonomyAligned = ctxLoans.filter(loan => calculatePortfolioGreenScore([loan], reportEbitdaDrop, reportRateHike) >= 50).length;
  const euTaxonomyPercentage = ctxLoans.length > 0 ? (euTaxonomyAligned / ctxLoans.length) * 100 : 0;
  const greenBondEligible = ctxLoans
    .filter(loan => calculatePortfolioGreenScore([loan], reportEbitdaDrop, reportRateHike) >= 80)
    .reduce((sum, loan) => sum + ((loan as any).loanAmount || (loan as any).amount || 0), 0);
  const complianceTimeSaved = 120; // hours per year through automation

  // Get portfolio summary for ESG metrics
  const global = useGlobalData();
  const summary = reportMode === 'baseline' ? global.portfolioSummary : calculatePortfolioSummary(ctxLoans);

  // Ensure clean energy uses loan-level ESG metrics or gwh fields (match Green tab logic)
  const cleanEnergyFromAllLoans = (global.allLoans || []).reduce((sum: number, loan: any) => {
    // prefer explicit gwh field
    if (typeof loan.gwh === 'number' && Number.isFinite(loan.gwh)) return sum + loan.gwh;
    if (typeof loan.renewableEnergyGenerated === 'number' && Number.isFinite(loan.renewableEnergyGenerated)) return sum + loan.renewableEnergyGenerated;
    // fallback to scanning esgMetrics for energy metric
    const energyMetric = (loan.esgMetrics || []).find((m: any) => (m.name || '').toLowerCase().includes('energy') && ((m.unit || '').toLowerCase().includes('wh') || (m.unit || '').toLowerCase().includes('gwh') || (m.unit || '').toLowerCase().includes('mwh')));
    if (energyMetric && typeof energyMetric.currentValue === 'number' && Number.isFinite(energyMetric.currentValue)) return sum + energyMetric.currentValue;
    return sum;
  }, 0);

  const cleanEnergy = reportMode === 'baseline'
    ? (cleanEnergyFromAllLoans || global.portfolioSummary?.renewableEnergyGenerated || 80064)
    : (summary.renewableEnergyGenerated || 0);

  // Get portfolio status for the selected scenario
  const portfolioStatus = usePortfolioStatus(ctxLoans, reportEbitdaDrop, reportRateHike);
  const {
    breachedLoanCount,
    atRiskLoanCount,
    totalBreaches,
    totalPortfolioValue,
    portfolioGreenScore
  } = portfolioStatus;

  const [exporting, setExporting] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportPreviewData, setReportPreviewData] = useState<any>(null);

  const handleExport = async () => {
    try {
      setExporting(true);
      toast({ title: 'Generating PDF', description: 'Preparing report — this may take a few seconds.' });
      // Prepare portfolio data for PDF export
      const breachDetails = portfolioStatus.loans
        .filter((ls) => ls.status === 'BREACHED')
        .flatMap((ls) =>
          ls.covenants
            .filter((c) => c.status === 'breach')
            .map((c) => ({
              company: ls.loan.companyName,
              covenant: c.name,
              stressedValue: c.stressedValue,
              threshold: c.threshold,
              severity: Math.abs(c.breachMargin),
            }))
        );

      const atRiskDetails = portfolioStatus.loans
        .filter((ls) => ls.status === 'AT_RISK')
        .flatMap((ls) =>
          ls.covenants
            .filter((c) => c.status === 'warning')
            .map((c) => ({
              company: ls.loan.companyName,
              covenant: c.name,
              stressedValue: c.stressedValue,
              threshold: c.threshold,
              cushion: c.cushionPercent,
            }))
        );

      // Build portfolio data for PDF
      const portfolioData = {
        totalLoans: portfolioStatus.totalLoanCount,
        totalPortfolioValue: totalPortfolioValue / 1000000, // Convert to millions
        breachedLoans: breachedLoanCount,
        atRiskLoans: atRiskLoanCount,
        totalBreaches: totalBreaches,
        portfolioGreenScore: portfolioGreenScore,
        avgRiskScore: portfolioStatus.avgRiskScore,
        esgResilience: portfolioGreenScore,
        co2Reduced: Math.round(summary.totalCO2Reduced / 1000),
        cleanEnergyGWh: cleanEnergy,
        portfolioHeatIndex: breachedLoanCount + atRiskLoanCount,
        loans: portfolioStatus.loans.map((ls) => ({
          company: ls.loan.companyName,
          sector: ls.loan.sector,
          amount: ls.loan.loanAmount / 1000000,
          status: ls.status === 'BREACHED' ? 'Breached' : ls.status === 'AT_RISK' ? 'At Risk' : 'Safe',
          esgRating: portfolioGreenScore >= 80 ? 'Dark Green' : portfolioGreenScore >= 50 ? 'Light Green' : 'Transition',
          riskScore: ls.loan.riskScore.overall,
        })),
        breachedLoanDetails: breachDetails,
        atRiskLoanDetails: atRiskDetails,
        complianceStatus: complianceChecks.map((c) => ({
          name: c.name,
          status: c.status === 'complete' ? 'Complete' : 'Pending',
        })),
      };

      // Generate scenario label
      const scenarioLabel =
        reportMode === 'baseline'
          ? 'Baseline (No Stress)'
          : `Custom Scenario: ${reportEbitdaDrop}% EBITDA Drop, ${reportRateHike} bps Rate Hike`;

      // Generate PDF
      await generateCSRDReportPDF(portfolioData as any, scenarioLabel);

      // Show success toast
      toast({ title: 'PDF Generated Successfully', description: 'CSRD compliance report has been downloaded.' });
    } catch (error) {
      logger.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate PDF report. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6 animate-fade-in-up">
        <h1 className="font-display text-3xl font-bold text-foreground">CSRD Reports</h1>
        <p className="text-muted-foreground mt-1">Generate compliance reports for regulatory submission</p>
      </div>

      <div className="space-y-6">
        {/* Report Generation Options */}
        <Card>
          <CardHeader>
            <CardTitle>Report Generation Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={reportMode} onValueChange={(value) => setReportMode(value as 'baseline' | 'custom')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="baseline" id="baseline" />
                <Label htmlFor="baseline" className="cursor-pointer">Use Current Baseline</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom" className="cursor-pointer">Use Custom Stress Scenario</Label>
              </div>
            </RadioGroup>

            {reportMode === 'custom' && (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label htmlFor="custom-ebitda">EBITDA Drop (%)</Label>
                  <Input
                    id="custom-ebitda"
                    type="number"
                    min="0"
                    max="100"
                    value={customEbitdaDrop}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setCustomEbitdaDrop(val);
                      try { updateSimulatorParameters(val, customRateHike); } catch (err) {}
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custom-rate">Rate Hike (bps)</Label>
                  <Input
                    id="custom-rate"
                    type="number"
                    min="0"
                    value={customRateHike}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setCustomRateHike(val);
                      try { updateSimulatorParameters(customEbitdaDrop, val); } catch (err) {}
                    }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="animate-fade-in-up stagger-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Portfolio Summary Report
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ctxLoans.length === 0 ? (
                <Skeleton rows={4} />
              ) : (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-muted-foreground">Total Loans</p>
                    <p className="text-2xl font-bold">{portfolioStatus.totalLoanCount}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-muted-foreground">Portfolio Value</p>
                    <p className="text-2xl font-bold">{formatCurrency(totalPortfolioValue, 'billions')}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-muted-foreground">CO₂ Reduced</p>
                    <p className="text-2xl font-bold">{formatCO2(summary.totalCO2Reduced)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-muted-foreground">Clean Energy</p>
                    <p className="text-2xl font-bold">{formatEnergyGWh(cleanEnergy)}</p>
                  </div>
                </div>
              )}
              {reportMode === 'custom' && (
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
                  <p className="text-xs text-blue-900 dark:text-blue-100">
                    <strong>Scenario:</strong> {reportEbitdaDrop}% EBITDA drop, {reportRateHike} bps rate increase
                  </p>
                  <p className="text-xs text-blue-800 dark:text-blue-200 mt-1">
                    Breached: {breachedLoanCount} loans | At Risk: {atRiskLoanCount} loans | Green Score: {portfolioGreenScore}/100
                  </p>
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={() => {
                  try {
                    const breachedLoansArr = portfolioStatus.loans.filter(ls => ls.status === 'BREACHED').map(ls => ({
                      company: ls.loan.companyName,
                      covenants: (ls.covenants || []).slice(0,3).map(c => ({ type: c.type || 'Unknown', threshold: c.threshold, current: c.current })),
                      daysToBreach: ls.loan.daysToBreach || null,
                      severity: 'CRITICAL',
                      recommendedAction: 'Initiate covenant waiver discussion'
                    }));

                    const atRiskLoansArr = portfolioStatus.loans.filter(ls => ls.status === 'AT_RISK').map(ls => ({
                      company: ls.loan.companyName,
                      covenants: (ls.covenants || []).slice(0,3).map(c => ({ type: c.type || 'Unknown', threshold: c.threshold, current: c.current })),
                      daysToBreach: ls.loan.daysToBreach || null,
                      trendPct: ls.loan.trendPct || null,
                      recommendedAction: 'Monitor and engage borrower'
                    }));

                    const portfolioData = {
                      totalLoans: portfolioStatus.totalLoanCount,
                      totalPortfolioValue: totalPortfolioValue / 1000000,
                      breachedLoans: breachedLoansArr,
                      atRiskLoans: atRiskLoansArr,
                      totalBreaches: totalBreaches,
                      portfolioGreenScore: portfolioGreenScore,
                      avgRiskScore: portfolioStatus.avgRiskScore,
                      esgResilience: portfolioGreenScore,
                      co2Reduced: Math.round(summary.totalCO2Reduced / 1000),
                      cleanEnergyGWh: cleanEnergy,
                      portfolioHeatIndex: breachedLoanCount + atRiskLoanCount,
                      loans: portfolioStatus.loans.map((ls) => ({ company: ls.loan.companyName, sector: ls.loan.sector, amount: ls.loan.loanAmount / 1000000, status: ls.status })),
                      complianceStatus: complianceChecks.map((c) => ({ name: c.name, status: c.status }))
                    } as any;
                    setReportPreviewData(portfolioData);
                    setReportModalOpen(true);
                  } catch (err) {
                    logger.error('Preview failed', err);
                    toast({ title: 'Preview failed', description: 'Unable to open preview. Try again.', variant: 'destructive' });
                  }
                }} className="w-1/2 gap-2">
                  <FileText className="w-4 h-4" />
                  View Preview
                </Button>
                <Button onClick={handleExport} className="w-1/2 gap-2" disabled={exporting}>
                  {exporting ? (
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {exporting ? 'Exporting...' : 'Export CSRD Report'}
                </Button>
              </div>
            </CardContent>
          </Card>

        <Card className="animate-fade-in-up stagger-2">
          <CardHeader>
            <CardTitle>Compliance Checklist</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              CSRD, EU Taxonomy, and TCFD compliance status
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3">
              {complianceChecks.map((check) => (
                <li key={check.name} className="p-3 rounded-lg bg-muted/50 border">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{check.name}</span>
                    {check.status === 'complete' ? (
                      <Badge variant="success" className="gap-1 inline-flex items-center"><CheckCircle2 className="w-3 h-3" /> Complete</Badge>
                    ) : (
                      <Badge variant="warning" className="gap-1 inline-flex items-center"><Clock className="w-3 h-3" /> Pending</Badge>
                    )}
                  </div>
                  {check.description && (
                    <p className="text-xs text-muted-foreground mt-1">{check.description}</p>
                  )}
                </li>
              ))}
            </ul>

            {/* Compliance Summary */}
            <div className="pt-4 border-t space-y-3">
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  EU Taxonomy Alignment
                </p>
                  <p className="text-xs text-blue-800 dark:text-blue-200">
                  Portfolio {euTaxonomyPercentage.toFixed(0)}% aligned with EU Taxonomy Green Activities ({euTaxonomyAligned} of {ctxLoans.length} loans)
                </p>
              </div>

              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                <p className="text-sm font-semibold text-green-900 dark:text-green-100 mb-1">
                  Green Bond Eligibility
                </p>
                <p className="text-xs text-green-800 dark:text-green-200">
                  €{(greenBondEligible / 1000000).toFixed(0)}M of €{(totalPortfolioValue / 1000000).toFixed(0)}M portfolio eligible for green bond funding (Dark Green loans only)
                </p>
              </div>

              <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900">
                <p className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-1">
                  Compliance Time Saved
                </p>
                <p className="text-xs text-purple-800 dark:text-purple-200">
                  Estimated CSRD compliance time saved: {complianceTimeSaved} hours/year through automation
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
        {reportModalOpen && (
          <ReportModal
            open={reportModalOpen}
            onClose={() => setReportModalOpen(false)}
            pdfBlob={null}
            htmlPreview={null}
            filename={`GreenGauge_Report_${new Date().toISOString().slice(0,10)}.pdf`}
            reportType={'compliance'}
            reportData={reportPreviewData}
          />
        )}
      </DashboardLayout>
  );
};

export default Reports;


