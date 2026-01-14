/**
 * Hook for PDF and document export functionality
 */

import { useState } from 'react';
import { Loan, PortfolioSummary } from '@/lib/api-enhanced';
import { 
  exportPortfolioSummary, 
  exportLoanDetail, 
  exportLoansAsCSV,
  ExportOptions 
} from '@/lib/pdf-export';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export const useExportDocument = () => {
  const [exporting, setExporting] = useState(false);

  const exportPortfolioPDF = async (
    loans: Loan[],
    summary: PortfolioSummary | null,
    options?: ExportOptions
  ) => {
    setExporting(true);
    try {
      const filename = `loans_${new Date().toISOString().slice(0,10)}.pdf`;
      await exportPortfolioSummary(loans, summary, {
        filename,
        title: 'GreenGauge Portfolio Summary Report',
        ...options,
      });
      toast.success(`Portfolio exported as ${filename}`);
    } catch (error) {
      logger.error('Export error:', error);
      toast.error('Export failed. Please try again');
      throw error;
    } finally {
      setExporting(false);
    }
  };

  const exportLoanPDF = async (loan: Loan, options?: ExportOptions) => {
    setExporting(true);
    try {
      await exportLoanDetail(loan, {
        filename: `GreenGauge_Loan_${loan.id}.pdf`,
        title: `Loan Detail - ${loan.companyName}`,
        ...options,
      });
      toast.success('Loan report exported successfully');
    } catch (error) {
      logger.error('Export error:', error);
      toast.error('Failed to export loan report');
      throw error;
    } finally {
      setExporting(false);
    }
  };

  const exportLoansCSV = async (loans: Loan[], filename = 'GreenGauge_Loans.csv') => {
    setExporting(true);
    try {
      const fname = `loans_${new Date().toISOString().slice(0,10)}.csv`;
      await exportLoansAsCSV(loans, fname);
      toast.success(`Portfolio exported as ${fname}`);
    } catch (error) {
      logger.error('Export error:', error);
      toast.error('Export failed. Please try again');
      throw error;
    } finally {
      setExporting(false);
    }
  };

  return {
    exporting,
    exportPortfolioPDF,
    exportLoanPDF,
    exportLoansCSV,
  };
};
