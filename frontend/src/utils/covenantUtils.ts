import { Covenant } from '@/types/greenLoan';
import { calculateBreachRisk } from '@/lib/breachCalculator';

export interface CovenantStatusSummary {
  breached: boolean;
  atRisk: boolean;
  compliant: boolean;
  stressedValue: number;
  cushionPercent: number;
  breachMargin: number;
  status: 'breach' | 'warning' | 'compliant';
}

/**
 * Shared covenant evaluation used by Summary, Simulator and Reports
 * Returns normalized flags so all UI components use identical logic.
 */
export const calculateCovenantStatus = (
  covenant: Covenant,
  ebitdaDropPercent: number,
  interestRateHikeBps: number
): CovenantStatusSummary => {
  const calc = calculateBreachRisk(covenant as any, ebitdaDropPercent, interestRateHikeBps);
  const status = calc.status;
  return {
    breached: status === 'breach',
    atRisk: status === 'warning',
    compliant: status === 'compliant',
    stressedValue: calc.stressedValue,
    cushionPercent: calc.cushionPercent,
    breachMargin: calc.breachMargin,
    status
  };
};

export default calculateCovenantStatus;
