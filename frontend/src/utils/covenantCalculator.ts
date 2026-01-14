import { Covenant } from '@/types/greenLoan';
import { calculateBreachRisk } from '@/lib/breachCalculator';

export type CovenantCalcStatus = 'compliant' | 'at-risk' | 'breached';

export interface CovenantCalcResult {
  status: CovenantCalcStatus;
  severityScore: number; // 0-100
  stressedValue: number;
  cushionPercent: number;
  breachMargin: number;
}

/**
 * calculateCovenantStatus(loanCov, ebitdaDrop%, rateHikeBps)
 * Returns normalized status and severity score to be used across all tabs
 */
export const calculateCovenantStatus = (
  covenant: Covenant,
  ebitdaDropPercent: number,
  interestRateHikeBps: number
): CovenantCalcResult => {
  const calc = calculateBreachRisk(covenant as any, ebitdaDropPercent, interestRateHikeBps);
  const statusMap: Record<string, CovenantCalcStatus> = {
    compliant: 'compliant',
    warning: 'at-risk',
    breach: 'breached'
  } as any;

  const status = statusMap[calc.status] || 'compliant';
  return {
    status,
    severityScore: Number((calc.severityScore || 0).toFixed(2)),
    stressedValue: calc.stressedValue,
    cushionPercent: calc.cushionPercent,
    breachMargin: calc.breachMargin
  };
};

export default calculateCovenantStatus;
