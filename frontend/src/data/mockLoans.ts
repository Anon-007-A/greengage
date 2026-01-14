import { GreenLoan, Notification, PortfolioSummary } from '@/types/greenLoan';
import { createSeededRng } from '@/lib/seededRng';

// Frontend mock data generator — produces 150 realistic-ish loans for offline/demo use.
const _rng = createSeededRng('GreenGauge123');
function randBetween(min: number, max: number) {
  return Math.floor(_rng() * (max - min + 1)) + min;
}

function pick<T>(arr: T[], i: number) {
  return arr[i % arr.length];
}

const COMPANY_PREFIXES = [
  'SolarGrid',
  'GreenBuild',
  'EcoTransport',
  'CleanWater',
  'WindPower',
  'HydroWorks',
  'AgriNova',
  'ForestHoldings',
  'UrbanRenew',
  'BatteryCo'
];

const SECTORS = [
  'Renewable Energy',
  'Sustainable Construction',
  'Green Transportation',
  'Water Treatment',
  'Agriculture',
  'Forestry',
  'Energy Storage',
  'Waste Management'
];

export function generateMockLoans(count = 150): GreenLoan[] {
  const loans: GreenLoan[] = [];
  for (let i = 1; i <= count; i++) {
    const prefix = pick(COMPANY_PREFIXES, i - 1);
    const companyName = `${prefix} ${i}`;
    const sector = pick(SECTORS, i - 1);
    const loanAmount = randBetween(5_000_000, 150_000_000);
    const statusRoll = randBetween(1, 100);
    let status: 'active' | 'watchlist' | 'default' = 'active';
    if (statusRoll > 85) status = 'default';
    else if (statusRoll > 60) status = 'watchlist';

    const overallRisk = randBetween(10, 90);

    const loan: GreenLoan = {
      id: `loan-${String(i).padStart(3, '0')}`,
      companyName,
      sector,
      loanAmount,
      currency: 'EUR',
      originationDate: '2023-01-01',
      maturityDate: '2030-12-31',
      interestRate: Number((randBetween(200, 500) / 100).toFixed(2)),
      status: status === 'default' ? 'watchlist' : 'active',
      relationshipManager: pick(['Johan Schmidt','Hans Mueller','Sophie Bernard','Erik Johansson','Lena Rossi'], i-1),
      lastReviewDate: '2024-12-20',
      covenants: [
        {
          id: `cov-${String(i).padStart(3,'0')}-1`,
          name: 'Debt-to-EBITDA',
          type: 'financial',
          currentValue: Number((randBetween(200, 450)/100).toFixed(2)),
          threshold: 4.0,
          operator: '<',
          unit: 'x',
          status: (overallRisk > 70) ? 'breached' : (overallRisk > 50) ? 'warning' : 'compliant',
          cushionPercent: randBetween(-20, 80),
          daysToBreachEstimate: overallRisk > 60 ? randBetween(10,120) : null,
          trend: [randBetween(200,400)/100, randBetween(200,400)/100, randBetween(200,400)/100],
          lastUpdated: '2024-12-20'
        }
      ],
      esgMetrics: [
        {
          id: `esg-${String(i).padStart(3,'0')}-1`,
          name: 'CO2 Emissions Reduced',
          category: 'environmental',
          currentValue: randBetween(1000,50000),
          targetValue: randBetween(50000,100000),
          unit: 'tonnes/year',
          progressPercent: randBetween(10,100),
          verificationStatus: 'verified',
          submissionHistory: [],
          lastUpdated: '2024-12-20'
        }
      ],
      riskScore: {
        overall: overallRisk,
        covenantComponent: randBetween(10,90),
        impactComponent: randBetween(10,90),
        level: overallRisk >= 75 ? 'high' : overallRisk >= 50 ? 'medium' : 'low',
        trend: overallRisk > 60 ? 'deteriorating' : 'stable',
        recommendations: [],
        lastCalculated: '2024-12-20'
      }
    } as unknown as GreenLoan;

    loans.push(loan);
  }
  return loans;
}

