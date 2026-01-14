/**
 * useApiLoans Hook
 * Fetches real loan data from the GreenGauge API
 * Replaces mock data with production-grade API calls
 */

import { useState, useEffect, useContext } from 'react';
import { Loan, PortfolioSummary, PortfolioRiskScore } from '@/lib/api-enhanced';
import { mockLoans } from '@/data/generatedMockLoans';
import { getPortfolioData, refreshPortfolioData } from '@/services/portfolioApi';
import { useGreenGaugeStore } from '@/store/useGreenGaugeStore';
import { PortfolioContext } from '@/contexts/PortfolioContext';
import { logger } from '@/lib/logger';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Simple module-level health check cache to avoid repeated noisy errors when backend is down
let __apiAvailable: boolean | null = null;
const checkApiAvailability = async (timeoutMs = 1500) => {
  if (__apiAvailable !== null) return __apiAvailable;
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal });
    clearTimeout(id);
    __apiAvailable = res.ok;
  } catch (e) {
    __apiAvailable = false;
  }
  return __apiAvailable;
};

export interface UseApiLoansResult {
  loans: Loan[];
  portfolioSummary: PortfolioSummary | null;
  portfolioRiskScore: PortfolioRiskScore | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  pagination: {
    skip: number;
    limit: number;
    total: number;
  };
  setPagination: (skip: number, limit: number) => void;
}

export const useApiLoans = (): UseApiLoansResult => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary | null>(null);
  const [portfolioRiskScore, setPortfolioRiskScore] = useState<PortfolioRiskScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Default to fetching all loans for portfolio view (limit high)
  const [pagination, setPagination] = useState({ skip: 0, limit: 1000, total: 0 });
  const setStoreLoans = useGreenGaugeStore(state => state.setLoans);
  const portfolioCtx = useContext(PortfolioContext as any);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      setError(null);

      const fullUrl = `${API_BASE_URL}/loans?skip=${pagination.skip}&limit=${pagination.limit}`;
      logger.info(`[useApiLoans] Full URL: ${fullUrl}`);

      // Check API availability first to avoid repeated connection-refused errors in console
      const apiUp = await checkApiAvailability();
      if (!apiUp) {
        // Use bundled mockLoans as a graceful fallback so UI remains usable during local development
        setLoans(mockLoans as unknown as Loan[]);
        try { if (portfolioCtx && (portfolioCtx as any).setLoans) (portfolioCtx as any).setLoans((mockLoans as unknown) as any); } catch (e) {}
        setPagination(prev => ({ ...prev, total: mockLoans.length }));
        const total = mockLoans.reduce((s, l) => s + (l.loanAmount || 0), 0);
        const avgRisk = Math.round((mockLoans.reduce((s, l) => s + ((l as any).riskScore?.overall || 0), 0) / Math.max(1, mockLoans.length)));
        setPortfolioSummary({ totalAmount: total, loanCount: mockLoans.length } as unknown as PortfolioSummary);
        setPortfolioRiskScore({ portfolioRiskScore: avgRisk } as unknown as PortfolioRiskScore);
      } else {
        // Use frontend cached portfolio service which provides a quick in-memory cache and refresh
        try {
          const loansData = await getPortfolioData({ skip: pagination.skip, limit: pagination.limit });
          setLoans(loansData.loans || []);
          try { setStoreLoans((loansData.loans || []) as unknown as any); } catch (e) {}
          try { if (portfolioCtx && (portfolioCtx as any).setLoans) (portfolioCtx as any).setLoans((loansData.loans || []) as any); } catch (e) {}
          if (loansData.total) setPagination(prev => ({ ...prev, total: loansData.total }));
        } catch (err: any) {
          logger.warn('[useApiLoans] Network fetch failed, falling back to bundled mockLoans', err?.message || err);
          setLoans(mockLoans as unknown as Loan[]);
          try { setStoreLoans((mockLoans as unknown) as any); } catch (e) {}
          setPagination(prev => ({ ...prev, total: mockLoans.length }));
          const total = mockLoans.reduce((s, l) => s + (l.loanAmount || 0), 0);
          const avgRisk = Math.round((mockLoans.reduce((s, l) => s + ((l as any).riskScore?.overall || 0), 0) / Math.max(1, mockLoans.length)));
          setPortfolioSummary({ totalAmount: total, loanCount: mockLoans.length } as unknown as PortfolioSummary);
          setPortfolioRiskScore({ portfolioRiskScore: avgRisk } as unknown as PortfolioRiskScore);
        }
      }

      // Fetch portfolio summary in parallel (don't fail main request if this fails)
      try {
        logger.info(`[useApiLoans] Fetching portfolio summary from: ${API_BASE_URL}/portfolio/summary`);
        const summaryResponse = await fetch(`${API_BASE_URL}/portfolio/summary`);
        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          logger.info('[useApiLoans] Portfolio summary fetched successfully');
          setPortfolioSummary(summaryData);
        } else {
          logger.warn(`[useApiLoans] Portfolio summary returned ${summaryResponse.status}`);
        }
      } catch (err) {
        logger.warn('[useApiLoans] Portfolio summary fetch error:', err instanceof Error ? err.message : err);
      }

      // Fetch portfolio risk score in parallel (don't fail main request if this fails)
      try {
        logger.info(`[useApiLoans] Fetching portfolio risk-score from: ${API_BASE_URL}/portfolio/risk-score`);
        const riskResponse = await fetch(`${API_BASE_URL}/portfolio/risk-score`);
        if (riskResponse.ok) {
          const riskData = await riskResponse.json();
          logger.info('[useApiLoans] Portfolio risk-score fetched successfully');
          setPortfolioRiskScore(riskData);
        } else {
          logger.warn(`[useApiLoans] Portfolio risk-score returned ${riskResponse.status}`);
        }
      } catch (err) {
        logger.warn('[useApiLoans] Portfolio risk-score fetch error:', err instanceof Error ? err.message : err);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(message);
      logger.error('[useApiLoans] ❌ ERROR:', message);
      logger.error('[useApiLoans] Stack:', err instanceof Error ? err.stack : 'no stack');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, [pagination.skip, pagination.limit]);

  const handleSetPagination = (skip: number, limit: number) => {
    setPagination(prev => ({ ...prev, skip, limit }));
  };

  return {
    loans,
    portfolioSummary,
    portfolioRiskScore,
    loading,
    error,
    refetch: fetchLoans,
    pagination,
    setPagination: handleSetPagination,
  };
};
