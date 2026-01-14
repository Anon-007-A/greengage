/**
 * Centralized Portfolio Status Hook
 * Single source of truth for loan statuses and portfolio aggregates
 */
import { useMemo } from 'react';
import { GreenLoan } from '@/types/greenLoan';
import { calculateCovenantStatus } from '@/utils/covenantCalculator';
import { calculatePortfolioGreenScore, calculateStressedGreenScore, getESGCategory } from '@/lib/greenScore';

export type LoanStatus = 'SAFE' | 'AT_RISK' | 'BREACHED';

export interface CovenantStatus {
  id: string;
  name: string;
  type: 'financial' | 'esg';
  currentValue: number;
  stressedValue: number;
  threshold: number;
  operator: '<' | '>' | '<=' | '>=';
  unit: string;
  status: 'compliant' | 'warning' | 'breach';
  cushionPercent: number;
  breachMargin: number;
  isBreached: boolean;
  isAtRisk: boolean;
}

export interface LoanStatusData {
  loan: GreenLoan;
  status: LoanStatus;
  breachCount: number;
  atRiskCount: number;
  covenants: CovenantStatus[];
  worstCovenant: string;
}

export interface PortfolioStatus {
  loans: LoanStatusData[];
  breachedLoanCount: number;
  atRiskLoanCount: number;
  safeLoanCount: number;
  totalLoanCount: number;
  totalBreaches: number;
  totalAtRisk: number;
  covenantTypesBreached: string[];
  covenantTypesAtRisk: string[];
  // Enhanced metrics
  totalPortfolioValue: number; // Sum of all loan amounts in EUR
  portfolioGreenScore: number; // Weighted average green score (0-100)
  avgRiskScore: number; // Average of all loan risk scores (0-100)
  darkGreenLoanCount: number; // Loans with green score >= 80
  lightGreenLoanCount: number; // Loans with green score 50-79
  transitionLoanCount: number; // Loans with green score < 50
}

/**
 * Centralized hook to compute portfolio status
 * All components should use this to ensure consistency
 */
export const usePortfolioStatus = (
  loans: GreenLoan[],
  ebitdaDropPercent: number,
  interestRateHikeBps: number
): PortfolioStatus => {
  return useMemo(() => {
    const loanStatuses: LoanStatusData[] = [];
    let breachedLoanCount = 0;
    let atRiskLoanCount = 0;
    let safeLoanCount = 0;
    let totalBreaches = 0;
    let totalAtRisk = 0;
    const covenantTypesBreached = new Set<string>();
    const covenantTypesAtRisk = new Set<string>();

    loans.forEach(loan => {
      if (!loan.covenants || loan.covenants.length === 0) {
        loanStatuses.push({
          loan,
          status: 'SAFE',
          breachCount: 0,
          atRiskCount: 0,
          covenants: [],
          worstCovenant: 'N/A'
        });
        safeLoanCount++;
        return;
      }

      const covenantStatuses: CovenantStatus[] = [];
      let hasBreach = false;
      let hasAtRisk = false;
      let breachCount = 0;
      let atRiskCount = 0;
      let worstCovenant = '';

      loan.covenants.forEach(covenant => {
        const covStatus = calculateCovenantStatus(covenant as any, ebitdaDropPercent, interestRateHikeBps);

        // covStatus.status from calculator is one of: 'compliant' | 'at-risk' | 'breached'
        const isBreached = covStatus.status === 'breached';
        const isAtRisk = covStatus.status === 'at-risk';

        // Map calculator status to CovenantStatus.status union ('compliant'|'warning'|'breach')
        const statusMap: Record<string, 'compliant' | 'warning' | 'breach'> = {
          'compliant': 'compliant',
          'at-risk': 'warning',
          'breached': 'breach'
        } as any;

        covenantStatuses.push({
          id: covenant.id,
          name: covenant.name,
          type: (covenant as any).type || 'financial',
          currentValue: (covenant as any).currentValue,
          stressedValue: covStatus.stressedValue,
          threshold: (covenant as any).threshold,
          operator: (covenant as any).operator,
          unit: (covenant as any).unit,
          status: statusMap[covStatus.status] || 'compliant',
          cushionPercent: covStatus.cushionPercent,
          breachMargin: covStatus.breachMargin,
          isBreached,
          isAtRisk
        });

        if (isBreached) {
          hasBreach = true;
          breachCount++;
          covenantTypesBreached.add(covenant.name);
          if (!worstCovenant) worstCovenant = covenant.name;
        } else if (isAtRisk) {
          hasAtRisk = true;
          atRiskCount++;
          covenantTypesAtRisk.add(covenant.name);
          if (!worstCovenant && !hasBreach) worstCovenant = covenant.name;
        }
      });

      // Determine loan-level status: BREACHED > AT_RISK > SAFE
      let loanStatus: LoanStatus = 'SAFE';
      if (hasBreach) {
        loanStatus = 'BREACHED';
        breachedLoanCount++;
        totalBreaches += breachCount;
      } else if (hasAtRisk) {
        loanStatus = 'AT_RISK';
        atRiskLoanCount++;
        totalAtRisk += atRiskCount;
      } else {
        safeLoanCount++;
      }

      loanStatuses.push({
        loan,
        status: loanStatus,
        breachCount,
        atRiskCount,
        covenants: covenantStatuses,
        worstCovenant: worstCovenant || 'N/A'
      });
    });

    // Calculate portfolio value (sum of all loan amounts)
    const totalPortfolioValue = loans.reduce((sum, loan) => sum + loan.loanAmount, 0);

    // Calculate portfolio green score (weighted by loan amount)
    const portfolioGreenScore = calculatePortfolioGreenScore(loans, ebitdaDropPercent, interestRateHikeBps);

    // Calculate average risk score
    const totalRiskScore = loans.reduce((sum, loan) => sum + loan.riskScore.overall, 0);
    const avgRiskScore = loans.length > 0 ? Math.round(totalRiskScore / loans.length) : 0;

    // Count loans by ESG category
    let darkGreenLoanCount = 0;
    let lightGreenLoanCount = 0;
    let transitionLoanCount = 0;

    loans.forEach(loan => {
      const greenScore = calculateStressedGreenScore(loan, ebitdaDropPercent, interestRateHikeBps);
      const category = getESGCategory(greenScore);
      if (category === 'Dark Green') darkGreenLoanCount++;
      else if (category === 'Light Green') lightGreenLoanCount++;
      else transitionLoanCount++;
    });

    return {
      loans: loanStatuses,
      breachedLoanCount,
      atRiskLoanCount,
      safeLoanCount,
      totalLoanCount: loans.length,
      totalBreaches,
      totalAtRisk,
      covenantTypesBreached: Array.from(covenantTypesBreached),
      covenantTypesAtRisk: Array.from(covenantTypesAtRisk),
      totalPortfolioValue,
      portfolioGreenScore,
      avgRiskScore,
      darkGreenLoanCount,
      lightGreenLoanCount,
      transitionLoanCount
    };
  }, [loans, ebitdaDropPercent, interestRateHikeBps]);
};