export const mockLoans: GreenLoan[] = generateMockLoans(150);
  // 🟢 HEALTHY - SolarGrid Energy
  {
    id: 'loan-001',
    companyName: 'SolarGrid Energy',
    sector: 'Renewable Energy',
    loanAmount: 50000000,
    currency: 'EUR',
    originationDate: '2023-01-15',
    maturityDate: '2028-01-15',
    interestRate: 3.5,
    status: 'active',
    relationshipManager: 'Johan Schmidt',
    lastReviewDate: '2024-12-15',
    covenants: [
      {
        id: 'cov-001-1',
        name: 'Debt-to-EBITDA',
        type: 'financial',
        currentValue: 2.8,
        threshold: 4.0,
        operator: '<',
        unit: 'x',
        status: 'compliant',
        cushionPercent: 30,
        daysToBreachEstimate: null,
        trend: [3.2, 3.0, 2.8],
        lastUpdated: '2024-12-20'
      },
      {
        id: 'cov-001-2',
        name: 'Interest Coverage',
        type: 'financial',
        currentValue: 5.2,
        threshold: 3.0,
        operator: '>',
        unit: 'x',
        status: 'compliant',
        cushionPercent: 73,
        daysToBreachEstimate: null,
        trend: [4.5, 4.8, 5.2],
        lastUpdated: '2024-12-20'
      }
    ],
    esgMetrics: [
      {
        id: 'esg-001-1',
        name: 'CO2 Emissions Reduced',
        category: 'environmental',
        currentValue: 45000,
        targetValue: 50000,
        unit: 'tonnes/year',
        progressPercent: 90,
        verificationStatus: 'verified',
        submissionHistory: [
          { month: 'Oct 2024', value: 42000, verified: true },
          { month: 'Nov 2024', value: 43500, verified: true },
          { month: 'Dec 2024', value: 45000, verified: true }
        ],
        lastUpdated: '2024-12-20'
      },
      {
        id: 'esg-001-2',
        name: 'Renewable Energy Generated',
        category: 'environmental',
        currentValue: 180,
        targetValue: 200,
        unit: 'GWh/year',
        progressPercent: 90,
        verificationStatus: 'verified',
        submissionHistory: [
          { month: 'Oct 2024', value: 165, verified: true },
          { month: 'Nov 2024', value: 172, verified: true },
          { month: 'Dec 2024', value: 180, verified: true }
        ],
        lastUpdated: '2024-12-20'
      }
    ],
    riskScore: {
      overall: 25,
      covenantComponent: 20,
      impactComponent: 32,
      level: 'low',
      trend: 'improving',
      recommendations: [
        'Continue current trajectory - on track to exceed ESG targets',
        'Consider sharing best practices with portfolio peers'
      ],
      lastCalculated: '2024-12-20'
    }
  },

  // 🟡 CAUTION - GreenBuild Construction (will breach with 15% EBITDA drop)
  {
    id: 'loan-002',
    companyName: 'GreenBuild Construction',
    sector: 'Sustainable Construction',
    loanAmount: 35000000,
    currency: 'EUR',
    originationDate: '2022-06-01',
    maturityDate: '2027-06-01',
    interestRate: 4.0,
    status: 'watchlist',
    relationshipManager: 'Hans Mueller',
    lastReviewDate: '2024-12-10',
    covenants: [
      {
        id: 'cov-002-1',
        name: 'Debt-to-EBITDA',
        type: 'financial',
        currentValue: 3.5,
        threshold: 4.0,
        operator: '<',
        unit: 'x',
        status: 'warning',
        cushionPercent: 12.5,
        daysToBreachEstimate: 45,
        trend: [3.0, 3.3, 3.5],
        lastUpdated: '2024-12-18'
      },
      {
        id: 'cov-002-2',
        name: 'DSCR',
        type: 'financial',
        currentValue: 1.25,
        threshold: 1.2,
        operator: '>',
        unit: 'x',
        status: 'compliant',
        cushionPercent: 4.2,
        daysToBreachEstimate: null,
        trend: [1.35, 1.30, 1.25],
        lastUpdated: '2024-12-18'
      }
    ],
    esgMetrics: [
      {
        id: 'esg-002-1',
        name: 'Green Certified Buildings',
        category: 'environmental',
        currentValue: 8,
        targetValue: 12,
        unit: 'buildings',
        progressPercent: 67,
        verificationStatus: 'verified',
        submissionHistory: [
          { month: 'Oct 2024', value: 6, verified: true },
          { month: 'Nov 2024', value: 7, verified: true },
          { month: 'Dec 2024', value: 8, verified: true }
        ],
        lastUpdated: '2024-12-15'
      },
      {
        id: 'esg-002-2',
        name: 'Recycled Materials Usage',
        category: 'environmental',
        currentValue: 42,
        targetValue: 60,
        unit: '%',
        progressPercent: 70,
        verificationStatus: 'pending',
        submissionHistory: [
          { month: 'Oct 2024', value: 38, verified: true },
          { month: 'Nov 2024', value: 40, verified: true },
          { month: 'Dec 2024', value: 42, verified: false }
        ],
        lastUpdated: '2024-12-15'
      }
    ],
    riskScore: {
      overall: 52,
      covenantComponent: 60,
      impactComponent: 40,
      level: 'medium',
      trend: 'deteriorating',
      recommendations: [
        'Schedule covenant review meeting within 2 weeks',
        'Request updated financial projections',
        'Accelerate ESG metric verification process'
      ],
      lastCalculated: '2024-12-18'
    }
  },

  // 🔴 CRISIS - EcoTransport Logistics (already breached, will worsen with stress)
  {
    id: 'loan-003',
    companyName: 'EcoTransport Logistics',
    sector: 'Green Transportation',
    loanAmount: 25000000,
    currency: 'EUR',
    originationDate: '2021-09-01',
    maturityDate: '2026-09-01',
    interestRate: 4.5,
    status: 'watchlist',
    relationshipManager: 'Sophie Bernard',
    lastReviewDate: '2024-12-22',
    covenants: [
      {
        id: 'cov-003-1',
        name: 'Debt-to-EBITDA',
        type: 'financial',
        currentValue: 3.8,
        threshold: 4.0,
        operator: '<',
        unit: 'x',
        status: 'warning',
        cushionPercent: 5,
        daysToBreachEstimate: 30,
        trend: [3.5, 3.7, 3.8],
        lastUpdated: '2024-12-22'
      },
      {
        id: 'cov-003-2',
        name: 'DSCR',
        type: 'financial',
        currentValue: 1.18,
        threshold: 1.2,
        operator: '>',
        unit: 'x',
        status: 'warning',
        cushionPercent: -1.7,
        daysToBreachEstimate: 20,
        trend: [1.3, 1.22, 1.18],
        lastUpdated: '2024-12-22'
      }
    ],
    esgMetrics: [
      {
        id: 'esg-003-1',
        name: 'Electric Fleet Percentage',
        category: 'environmental',
        currentValue: 35,
        targetValue: 50,
        unit: '%',
        progressPercent: 70,
        verificationStatus: 'rejected',
        submissionHistory: [
          { month: 'Oct 2024', value: 32, verified: true },
          { month: 'Nov 2024', value: 34, verified: true },
          { month: 'Dec 2024', value: 35, verified: false }
        ],
        lastUpdated: '2024-12-20'
      },
      {
        id: 'esg-003-2',
        name: 'Carbon Neutral Routes',
        category: 'environmental',
        currentValue: 120,
        targetValue: 200,
        unit: 'routes',
        progressPercent: 60,
        verificationStatus: 'pending',
        submissionHistory: [
          { month: 'Oct 2024', value: 100, verified: true },
          { month: 'Nov 2024', value: 110, verified: true },
          { month: 'Dec 2024', value: 120, verified: false }
        ],
        lastUpdated: '2024-12-20'
      }
    ],
export const mockLoans: GreenLoan[] = generateMockLoans(150);
      // Generate a larger, deterministic set of mock loans for frontend when backend is unavailable.
      function randBetween(min: number, max: number) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
      }

      function pick<T>(arr: T[], i: number) {
        return arr[i % arr.length];
      }

      const COMPANY_PREFIXES = [
        'SolarGrid',
        'GreenBuild',
        'EcoTransport',
        'CleanWater',
        'WindPower',
        'HydroWorks',
        'AgriNova',
        'ForestHoldings',
        'UrbanRenew',
        'BatteryCo'
      ];

      const SECTORS = [
        'Renewable Energy',
        'Sustainable Construction',
        'Green Transportation',
        'Water Treatment',
        'Agriculture',
        'Forestry',
        'Energy Storage',
        'Waste Management'
      ];

      function generateMockLoans(count = 150) {
        const loans: GreenLoan[] = [];
        for (let i = 1; i <= count; i++) {
          const prefix = pick(COMPANY_PREFIXES, i - 1);
          const companyName = `${prefix} ${i}`;
          const sector = pick(SECTORS, i - 1);
          const loanAmount = randBetween(5_000_000, 150_000_000);
          const statusRoll = randBetween(1, 100);
          let status: 'active' | 'watchlist' | 'default' = 'active';
          if (statusRoll > 85) status = 'default';
          else if (statusRoll > 60) status = 'watchlist';

          const overallRisk = randBetween(10, 90);

          const loan: GreenLoan = {
            id: `loan-${String(i).padStart(3, '0')}`,
            companyName,
            sector,
            loanAmount,
            currency: 'EUR',
            originationDate: '2023-01-01',
            maturityDate: '2030-12-31',
            interestRate: Number((randBetween(200, 500) / 100).toFixed(2)),
            status: status === 'default' ? 'watchlist' : 'active',
            relationshipManager: pick(['Johan Schmidt','Hans Mueller','Sophie Bernard','Erik Johansson','Lena Rossi'], i-1),
            lastReviewDate: '2024-12-20',
            covenants: [
              {
                id: `cov-${String(i).padStart(3,'0')}-1`,
                name: 'Debt-to-EBITDA',
                type: 'financial',
                currentValue: Number((randBetween(200, 450)/100).toFixed(2)),
                threshold: 4.0,
                operator: '<',
                unit: 'x',
                status: (overallRisk > 70) ? 'breached' : (overallRisk > 50) ? 'warning' : 'compliant',
                cushionPercent: randBetween(-20, 80),
                daysToBreachEstimate: overallRisk > 60 ? randBetween(10,120) : null,
                trend: [randBetween(200,400)/100, randBetween(200,400)/100, randBetween(200,400)/100],
                lastUpdated: '2024-12-20'
              }
            ],
            esgMetrics: [
              {
                id: `esg-${String(i).padStart(3,'0')}-1`,
                name: 'CO2 Emissions Reduced',
                category: 'environmental',
                currentValue: randBetween(1000,50000),
                targetValue: randBetween(50000,100000),
                unit: 'tonnes/year',
                progressPercent: randBetween(10,100),
                verificationStatus: 'verified',
                submissionHistory: [],
                lastUpdated: '2024-12-20'
              }
            ],
            riskScore: {
              overall: overallRisk,
              covenantComponent: randBetween(10,90),
              impactComponent: randBetween(10,90),
              level: overallRisk >= 75 ? 'high' : overallRisk >= 50 ? 'medium' : 'low',
              trend: overallRisk > 60 ? 'deteriorating' : 'stable',
              recommendations: [],
              lastCalculated: '2024-12-20'
            }
          } as unknown as GreenLoan;

          loans.push(loan);
        }
        return loans;
      }

      export const mockLoans: GreenLoan[] = generateMockLoans(150);
    currency: 'EUR',
    originationDate: '2022-11-01',
    maturityDate: '2032-11-01',
    interestRate: 3.75,
    status: 'active',
    relationshipManager: 'Erik Johansson',
    lastReviewDate: '2024-12-19',
    covenants: [
      {
        id: 'cov-005-1',
        name: 'Debt-to-EBITDA',
        type: 'financial',
        currentValue: 3.3,
        threshold: 4.0,
        operator: '<',
        unit: 'x',
        status: 'compliant',
        cushionPercent: 17.5,
        daysToBreachEstimate: 90,
        trend: [3.0, 3.2, 3.3],
        lastUpdated: '2024-12-19'
      },
      {
        id: 'cov-005-2',
        name: 'LLCR',
        type: 'financial',
        currentValue: 1.32,
        threshold: 1.3,
        operator: '>',
        unit: 'x',
        status: 'compliant',
        cushionPercent: 1.5,
        daysToBreachEstimate: null,
        trend: [1.35, 1.33, 1.32],
        lastUpdated: '2024-12-19'
      }
    ],
    esgMetrics: [
      {
        id: 'esg-005-1',
        name: 'Clean Energy Generated',
        category: 'environmental',
        currentValue: 850,
        targetValue: 1000,
        unit: 'GWh/year',
        progressPercent: 85,
        verificationStatus: 'verified',
        submissionHistory: [
          { month: 'Oct 2024', value: 800, verified: true },
          { month: 'Nov 2024', value: 825, verified: true },
          { month: 'Dec 2024', value: 850, verified: true }
        ],
        lastUpdated: '2024-12-19'
      },
      {
        id: 'esg-005-2',
        name: 'Homes Powered',
        category: 'social',
        currentValue: 285000,
        targetValue: 350000,
        unit: 'households',
        progressPercent: 81,
        verificationStatus: 'pending',
        submissionHistory: [
          { month: 'Oct 2024', value: 260000, verified: true },
          { month: 'Nov 2024', value: 275000, verified: true },
          { month: 'Dec 2024', value: 285000, verified: false }
        ],
        lastUpdated: '2024-12-19'
      }
    ],
    riskScore: {
      overall: 45,
      covenantComponent: 48,
      impactComponent: 40,
      level: 'medium',
      trend: 'stable',
      recommendations: [
        'Monitor covenant trajectory - approaching threshold',
        'Verify pending ESG submissions promptly',
        'Review wind generation forecasts for next quarter'
      ],
      lastCalculated: '2024-12-19'
    }
  }
];

