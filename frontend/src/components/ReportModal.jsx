import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import CovenantComplianceReportView from '@/components/reports/CovenantComplianceReportView';
import PortfolioAnalyticsReportView from '@/components/reports/PortfolioAnalyticsReportView';
import RiskAssessmentReportView from '@/components/reports/RiskAssessmentReportView';
import StressTestReportView from '@/components/reports/StressTestReportView';
import EnvironmentalImpactReportView from '@/components/reports/EnvironmentalImpactReportView';
import ExecutiveSummaryReportView from '@/components/reports/ExecutiveSummaryReportView';

const ReportModal = ({ open, onClose, pdfBlob, htmlPreview, filename, reportType, reportData }) => {
  const [tab, setTab] = useState('preview');
  const [pdfUrl, setPdfUrl] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const previewRef = useRef(null);

  useEffect(() => {
    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPdfUrl(null);
  }, [pdfBlob]);

  useEffect(() => {
    if (!open) setTab('preview');
  }, [open]);

  if (!open) return null;

  const download = async () => {
    setDownloading(true);
    try {
      if (pdfBlob) {
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || 'report.pdf';
        link.click();
        setTimeout(() => { URL.revokeObjectURL(url); }, 5000);
        toast.success('PDF downloaded successfully');
        return;
      }

      // If no blob provided, capture preview DOM node and create PDF
      const node = previewRef.current;
      if (!node) {
        toast.error('No preview available to export');
        return;
      }

      // Clone the preview node into an off-screen container sized to A4 (approx px at 96dpi)
      const MM_TO_PX = 3.7795275591; // 1 mm in px at 96dpi
      const A4_WIDTH_MM = 210;
      const A4_WIDTH_PX = Math.round(A4_WIDTH_MM * MM_TO_PX);
      const marginMM = 10;

      const cloneWrapper = document.createElement('div');
      cloneWrapper.style.position = 'fixed';
      cloneWrapper.style.left = '-9999px';
      cloneWrapper.style.top = '0';
      cloneWrapper.style.width = `${A4_WIDTH_PX}px`;
      cloneWrapper.style.boxSizing = 'border-box';
      cloneWrapper.className = 'pdf-export';
      // Deep clone the node content to avoid side-effects
      const clone = node.cloneNode(true);
      // Ensure the clone fits the A4 width
      if (clone.style) clone.style.width = '100%';
      cloneWrapper.appendChild(clone);
      document.body.appendChild(cloneWrapper);

      // Decide scale for high-resolution export (respect devicePixelRatio but cap it)
      const scale = Math.min(3, Math.max(1.5, window.devicePixelRatio || 1));

      // Render clone to canvas
      const canvas = await html2canvas(cloneWrapper, {
        scale,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: A4_WIDTH_PX,
        windowHeight: cloneWrapper.scrollHeight
      });

      // Remove the off-screen clone
      try { document.body.removeChild(cloneWrapper); } catch (e) {}

      const imgData = canvas.toDataURL('image/png', 1.0);

      // Create multi-page PDF using mm units and sensible margins
      const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth - marginMM * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width; // in mm

      let heightLeft = imgHeight;
      let position = marginMM;

      // Add first page
      pdf.addImage(imgData, 'PNG', marginMM, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - marginMM * 2);

      // Add additional pages if necessary
      while (heightLeft > 0) {
        pdf.addPage();
        // position negative so the next slice shows correct part
        const y = heightLeft - imgHeight + marginMM;
        pdf.addImage(imgData, 'PNG', marginMM, y, imgWidth, imgHeight);
        heightLeft -= (pdfHeight - marginMM * 2);
      }

      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || 'report.pdf';
      link.click();
      setTimeout(() => { URL.revokeObjectURL(url); }, 5000);
      toast.success('PDF downloaded successfully — check your downloads folder');
    } catch (e) {
      logger.error('Download failed', e);
      toast.error('Failed to download. Check browser settings.');
    } finally {
      setDownloading(false);
    }
  };
  // Sanitize htmlPreview: if a full HTML document string is provided (<!doctype> / <html>),
  // extract the <body> innerHTML so it can be safely injected into the modal container.
  let sanitizedHtml = htmlPreview;
  try {
    if (typeof window !== 'undefined' && htmlPreview && /<\/?html/i.test(htmlPreview)) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlPreview, 'text/html');
      // Prefer the element with class pdf-page if present to retain intended layout
      const page = doc.querySelector('.pdf-page') || doc.body;
      sanitizedHtml = page ? page.innerHTML : doc.body.innerHTML;
    }
  } catch (e) {
    // If parsing fails, fallback to original htmlPreview (best-effort)
    sanitizedHtml = htmlPreview;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded shadow-lg w-[90%] max-w-[900px] max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Report Preview</h3>
          <div className="flex items-center gap-2">
            <button className="btn" onClick={onClose}><X /></button>
          </div>
        </div>

          <div className="p-3">
          <div className="flex gap-2 mb-3">
            <button aria-pressed={tab === 'preview'} className={`px-3 py-1 rounded ${tab === 'preview' ? 'bg-teal-500 text-white' : 'bg-gray-100'}`} onClick={() => setTab('preview')}>HTML Preview</button>
            <button aria-pressed={tab === 'actions'} className={`px-3 py-1 rounded ${tab === 'actions' ? 'bg-teal-500 text-white' : 'bg-gray-100'}`} onClick={() => setTab('actions')}>Actions</button>
          </div>

          <div style={{ minHeight: 320 }}>
            {tab === 'preview' && (
              <div className="overflow-auto p-2" style={{ maxHeight: '60vh' }}>
                {reportData ? (
                  <div ref={previewRef} className="space-y-4">
                    {reportType === 'compliance' && <CovenantComplianceReportView data={reportData} />}
                    {reportType === 'analytics' && <PortfolioAnalyticsReportView data={reportData} />}
                    {reportType === 'risk' && <RiskAssessmentReportView data={reportData} />}
                    {reportType === 'stress' && <StressTestReportView data={reportData} />}
                    {reportType === 'environmental' && <EnvironmentalImpactReportView data={reportData} />}
                    {reportType === 'executive' && <ExecutiveSummaryReportView data={reportData} />}
                  </div>
                ) : htmlPreview ? (
                  <div ref={previewRef} dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
                ) : pdfUrl ? (
                  <iframe title="pdf-preview" src={pdfUrl} style={{ width: '100%', height: '60vh', border: 'none' }} />
                ) : (
                  <div className="p-6 text-center text-gray-500">No preview available</div>
                )}
              </div>
            )}

            {tab === 'actions' && (
              <div className="p-2">
                <div className="flex items-center gap-3">
                  <Button onClick={download} disabled={downloading}>{downloading ? 'Generating PDF...' : 'Download PDF'}</Button>
                  <Button variant="ghost" onClick={onClose}>Close</Button>
                </div>
                <div className="mt-3 text-sm text-gray-600">If the PDF doesn't download automatically, check your browser pop-up/download settings.</div>
              </div>
            )}
          </div>
        </div>

        <div className="p-3 border-t text-right"><small className="text-gray-500">CONFIDENTIAL - For Internal Use Only</small></div>
      </div>
    </div>
  );
};

ReportModal.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  pdfBlob: PropTypes.any,
  htmlPreview: PropTypes.string,
  filename: PropTypes.string,
  reportType: PropTypes.string,
  reportData: PropTypes.any
};

export default ReportModal;
