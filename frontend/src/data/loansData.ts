import { mockLoans } from '@/data/generatedMockLoans';
import type { GreenLoan } from '@/types/greenLoan';

// Single source of truth for loans used across the app
export const loansData: GreenLoan[] = mockLoans.map(l => ({ ...l }));

// Basic sanity: ensure 150 loans present (generator defaults to 150)
export const LOANS_COUNT = loansData.length;

export default loansData;
