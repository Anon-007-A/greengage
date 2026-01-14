import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import loansData from '@/data/loansData';
import { useGreenGaugeStore } from '@/store/useGreenGaugeStore';
import { calculatePortfolioSummary } from '@/lib/portfolioSummary';
import { usePortfolioStatus } from '@/hooks/usePortfolioStatus';

interface GlobalMetrics {
  allLoans: any[];
  totalPortfolioValue: number;
  cleanEnergyGWh: number;
  co2ReducedKt: number;
  greenScore: number;
  breachedLoans: number;
  atRiskLoans: number;
  compliantLoans: number;
  averageRiskScore: number;
  totalLoanCount: number;
  portfolioSummary: any;
}

const GlobalDataContext = createContext<GlobalMetrics | null>(null);

export const GlobalDataProvider = ({ children }: { children: ReactNode }) => {
  // Prefer legacy store loans when available (reflects runtime additions/uploads)
  const storeLoans = useGreenGaugeStore ? useGreenGaugeStore((s: any) => s.loans) : [];
  const allLoans = (storeLoans && storeLoans.length > 0) ? storeLoans : (loansData || []);

  // Get current stress test parameters from store to sync with simulator
  const ebitdaDropPercent = useGreenGaugeStore ? useGreenGaugeStore((s: any) => s.ebitdaDropPercent) : 0;
  const interestRateHikeBps = useGreenGaugeStore ? useGreenGaugeStore((s: any) => s.interestRateHikeBps) : 0;

  // Call hook at top level to respect rules of hooks
  const status = usePortfolioStatus(allLoans as any, ebitdaDropPercent, interestRateHikeBps);

  // useMemo to calculate derived metrics once for baseline (0% stress)
  const metrics = useMemo(() => {
    // Portfolio summary (energy / co2 / totals)
    const summary = calculatePortfolioSummary(allLoans as any);

    const totalPortfolioValue = status.totalPortfolioValue;
    // Use actual calculated loan statuses based on covenants and risk scores
    const breachedLoans = status.breachedLoanCount;
    const atRiskLoans = status.atRiskLoanCount;
    const compliantLoans = status.safeLoanCount;
    const averageRiskScore = status.avgRiskScore;
    const greenScore = status.portfolioGreenScore;

    return {
      allLoans,
      totalPortfolioValue,
      cleanEnergyGWh: summary.renewableEnergyGenerated || 0,
      co2ReducedKt: Math.round((summary.totalCO2Reduced || 0) / 1000),
      greenScore,
      breachedLoans,
      atRiskLoans,
      compliantLoans,
      averageRiskScore,
      totalLoanCount: status.totalLoanCount,
      portfolioSummary: summary,
    } as GlobalMetrics;
    // dependencies intentionally include status, allLoans, and stress params so values reflect changes
  }, [status, allLoans, ebitdaDropPercent, interestRateHikeBps]);

  return <GlobalDataContext.Provider value={metrics}>{children}</GlobalDataContext.Provider>;
};

export const useGlobalData = (): GlobalMetrics => {
  const ctx = useContext(GlobalDataContext);
  if (!ctx) throw new Error('useGlobalData must be used within GlobalDataProvider');
  return ctx;
};

export default GlobalDataContext;
