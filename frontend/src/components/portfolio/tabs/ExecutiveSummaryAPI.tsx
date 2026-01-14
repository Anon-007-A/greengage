/**
 * ExecutiveSummaryAPI - API-Integrated Version
 * Displays real loan data from the GreenGauge backend
 */

import { useExportDocument } from '@/hooks/useExportDocument';
import { LoanTableEnhanced } from '@/components/portfolio/LoanTableEnhanced';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  TrendingUp,
  Leaf,
  ArrowRight,
  DollarSign,
  AlertCircle,
  Zap,
  FileCheck,
  Loader2,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { formatCurrency } from '@/utils/formatters';
import PortfolioSummary from '@/components/dashboard/PortfolioSummary';
import ErrorBoundary from '@/components/ErrorBoundary';
import SimulatorMock from '@/components/dashboard/SimulatorMock';
import Skeleton from '@/components/Skeleton';
import { Loan as ApiLoan } from '@/lib/api-enhanced';

const mapToApiLoan = (l: any): ApiLoan => ({
  id: l.id?.toString() || (l.loanId || '') ,
  companyName: l.companyName || l.company || 'Unknown',
  sector: l.sector || 'Other',
  loanAmount: l.loanAmount || l.amount || 0,
  currency: l.currency || 'EUR',
  originationDate: l.originationDate || l.origination || '',
  maturityDate: l.maturityDate || l.maturity || '',
  interestRate: l.interestRate || l.rate || 0,
  status: l.status || 'unknown',
  relationshipManager: l.relationshipManager || l.rm || '',
  lastReviewDate: l.lastReviewDate || '',
  covenants: l.covenants || [],
  esgMetrics: l.esgMetrics || [],
  riskScore: l.riskScore || { overall: 0, covenantComponent: 0, impactComponent: 0, level: 'low', trend: 'stable', recommendations: [], lastCalculated: '' },
});

interface ExecutiveSummaryAPIProps {
  onNavigate: (tab: string) => void;
}

const ExecutiveSummaryAPI = ({ onNavigate }: ExecutiveSummaryAPIProps) => {
  const { loans, totalValue, riskScore, breachedCount, atRiskCount, safeCount, simulation, lastUpdated } = usePortfolio();
  const { exporting, exportPortfolioPDF, exportLoansCSV } = useExportDocument();
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv' | null>(null);

  // Use shared formatter (billions/millions compact)
  const fmtCurrency = (amount: number) => formatCurrency(amount, 'billions');

  // usePortfolio provides live data and handles loading/fallback elsewhere; show minimal loading if no loans yet
  const loading = loans.length === 0;
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 p-6 bg-white dark:bg-gray-900 rounded">
            <Skeleton rows={3} />
          </div>
          <div className="lg:col-span-2 space-y-4">
            <div className="p-4 rounded bg-gray-50 dark:bg-gray-800"><Skeleton rows={2} /></div>
          </div>
        </div>

        <div className="h-96 p-6 bg-white dark:bg-gray-900 rounded">
          <Skeleton rows={8} />
        </div>
      </div>
    );
  }

  // Calculate metrics from real data or use persisted scenario summary if active
  const totalAmount = totalValue || 0;
  const loanCount = loans.length;
  const breachedValue = loans.filter((l: any) => l.status === 'breached').reduce((s: number, l: any) => s + (l.amount || 0), 0);
  const avgRiskScore = riskScore || 0;

  // Prefer simulation.stressedResults if present
  let displayBreached = breachedCount;

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <PortfolioSummary onNavigate={onNavigate} />
        <SimulatorMock />

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Portfolio Value Card */}
        <Card className="border-gray-200 dark:border-gray-800" style={{
          borderLeft: '4px solid #06A77D',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          borderRadius: '12px'
        }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-6 h-6" style={{ color: '#06A77D' }} />
            </div>
            <p className="text-sm mb-1" style={{ color: '#6B7280' }}>Total Value</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {fmtCurrency(totalAmount)}
            </p>
            <p className="text-xs mt-2 text-teal-600">Production database</p>
          </CardContent>
        </Card>

        {/* Breached Loans */}
        <Card className="border-gray-200 dark:border-gray-800" style={{
          borderLeft: '4px solid #DC3545',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          borderRadius: '12px'
        }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="w-6 h-6" style={{ color: '#DC3545' }} />
            </div>
            <p className="text-sm mb-1" style={{ color: '#6B7280' }}>Breached Covenants</p>
            <p className="text-3xl font-bold" style={{ color: '#DC3545' }}>{breachedCount}</p>
            <p className="text-xs mt-2 text-red-600">Action required</p>
          </CardContent>
        </Card>

        {/* Loan Count */}
        <Card className="border-gray-200 dark:border-gray-800" style={{
          borderLeft: '4px solid #0084FF',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          borderRadius: '12px'
        }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Leaf className="w-6 h-6" style={{ color: '#0084FF' }} />
            </div>
            <p className="text-sm mb-1" style={{ color: '#6B7280' }}>Total Loans</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{loanCount}</p>
            <p className="text-xs mt-2 text-blue-600">Active in portfolio</p>
          </CardContent>
        </Card>
      </div>

      {/* Insights Section */}
      <Card className="border-gray-200 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Key Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {breachedCount > 0 && (
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-red-900 dark:text-red-100">
                      {breachedCount} Loan{breachedCount !== 1 ? 's' : ''} Require Waiver
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-200 mt-1">
                      Immediate action needed to avoid default. Exposure: {fmtCurrency(breachedValue)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {atRiskCount > 0 && (
              <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200">
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-orange-900 dark:text-orange-100">
                      {atRiskCount} Loan{atRiskCount !== 1 ? 's' : ''} at Risk
                    </p>
                    <p className="text-sm text-orange-700 dark:text-orange-200 mt-1">
                      Monitor closely. Consider proactive communication with borrowers.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {safeCount > 0 && (
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200">
                <div className="flex items-start gap-3">
                  <FileCheck className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-green-900 dark:text-green-100">
                      {safeCount} Loan{safeCount !== 1 ? 's' : ''} Compliant
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-200 mt-1">
                      Good covenant performance. Continue regular monitoring.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      {/* Loan Listing Table */}
      <Card className="border-gray-200 dark:border-gray-800">
        <CardHeader className="border-b">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg font-semibold">Loan Portfolio</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await exportPortfolioPDF(loans.map(mapToApiLoan), null);
                  } catch (e) {
                    // fallback: export CSV if PDF generation fails
                    try {
                      await exportLoansCSV(loans.map(mapToApiLoan));
                      toast.success('PDF generation failed — exported CSV as fallback');
                    } catch (err) {
                      toast.error('Export failed');
                    }
                  }
                }}
                disabled={exporting}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                {exporting ? 'Exporting...' : 'Export PDF'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportLoansCSV(loans.map(mapToApiLoan))}
                disabled={exporting}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
          <CardContent className="p-0">
          <LoanTableEnhanced
            loans={loans as any}
            loading={false}
            onExportPDF={(loansToExport) => exportPortfolioPDF(loansToExport.map(mapToApiLoan), null)}
          />
        </CardContent>
      </Card>
    </div>
    </ErrorBoundary>
  );
};

export default ExecutiveSummaryAPI;
