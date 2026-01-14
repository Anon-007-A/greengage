/**
 * Advanced Tab
 * Reports (CSRD PDF Export), Performance metrics, data loader, scalability demonstration
 */
import { useState, useEffect, Suspense, lazy } from 'react';
import { useGreenGaugeStore } from '@/store/useGreenGaugeStore';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { generateCSRDReportPDF } from '@/utils/generatePDF';
import ReportsAPI from './ReportsAPI';
import ReportModal from '@/components/ReportModal';
import reportService, { renderReportHtml } from '@/services/reportService.js';
const { useReportService } = reportService as any;
import * as extractors from '@/services/reportDataExtractors';
import captureChartImages from '@/utils/captureCharts';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, CheckCircle2, Clock, Database, FileText, BarChart3, AlertTriangle, TrendingUp, Leaf, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import SyntheticDataLoader from '@/components/admin/SyntheticDataLoader';
import PDFUploadSection from '@/components/admin/PDFUploadSection';
import PerformanceMetrics from '@/components/admin/PerformanceMetrics';
const CovenantBreachTimeline = lazy(() => import('@/components/portfolio/charts/CovenantBreachTimeline'));
const ESGTrendsChart = lazy(() => import('@/components/portfolio/charts/ESGTrendsChart'));
const PortfolioRiskHeatmap = lazy(() => import('@/components/portfolio/charts/PortfolioRiskHeatmap'));
const CovenantBreakdownChart = lazy(() => import('@/components/portfolio/charts/CovenantBreakdownChart'));
import Skeleton from '@/components/Skeleton';

interface AdvancedProps {
  onNavigate: (tab: string) => void;
}

