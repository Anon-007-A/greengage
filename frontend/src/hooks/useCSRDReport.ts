/**
 * useCSRDReport Hook
 * Fetches CSRD compliance report from the backend API
 */

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

export interface CSRDReport {
  reportId: string;
  period: string;
  generatedDate: string;
  portfolio: {
    totalLoans: number;
    totalExposure: number;
    bySector: Record<string, number>;
  };
  covenants: {
    totalCovenants: number;
    compliant: number;
    atRisk: number;
    breached: number;
    complianceRate: number;
  };
  esg: {
    verifiedCount: number;
    pendingCount: number;
    environmental: number;
    social: number;
    governance: number;
  };
  euTaxonomy: {
    eligibleCount: number;
    alignedCount: number;
    alignmentRate: number;
    activities: string[];
  };
  tcfd: {
    disclosureStatus: 'complete' | 'partial' | 'missing';
    governance: boolean;
    strategy: boolean;
    riskManagement: boolean;
    metrics: boolean;
  };
  auditTrail: {
    createdBy: string;
    createdDate: string;
    lastModified: string;
    modifiedBy: string;
    version: string;
  };
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const useCSRDReport = (period: string = 'Q4-2024') => {
  const [report, setReport] = useState<CSRDReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${API_BASE_URL}/compliance/csrd-report?period=${period}`, {
          headers: {
            'Authorization': 'Bearer test-key',
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch CSRD report: ${response.statusText}`);
        }

        const data = await response.json();
        setReport(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(message);
        logger.error('Error fetching CSRD report:', message);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [period]);

  return { report, loading, error };
};

export default useCSRDReport;
