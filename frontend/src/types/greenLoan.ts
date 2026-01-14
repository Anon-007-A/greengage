// GreenGauge Type Definitions

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type CovenantStatus = 'compliant' | 'warning' | 'breach';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type LoanStatus = 'active' | 'watchlist' | 'default';

export interface Covenant {
  current: number;
  thresholdValue: any;
  id: string;
  name: string;
  type: 'financial' | 'esg';
  currentValue: number;
  threshold: number;
  operator: '<' | '>' | '<=' | '>=';
  unit: string;
  status: CovenantStatus;
  cushionPercent: number;
  daysToBreachEstimate: number | null;
  trend: number[]; // Last 3 quarters
  lastUpdated: string;
}

export interface ESGMetric {
  id: string;
  name: string;
  category: 'environmental' | 'social' | 'governance';
  currentValue: number;
  targetValue: number;
  unit: string;
  progressPercent: number;
  verificationStatus: VerificationStatus;
  submissionHistory: {
    month: string;
    value: number;
    verified: boolean;
  }[];
  lastUpdated: string;
}

export interface RiskScore {
  overall: number; // 0-100
  covenantComponent: number; // 60% weight
  impactComponent: number; // 40% weight
  level: RiskLevel;
  trend: 'improving' | 'stable' | 'deteriorating';
  recommendations: string[];
  lastCalculated: string;
}

export interface GreenLoan {
  company: string;
  name: any;
  amount: number;
  id: string;
  companyName: string;
  sector: string;
  loanAmount: number;
  currency: string;
  originationDate: string;
  maturityDate: string;
  interestRate: number;
  status: LoanStatus;
  covenants: Covenant[];
  esgMetrics: ESGMetric[];
  riskScore: RiskScore;
  relationshipManager: string;
  lastReviewDate: string;
}

export interface PortfolioSummary {
  totalLoans: number;
  totalValue: number;
  averageRiskScore: number;
  loansAtRisk: number;
  totalCO2Reduced: number;
  renewableEnergyGenerated: number;
}

export interface Notification {
  id: string;
  type: 'warning' | 'alert' | 'info' | 'success';
  title: string;
  message: string;
  loanId?: string;
  timestamp: string;
  read: boolean;
}
