/**
 * React Hooks for API Integration
 */
import { useState, useCallback } from 'react';
import { apiClient, StressTestRequest, StressTestResponse, Loan } from '@/lib/api';
import { toast } from 'sonner';
import { useGreenGaugeStore } from '@/store/useGreenGaugeStore';
import { logger } from '@/lib/logger';

export function useStressTest() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StressTestResponse | null>(null);
  const { loans } = useGreenGaugeStore();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

  const runSimulation = useCallback(async (request: StressTestRequest) => {
    setLoading(true);
    setError(null);
    
    try {
      logger.info('Running stress test with:', request);
      logger.info('Loans available:', loans.length);
      
      // Try backend API first, fall back to mock if unavailable
      let result: StressTestResponse | null = null;
      
      try {
        // Check if API is available first
        const healthRes = await fetch(`${API_BASE_URL}/health`, { signal: AbortSignal.timeout(2000) }).catch(() => null);
        if (healthRes?.ok) {
          // API is available, try the stress-test endpoint
          const stressRes = await fetch(`${API_BASE_URL}/stress-test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ebitda_drop_percent: request.ebitda_drop_percent,
              interest_rate_hike_bps: request.interest_rate_hike_bps,
            }),
          });
          
          if (stressRes.ok) {
            const backendResult = await stressRes.json();
            logger.info('[useStressTest] Backend stress-test succeeded');
            result = backendResult as StressTestResponse;
            toast.success('Stress test completed (from backend)');
          } else {
            logger.warn('[useStressTest] Backend returned error, falling back to sample');
          }
        }
      } catch (apiErr) {
        logger.warn('[useStressTest] Backend API unavailable, using client-side sample:', apiErr);
      }
      
      // Fallback to mock if backend failed
      if (!result) {
        const { runMockStressTest } = await import('@/lib/mock_stress_test');
        const mockResult = runMockStressTest(
          loans,
          request.ebitda_drop_percent,
          request.interest_rate_hike_bps
        );
        logger.info('[useStressTest] Using sample stress-test result');
        result = mockResult as StressTestResponse;
        toast.success('Stress test completed (client-side simulation)');
      }
      
      setResult(result);
      return result;
    } catch (err) {
      logger.error('Stress test error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Simulation failed';
      setError(errorMessage);
      toast.error(`Simulation failed: ${errorMessage}`);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loans, API_BASE_URL]);

  const getResult = useCallback(async (testId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.getStressTestResult(testId);
      setResult(response);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load result';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    result,
    runSimulation,
    getResult,
    reset: () => {
      setResult(null);
      setError(null);
    },
  };
}

export function useDocumentAnalysis() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeDocument = useCallback(async (
    file: File,
    loanId?: string,
    tenantId?: string
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.analyzeDocument(file, loanId, tenantId);
      toast.success(`Extracted ${response.covenants_extracted} covenants`);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Document analysis failed';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    analyzeDocument,
  };
}

export function useLoans() {
  const [loading, setLoading] = useState(false);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchLoans = useCallback(async (tenantId?: string, statusFilter?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await apiClient.getLoans(tenantId, statusFilter);
      setLoans(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load loans';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    loans,
    error,
    fetchLoans,
  };
}

export function useExport() {
  const [loading, setLoading] = useState(false);

  const exportComplianceReport = useCallback(async (
    format: 'csv' | 'excel' = 'csv',
    tenantId?: string
  ) => {
    setLoading(true);
    
    try {
      const blob = await apiClient.exportComplianceReport(format, tenantId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance_report.${format === 'excel' ? 'xlsx' : 'csv'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Report exported successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Export failed';
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const exportStressTest = useCallback(async (
    testId: string,
    format: 'csv' | 'excel' = 'csv'
  ) => {
    setLoading(true);
    
    try {
      const blob = await apiClient.exportStressTest(testId, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stress_test_${testId}.${format === 'excel' ? 'xlsx' : 'csv'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Stress test exported successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Export failed';
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    exportComplianceReport,
    exportStressTest,
  };
}

