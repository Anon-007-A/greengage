/**
 * ReportsAPI - CSRD Compliance Report with PDF Export
 * Generates regulatory compliance report and exports to PDF
 */

import { useState } from 'react';
import { useCSRDReport } from '@/hooks/useCSRDReport';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Download,
  FileCheck,
  AlertCircle,
  CheckCircle,
  Loader2,
  ArrowLeft,
  Leaf,
} from 'lucide-react';

interface ReportsAPIProps {
  onNavigate: (tab: string) => void;
}

const ReportsAPI = ({ onNavigate }: ReportsAPIProps) => {
  const { report, loading, error } = useCSRDReport('Q4-2024');
  const { loans, totalValue } = usePortfolio();
  const [exporting, setExporting] = useState(false);

  const generatePDF = async () => {
    if (!report) return;

    try {
      setExporting(true);

      // Dynamic import to avoid bundling jsPDF if not needed
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF();

      let yPosition = 20;
      const pageHeight = pdf.internal.pageSize.height;
      const pageWidth = pdf.internal.pageSize.width;
      const margin = 15;
      const lineHeight = 7;

      // Title
      pdf.setFontSize(20);
      const titleLines = pdf.splitTextToSize('CSRD Compliance Report', pageWidth - margin * 2);
      titleLines.forEach((ln: string) => {
        pdf.text(ln, margin, yPosition);
        yPosition += lineHeight;
      });
      yPosition += 2;

      // Header Info
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      const periodLines = pdf.splitTextToSize(`Period: ${report.period}`, pageWidth - margin * 2);
      periodLines.forEach((ln: string) => {
        pdf.text(ln, margin, yPosition);
        yPosition += lineHeight;
      });
      const genLines = pdf.splitTextToSize(`Generated: ${new Date(report.generatedDate).toLocaleDateString()}`, pageWidth - margin * 2);
      genLines.forEach((ln: string) => {
        pdf.text(ln, margin, yPosition);
        yPosition += lineHeight;
      });
      yPosition += 6;

      // Portfolio Summary
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Portfolio Summary', margin, yPosition);
      yPosition += 10;

      pdf.setFontSize(10);
      const portfolioLines = [
        `Total Loans: ${loans.length}`,
        `Total Exposure: ${totalValue ? new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR' }).format(totalValue) : 'N/A'}`,
        `Covenant Coverage: 100%`,
      ];

      portfolioLines.forEach(line => {
        const wrapped = pdf.splitTextToSize(line, pageWidth - margin * 2 - 10);
        wrapped.forEach((ln: string) => {
          pdf.text(ln, margin + 5, yPosition);
          yPosition += lineHeight;
        });
      });

      yPosition += 5;

      // Covenant Compliance
      if (yPosition + 50 > pageHeight) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(14);
      pdf.text('Covenant Compliance Status', margin, yPosition);
      yPosition += 10;

      pdf.setFontSize(10);
      const covenantLines = [
        `Total Covenants: ${report.covenants.totalCovenants}`,
        `Compliant: ${report.covenants.compliant} (${report.covenants.complianceRate.toFixed(1)}%)`,
        `At Risk: ${report.covenants.atRisk}`,
        `Breached: ${report.covenants.breached}`,
      ];

      covenantLines.forEach(line => {
        pdf.text(line, margin + 5, yPosition);
        yPosition += lineHeight;
      });

      yPosition += 5;

      // ESG Metrics
      if (yPosition + 50 > pageHeight) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(14);
      pdf.text('ESG Metrics Status', margin, yPosition);
      yPosition += 10;

      pdf.setFontSize(10);
      const esgLines = [
        `Verified ESG Metrics: ${report.esg.verifiedCount}`,
        `Pending Review: ${report.esg.pendingCount}`,
        `Environmental Targets: ${report.esg.environmental}%`,
        `Social Targets: ${report.esg.social}%`,
        `Governance Targets: ${report.esg.governance}%`,
      ];

      esgLines.forEach(line => {
        pdf.text(line, margin + 5, yPosition);
        yPosition += lineHeight;
      });

      yPosition += 5;

      // EU Taxonomy
      if (yPosition + 50 > pageHeight) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(14);
      pdf.text('EU Taxonomy Alignment', margin, yPosition);
      yPosition += 10;

      pdf.setFontSize(10);
      const taxonomyLines = [
        `Eligible Loans: ${report.euTaxonomy.eligibleCount} (${Math.round(report.euTaxonomy.eligibleCount / report.portfolio.totalLoans * 100)}%)`,
        `Aligned Loans: ${report.euTaxonomy.alignedCount} (${report.euTaxonomy.alignmentRate.toFixed(1)}%)`,
        `Key Activities: ${report.euTaxonomy.activities.join(', ')}`,
      ];

      taxonomyLines.forEach(line => {
        const wrapped = pdf.splitTextToSize(line, pageWidth - margin * 2 - 10);
        wrapped.forEach((ln: string) => {
          pdf.text(ln, margin + 5, yPosition);
          yPosition += lineHeight;
        });
      });

      yPosition += 5;

      // TCFD Disclosures
      if (yPosition + 50 > pageHeight) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(14);
      pdf.text('TCFD Climate Disclosures', margin, yPosition);
      yPosition += 10;

      pdf.setFontSize(10);
      const tcfdStatus = (status: boolean) => status ? '✓' : '✗';
      const tcfdLines = [
        `Governance: ${tcfdStatus(report.tcfd.governance)}`,
        `Strategy: ${tcfdStatus(report.tcfd.strategy)}`,
        `Risk Management: ${tcfdStatus(report.tcfd.riskManagement)}`,
        `Metrics & Targets: ${tcfdStatus(report.tcfd.metrics)}`,
        `Overall Status: ${report.tcfd.disclosureStatus.toUpperCase()}`,
      ];

      tcfdLines.forEach(line => {
        pdf.text(line, margin + 5, yPosition);
        yPosition += lineHeight;
      });

      // Audit Trail
      if (yPosition + 30 > pageHeight) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(10);
      pdf.setTextColor(150, 150, 150);
      let auditYPos = pageHeight - 20;
      const auditLines = [
        '',
        'AUDIT TRAIL',
        `Created: ${report.auditTrail.createdDate} by ${report.auditTrail.createdBy}`,
        `Last Modified: ${report.auditTrail.lastModified} by ${report.auditTrail.modifiedBy}`,
        `Version: ${report.auditTrail.version}`,
      ];

      auditLines.forEach(line => {
        pdf.text(line, margin, auditYPos);
        auditYPos -= lineHeight;
      });

      // Save PDF
      pdf.save(`CSRD_Report_${report.period}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      logger.error('Error generating PDF:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-teal-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading compliance report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-300">
        <CardContent className="p-6">
          <p className="text-red-600">Error loading report: {error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-600">No report data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            CSRD Compliance Report
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Corporate Sustainability Reporting Directive & Regulatory Disclosures
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
            onClick={generatePDF}
            disabled={exporting}
            className="bg-teal-600 hover:bg-teal-700 flex items-center gap-2"
          >
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export PDF
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Report Info Card */}
      <Card className="bg-teal-50 dark:bg-teal-950/20 border-teal-200">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Report Period</p>
              <p className="text-2xl font-bold text-teal-700 dark:text-teal-300">{report.period}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Generated Date</p>
              <p className="text-sm font-medium">{new Date(report.generatedDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Report Version</p>
              <p className="text-sm font-medium">{report.auditTrail.version}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Created By</p>
              <p className="text-sm font-medium">{report.auditTrail.createdBy}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Loans</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {report.portfolio.totalLoans}
            </p>
            <p className="text-xs text-gray-600 mt-2">Active in portfolio</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Exposure</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              €{(report.portfolio.totalExposure / 1e9).toFixed(1)}B
            </p>
            <p className="text-xs text-gray-600 mt-2">Portfolio value</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Covenant Coverage</p>
            <p className="text-3xl font-bold text-green-600">100%</p>
            <p className="text-xs text-gray-600 mt-2">All loans monitored</p>
          </CardContent>
        </Card>
      </div>

      {/* Covenant Compliance */}
      <Card>
        <CardHeader>
          <CardTitle>Covenant Compliance Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-sm text-gray-600 mb-2">Total Covenants</p>
              <p className="text-2xl font-bold text-blue-600">{report.covenants.totalCovenants}</p>
            </div>

            <div className="p-4 rounded-lg bg-green-50 border border-green-200">
              <p className="text-sm text-gray-600 mb-2">Compliant</p>
              <p className="text-2xl font-bold text-green-600">{report.covenants.compliant}</p>
              <p className="text-xs text-green-700 mt-1">{report.covenants.complianceRate.toFixed(1)}% rate</p>
            </div>

            <div className="p-4 rounded-lg bg-orange-50 border border-orange-200">
              <p className="text-sm text-gray-600 mb-2">At Risk</p>
              <p className="text-2xl font-bold text-orange-600">{report.covenants.atRisk}</p>
            </div>

            <div className="p-4 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-gray-600 mb-2">Breached</p>
              <p className="text-2xl font-bold text-red-600">{report.covenants.breached}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ESG & Taxonomy */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ESG Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Leaf className="w-5 h-5 text-green-600" />
              ESG Metrics Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm">Verified Metrics</p>
                <Badge className="bg-green-100 text-green-800">{report.esg.verifiedCount}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm">Pending Review</p>
                <Badge className="bg-orange-100 text-orange-800">{report.esg.pendingCount}</Badge>
              </div>
              <div className="pt-3 border-t space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Environmental</span>
                  <span className="font-semibold">{report.esg.environmental}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Social</span>
                  <span className="font-semibold">{report.esg.social}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Governance</span>
                  <span className="font-semibold">{report.esg.governance}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* EU Taxonomy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-blue-600" />
              EU Taxonomy Alignment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm">Eligible Loans</p>
                <Badge className="bg-blue-100 text-blue-800">
                  {report.euTaxonomy.eligibleCount}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm">Aligned Loans</p>
                <Badge className="bg-green-100 text-green-800">
                  {report.euTaxonomy.alignedCount}
                </Badge>
              </div>
              <div className="pt-3 border-t">
                <p className="text-sm font-medium mb-2">Alignment Rate</p>
                <p className="text-2xl font-bold text-blue-600">
                  {report.euTaxonomy.alignmentRate.toFixed(1)}%
                </p>
              </div>
              <div className="pt-2">
                <p className="text-xs font-medium text-gray-600 mb-1">Key Activities</p>
                <div className="flex flex-wrap gap-1">
                  {report.euTaxonomy.activities.map(activity => (
                    <Badge key={activity} variant="outline" className="text-xs">
                      {activity}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TCFD Disclosures */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            TCFD Climate Disclosures
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              {report.tcfd.governance ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              )}
              <div>
                <p className="font-medium">Governance</p>
                <p className="text-xs text-gray-600">Board climate oversight</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {report.tcfd.strategy ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              )}
              <div>
                <p className="font-medium">Strategy</p>
                <p className="text-xs text-gray-600">Climate risk integration</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {report.tcfd.riskManagement ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              )}
              <div>
                <p className="font-medium">Risk Management</p>
                <p className="text-xs text-gray-600">Climate risk identification</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {report.tcfd.metrics ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              )}
              <div>
                <p className="font-medium">Metrics & Targets</p>
                <p className="text-xs text-gray-600">Quantitative disclosures</p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between">
              <p className="font-medium">Overall Disclosure Status</p>
              <Badge
                className={`${
                  report.tcfd.disclosureStatus === 'complete'
                    ? 'bg-green-100 text-green-800'
                    : report.tcfd.disclosureStatus === 'partial'
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {report.tcfd.disclosureStatus.toUpperCase()}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Trail */}
      <Card className="border-gray-300 bg-gray-50 dark:bg-gray-900">
        <CardHeader>
          <CardTitle className="text-sm">Audit Trail</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-gray-600 space-y-1">
          <div className="flex justify-between">
            <span>Created By:</span>
            <span className="font-medium">{report.auditTrail.createdBy}</span>
          </div>
          <div className="flex justify-between">
            <span>Created Date:</span>
            <span className="font-medium">{report.auditTrail.createdDate}</span>
          </div>
          <div className="flex justify-between">
            <span>Last Modified:</span>
            <span className="font-medium">{report.auditTrail.lastModified}</span>
          </div>
          <div className="flex justify-between">
            <span>Modified By:</span>
            <span className="font-medium">{report.auditTrail.modifiedBy}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-gray-300">
            <span>Version:</span>
            <span className="font-medium">{report.auditTrail.version}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsAPI;