export const mockNotifications: Notification[] = [
  {
    id: 'notif-001',
    type: 'alert',
    title: 'Covenant Breach Detected',
    message: 'EcoTransport Logistics Debt-to-EBITDA has exceeded threshold (4.2x vs 4.0x limit)',
    loanId: 'loan-003',
    timestamp: '2024-12-22T09:30:00Z',
    read: false
  },
  {
    id: 'notif-002',
    type: 'warning',
    title: 'Approaching Threshold',
    message: 'GreenBuild Construction covenant cushion below 15% - breach estimated in 45 days',
    loanId: 'loan-002',
    timestamp: '2024-12-20T14:15:00Z',
    read: false
  },
  {
    id: 'notif-003',
    type: 'info',
    title: 'ESG Verification Pending',
    message: 'WindPower Nordic December submissions awaiting third-party verification',
    loanId: 'loan-005',
    timestamp: '2024-12-19T11:00:00Z',
    read: true
  },
  {
    id: 'notif-004',
    type: 'success',
    title: 'ESG Target Achieved',
    message: 'SolarGrid Energy has reached 90% of annual CO2 reduction target ahead of schedule',
    loanId: 'loan-001',
    timestamp: '2024-12-18T16:45:00Z',
    read: true
  },
  {
    id: 'notif-005',
    type: 'warning',
    title: 'Verification Rejected',
    message: 'EcoTransport Logistics electric fleet data rejected - resubmission required',
    loanId: 'loan-003',
    timestamp: '2024-12-17T10:30:00Z',
    read: true
  }
];

import { calculatePortfolioSummary as calculatePortfolioSummaryShared } from '@/lib/portfolioSummary';

export const calculatePortfolioSummary = calculatePortfolioSummaryShared;