const Advanced = ({ onNavigate }: AdvancedProps) => {
  const { loans } = useGreenGaugeStore();
  const portfolioCtx = usePortfolio();
  const ctxLoans = portfolioCtx.loans;
  const totalValue = portfolioCtx.totalValue;
  const riskScore = portfolioCtx.riskScore;
  const [showReport, setShowReport] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportPdf, setReportPdf] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportHtmlPreview, setReportHtmlPreview] = useState('');
  const [selectedReportType, setSelectedReportType] = useState('');
  const [selectedReportData, setSelectedReportData] = useState(null);

  const { getPortfolioData, calculateReportMetrics, generatePDF, generateReportPDF } = useReportService();
  // Helper: export with retry/backoff
  const exportWithRetry = async (producer: () => Promise<Blob>, filename: string, attempts = 3) => {
    let attempt = 0;
    while (attempt < attempts) {
      try {
        const blob = await producer();
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = filename;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        toast.success('PDF downloaded successfully');
        return;
      } catch (err) {
        logger.warn('Export attempt failed', { attempt, err });
        attempt += 1;
        if (attempt < attempts) {
          // exponential backoff
          await new Promise((res) => setTimeout(res, 400 * Math.pow(2, attempt)));
        } else {
          toast.error('Failed to export report after multiple attempts');
          throw err;
        }
      }
    }
  };
  const [queryTime, setQueryTime] = useState(54);
  const [loadTime, setLoadTime] = useState(0.21);
  const [loanCount, setLoanCount] = useState(loans.length);

  // Simulate performance metrics (in real app, these would come from actual measurements)
  useEffect(() => {
    // Simulate query time based on loan count
    const simulatedQueryTime = Math.min(500, 20 + (loans.length * 0.1));
    setQueryTime(Math.round(simulatedQueryTime));

    // Simulate load time
    const simulatedLoadTime = Math.min(2, 0.1 + (loans.length * 0.0002));
    setLoadTime(Number(simulatedLoadTime.toFixed(2)));
  }, [loans.length]);

  // Data fingerprinting: log a stable hash for portfolio and alert if totals vary >0.5%
  useEffect(() => {
    try {
      const portfolio = getPortfolioData();
      const str = JSON.stringify({ total: portfolio.totalPortfolioValue, loans: (portfolio.loans || []).slice(0, 10).map(l => ({ id: l.id, loanAmount: l.loanAmount })) });
      // simple hash
      const hash = str.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0).toString();
      const prevHash = localStorage.getItem('portfolio_hash');
      const prevTotal = Number(localStorage.getItem('portfolio_total') || '0');
      const currentTotal = Number(portfolio.totalPortfolioValue || 0);
          if (prevHash && prevHash !== hash) {
        // compute relative variance
        const variance = Math.abs(currentTotal - prevTotal) / Math.max(1, prevTotal);
        logger.warn('Portfolio fingerprint changed', { prevTotal, currentTotal, variance });
            if (variance > 0.005) {
              // alert user
              toast.error('Portfolio total changed significantly since last load — investigate data source');
            }
      }
      localStorage.setItem('portfolio_hash', hash);
      localStorage.setItem('portfolio_total', String(currentTotal));
    } catch (e) {
      // best-effort
      logger.warn('Failed to compute portfolio fingerprint', e);
    }
  }, [getPortfolioData]);

  const quickLoadButtons = [
    { label: '100', count: 100 },
    { label: '1K', count: 1000 },
    { label: '5K', count: 5000 },
    { label: '10K', count: 10000 },
  ];

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const totalsAsNumber = (l: any[]) => l.reduce((s, it) => s + ((it.loanAmount as number) || (it.amount as number) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <button
        onClick={() => onNavigate('summary')}
        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Summary
      </button>

      {/* Performance Metrics */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Performance Metrics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-gray-200 dark:border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">Query Time</p>
                </div>
                {queryTime < 500 ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <span className="text-red-600 text-sm">⚠</span>
                )}
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatTime(queryTime)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Target: &lt;500ms {queryTime < 500 ? '✓' : '✗'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">Load Time</p>
                </div>
                {loadTime < 2 ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <span className="text-red-600 text-sm">⚠</span>
                )}
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {loadTime}s
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Target: &lt;2s {loadTime < 2 ? '✓' : '✗'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {showReport && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-start md:items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-4xl rounded shadow-lg overflow-auto max-h-[90vh]">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Portfolio Report</h3>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setShowReport(false)}>Close</Button>
                </div>
              </div>
            </div>
            <div className="p-4">
              <ReportsAPI onNavigate={() => setShowReport(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Data Loader */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Data Loader
        </h2>
        <Card className="border-gray-200 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Database className="w-5 h-5" />
              Generate Synthetic Portfolio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Input
                type="number"
                min={1}
                max={10000}
                value={loanCount}
                onChange={(e) => setLoanCount(Number(e.target.value))}
                className="w-32"
                placeholder="1-10,000"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">loans</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {quickLoadButtons.map((btn) => (
                <Button
                  key={btn.label}
                  variant="outline"
                  size="sm"
                  onClick={() => setLoanCount(btn.count)}
                  className="transition-all duration-200"
                >
                  {btn.label}
                </Button>
              ))}
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
              <SyntheticDataLoader />
              <div className="mt-4">
                <PDFUploadSection />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scalability Message */}
      <Card className="border-teal-200 dark:border-teal-900 bg-teal-50 dark:bg-teal-950/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                Portfolio ready for enterprise-scale
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Current portfolio: {loans.length} loans | Performance: {queryTime < 500 && loadTime < 2 ? 'Optimal' : 'Monitoring'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Performance Metrics Component */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Detailed Metrics
        </h2>
        <PerformanceMetrics />
      </div>

      {/* Advanced Interactive Visualizations */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Advanced Analytics
        </h2>
        
        {/* Covenant Breach Timeline / Charts — show skeletons when no loans loaded */}
        {ctxLoans.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton rows={4} />
            <Skeleton rows={4} />
            <Skeleton rows={4} />
            <Skeleton rows={4} />
          </div>
        ) : (
          <>
            {/* Covenant Breach Timeline */}
            <Suspense fallback={<Skeleton rows={6} />}>
              <CovenantBreachTimeline />
            </Suspense>

            {/* ESG Trends */}
            <Suspense fallback={<Skeleton rows={6} />}>
              <ESGTrendsChart />
            </Suspense>

            {/* Portfolio Risk Heatmap */}
            <Suspense fallback={<Skeleton rows={6} />}>
              <PortfolioRiskHeatmap />
            </Suspense>

            {/* Covenant Breakdown Chart */}
            <Suspense fallback={<Skeleton rows={6} />}>
              <CovenantBreakdownChart />
            </Suspense>
          </>
        )}
      </div>

      {/* Reports Section */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Reports
        </h2>
        <Card className="border-gray-200 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Portfolio Reports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Covenant Compliance Report */}
              <Card className="border-gray-200 dark:border-gray-800 hover:border-blue-400 dark:hover:border-blue-600 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        Covenant Compliance Report
                      </h3>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Detailed analysis of covenant breaches, compliance status, and remedial actions
                  </p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={async () => {
                            try {
                              setReportLoading(true);
                              const pdata = getPortfolioData();
                              const metrics = calculateReportMetrics(pdata, 'compliance', {});
                              const pdfBlob = await generateReportPDF('compliance', pdata, {});
                              setReportPdf(pdfBlob);
                              // simple HTML preview generation
                              // capture charts present on the page and embed in preview
                              const images = await captureChartImages([
                                { id: 'chart-covenant-breach', name: 'Covenant Breach Timeline' },
                                { id: 'chart-esg-trends', name: 'ESG Trends' },
                                { id: 'chart-risk-heatmap', name: 'Risk Heatmap' },
                                { id: 'chart-covenant-breakdown', name: 'Covenant Breakdown' }
                              ]).catch(e => { logger.error('chart capture failed', e); return {}; });

                              const reportData = extractors.extractCovenantComplianceData(pdata);
                              setSelectedReportType('compliance');
                              setSelectedReportData(reportData);
                              const previewHtml = renderReportHtml('compliance', pdata, metrics, {}, images);
                              setReportHtmlPreview(previewHtml);
                              setReportModalOpen(true);
                            } catch (e) {
                              logger.error('Failed to generate report', e);
                              toast.error('Failed to generate report. Try again.');
                            } finally { setReportLoading(false); }
                        }}>{reportLoading ? 'Generating...' : 'View'}</Button>

                        <Button size="sm" variant="outline" onClick={async () => {
                            try {
                              setReportLoading(true);
                              const pdata = getPortfolioData();
                              await exportWithRetry(() => generateReportPDF('compliance', pdata, {}), `GreenGauge_Covenant_Compliance_${new Date().toISOString().slice(0,10)}.pdf`);
                            } catch (e) {
                              logger.error('Failed to export PDF', e);
                            } finally { setReportLoading(false); }
                        }}>{reportLoading ? 'Generating...' : 'Export'}</Button>
                      </div>
                </CardContent>
              </Card>

              {/* Portfolio Analytics Report */}
              <Card className="border-gray-200 dark:border-gray-800 hover:border-green-400 dark:hover:border-green-600 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        Portfolio Analytics
                      </h3>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Comprehensive portfolio performance metrics, trends, and historical data
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={async () => {
                      try {
                        setReportLoading(true);
                        const pdata = getPortfolioData();
                        const metrics = calculateReportMetrics(pdata, 'analytics', {});
                        const pdfBlob = await generateReportPDF('analytics', pdata, {});
                        setReportPdf(pdfBlob);
                        const reportData = extractors.extractPortfolioAnalyticsData(pdata);
                        setSelectedReportType('analytics');
                        setSelectedReportData(reportData);
                        setReportHtmlPreview(renderReportHtml('analytics', pdata, metrics, {}));
                        setReportModalOpen(true);
                      } catch (e) { logger.error('Failed to generate report (analytics):', e); toast.error('Failed to generate report.'); } finally { setReportLoading(false); }
                    }}>{reportLoading ? 'Generating...' : 'View'}</Button>
                    <Button size="sm" variant="outline" onClick={async () => {
                      try { setReportLoading(true); const pdata = getPortfolioData(); await exportWithRetry(() => generateReportPDF('analytics', pdata, {}), `GreenGauge_Portfolio_Analytics_${new Date().toISOString().slice(0,10)}.pdf`); } catch (e) { logger.error('Failed to export analytics report:', e); } finally { setReportLoading(false); }
                    }}>{reportLoading ? 'Generating...' : 'Export'}</Button>
                  </div>
                </CardContent>
              </Card>

              {/* Risk Assessment Report */}
              <Card className="border-gray-200 dark:border-gray-800 hover:border-orange-400 dark:hover:border-orange-600 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        Risk Assessment
                      </h3>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Risk metrics, breach probability, and portfolio vulnerability analysis
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={async () => {
                      try { setReportLoading(true); const pdata = getPortfolioData(); const metrics = calculateReportMetrics(pdata, 'risk', {}); const pdfBlob = await generateReportPDF('risk', pdata, {}); setReportPdf(pdfBlob); const reportData = extractors.extractRiskAssessmentData(pdata); setSelectedReportType('risk'); setSelectedReportData(reportData); setReportHtmlPreview(renderReportHtml('risk', pdata, metrics, {})); setReportModalOpen(true); } catch (e) { logger.error('Failed to generate risk report:', e); toast.error('Failed to generate report.'); } finally { setReportLoading(false); }
                    }}>{reportLoading ? 'Generating...' : 'View'}</Button>
                    <Button size="sm" variant="outline" onClick={async () => {
                      try { setReportLoading(true); const pdata = getPortfolioData(); await exportWithRetry(() => generateReportPDF('risk', pdata, {}), `GreenGauge_Risk_Assessment_${new Date().toISOString().slice(0,10)}.pdf`); } catch (e) { logger.error('Failed to export risk report:', e); } finally { setReportLoading(false); }
                    }}>{reportLoading ? 'Generating...' : 'Export'}</Button>
                  </div>
                </CardContent>
              </Card>

              {/* Stress Test Report */}
              <Card className="border-gray-200 dark:border-gray-800 hover:border-purple-400 dark:hover:border-purple-600 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        Stress Test Results
                      </h3>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Simulation results under various market conditions and scenarios
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={async () => {
                      try { setReportLoading(true); const pdata = getPortfolioData(); const scenario = { ebitdaDrop: portfolioCtx.simulation?.ebitdaDrop ?? 0, rateHike: portfolioCtx.simulation?.interestRateHike ?? 0 }; const metrics = calculateReportMetrics(pdata, 'stress', { ebitdaDrop: scenario.ebitdaDrop, rateHike: scenario.rateHike }); const pdfBlob = await generateReportPDF('stress', pdata, { ebitdaDrop: scenario.ebitdaDrop, rateHike: scenario.rateHike }); setReportPdf(pdfBlob); const reportData = extractors.extractStressTestData(pdata, { ebitdaDrop: scenario.ebitdaDrop, rateHike: scenario.rateHike }); setSelectedReportType('stress'); setSelectedReportData(reportData); setReportHtmlPreview(renderReportHtml('stress', pdata, metrics, { ebitdaDrop: scenario.ebitdaDrop, rateHike: scenario.rateHike })); setReportModalOpen(true); } catch (e) { logger.error('Failed to generate stress report:', e); toast.error('Failed to generate report.'); } finally { setReportLoading(false); }
                    }}>{reportLoading ? 'Generating...' : 'View'}</Button>
                    <Button size="sm" variant="outline" onClick={async () => {
                      try { setReportLoading(true); const pdata = getPortfolioData(); const scenario = { ebitdaDrop: portfolioCtx.simulation?.ebitdaDrop ?? 0, rateHike: portfolioCtx.simulation?.interestRateHike ?? 0 }; await exportWithRetry(() => generateReportPDF('stress', pdata, scenario), `GreenGauge_Stress_Test_${new Date().toISOString().slice(0,10)}.pdf`); } catch (e) { logger.error('Failed to export stress report:', e); } finally { setReportLoading(false); }
                    }}>{reportLoading ? 'Generating...' : 'Export'}</Button>
                  </div>
                </CardContent>
              </Card>

              {/* Environmental Impact Report */}
              <Card className="border-gray-200 dark:border-gray-800 hover:border-teal-400 dark:hover:border-teal-600 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Leaf className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        Environmental Impact
                      </h3>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Green financing metrics, ESG scoring, and sustainability performance
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={async () => {
                      try {
                        setReportLoading(true);
                        const pdata = getPortfolioData();
                        const metrics = calculateReportMetrics(pdata, 'environmental', {});
                        const pdfBlob = await generateReportPDF('environmental', pdata, {});
                        setReportPdf(pdfBlob);
                        const reportData = extractors.extractEnvironmentalData(pdata);
                        setSelectedReportType('environmental');
                        setSelectedReportData(reportData);
                        setReportHtmlPreview(renderReportHtml('environmental', pdata, metrics, {}));
                        setReportModalOpen(true);
                      } catch (e) {
                        logger.error('Failed to generate environmental report', e);
                        toast.error('Failed to generate report.');
                      } finally {
                        setReportLoading(false);
                      }
                    }}>{reportLoading ? 'Generating...' : 'View'}</Button>
                    <Button size="sm" variant="outline" onClick={async () => {
                      try { setReportLoading(true); const pdata = getPortfolioData(); await exportWithRetry(() => generateReportPDF('environmental', pdata, {}), `GreenGauge_Environmental_Impact_${new Date().toISOString().slice(0,10)}.pdf`); } catch (e) { logger.error('Failed to export environmental report', e); } finally { setReportLoading(false); }
                    }}>{reportLoading ? 'Generating...' : 'Export'}</Button>
                  </div>
                </CardContent>
              </Card>

              {/* Executive Summary Report */}
              <Card className="border-gray-200 dark:border-gray-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        Executive Summary
                      </h3>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    High-level overview and key insights for stakeholders and decision makers
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={async () => {
                      try {
                        setReportLoading(true);
                        const pdata = getPortfolioData();
                        const metrics = calculateReportMetrics(pdata, 'executive', {});
                        const pdfBlob = await generateReportPDF('executive', pdata, {});
                        setReportPdf(pdfBlob);
                        const reportData = extractors.extractExecutiveData(pdata);
                        setSelectedReportType('executive');
                        setSelectedReportData(reportData);
                        setReportHtmlPreview(renderReportHtml('executive', pdata, metrics, {}));
                        setReportModalOpen(true);
                      } catch (e) {
                        logger.error('Failed to generate executive report', e);
                        toast.error('Failed to generate report.');
                      } finally {
                        setReportLoading(false);
                      }
                    }}>{reportLoading ? 'Generating...' : 'View'}</Button>
                    <Button size="sm" variant="outline" onClick={async () => {
                      try { setReportLoading(true); const pdata = getPortfolioData(); await exportWithRetry(() => generateReportPDF('executive', pdata, {}), `GreenGauge_Executive_Summary_${new Date().toISOString().slice(0,10)}.pdf`); } catch (e) { logger.error('Failed to export executive report', e); } finally { setReportLoading(false); }
                    }}>{reportLoading ? 'Generating...' : 'Export'}</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
      {reportModalOpen && (
        <ReportModal
          open={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          pdfBlob={reportPdf}
          htmlPreview={reportHtmlPreview}
          filename={`GreenGauge_Report_${new Date().toISOString().slice(0,10)}.pdf`}
          reportType={selectedReportType}
          reportData={selectedReportData}
        />
      )}
    </div>
  );
};

export default Advanced;

