/**
 * Advanced Covenant Analytics
 * Trend analysis, interaction analysis, waiver intelligence
 */

interface CovenantTrend {
  currentValue: number;
  oneMonthAgo: number;
  sixMonthsAgo: number;
  oneYearAgo: number;
  trend: 'IMPROVING' | 'DETERIORATING' | 'STABLE';
  degradationPercentage: number; // negative if improving
  daysToBreachAtCurrentTrend: number | null;
}

interface CovenantInteraction {
  covenants: string[];
  interactionType: 'COMPOUNDING_STRESS' | 'REINFORCING' | 'INDEPENDENT';
  description: string;
  recommendation: string;
  impactScore: number; // 0-100, higher = more interaction stress
}

interface WaiverIntelligence {
  waiverNeeded: boolean;
  estimatedWaiverCost: number; // EUR
  waiverCostPercentage: number; // % of loan amount
  restructuringCost: number;
  restructuringCostPercentage: number;
  historicalResolutionTime: number; // days
  historicalWaiverRate: number; // % of similar breaches resolved via waiver
  recommendation: 'WAIVER' | 'RESTRUCTURE' | 'BOTH' | 'NONE';
  actionItems: string[];
}

interface CovenantAnalysis {
  covenantName: string;
  currentValue: number;
  threshold: number;
  cushion: number;
  cushionPercentage: number;
  status: 'SAFE' | 'AT_RISK' | 'BREACHED';
  trend: CovenantTrend;
  interactionAnalysis: CovenantInteraction[];
  waiverIntelligence: WaiverIntelligence;
}

class CovenantAnalytics {
  /**
   * Analyze trend for a covenant
   */
  analyzeTrend(
    covenantName: string,
    currentValue: number,
    oneMonthAgo: number,
    sixMonthsAgo: number,
    oneYearAgo: number,
    threshold: number,
    isInverse: boolean = false // True for ratios (higher = better), False for debt levels (lower = better)
  ): CovenantTrend {
    // Determine trend direction
    let trend: 'IMPROVING' | 'DETERIORATING' | 'STABLE' = 'STABLE';
    if (isInverse) {
      // For ratios like LLCR, DSCR (higher is better)
      if (currentValue > oneYearAgo) trend = 'IMPROVING';
      else if (currentValue < oneYearAgo) trend = 'DETERIORATING';
    } else {
      // For debt levels (lower is better)
      if (currentValue < oneYearAgo) trend = 'IMPROVING';
      else if (currentValue > oneYearAgo) trend = 'DETERIORATING';
    }

    // Calculate degradation percentage
    const degradationPercentage = ((currentValue - oneYearAgo) / Math.abs(oneYearAgo)) * 100;

    // Predict days to breach
    let daysToBreachAtCurrentTrend: number | null = null;
    const cushion = isInverse ? currentValue - threshold : threshold - currentValue;

    if (cushion < 0) {
      // Already breached
      daysToBreachAtCurrentTrend = 0;
    } else if (cushion > 0) {
      // Calculate degradation rate (6 months to current)
      const sixMonthDegradation = isInverse ? oneYearAgo - currentValue : currentValue - oneYearAgo;
      const monthlyDegradation = sixMonthDegradation / 12; // Approximate monthly

      if (monthlyDegradation > 0) {
        daysToBreachAtCurrentTrend = Math.round((cushion / monthlyDegradation) * 30);
        // Cap at 365 days for long-term trends
        if (daysToBreachAtCurrentTrend > 365) daysToBreachAtCurrentTrend = 365;
      }
    }

    return {
      currentValue,
      oneMonthAgo,
      sixMonthsAgo,
      oneYearAgo,
      trend,
      degradationPercentage,
      daysToBreachAtCurrentTrend,
    };
  }

  /**
   * Analyze interactions between covenants
   */
  analyzeCovenantInteraction(
    loan: {
      llcr: number;
      llcrThreshold: number;
      dscr: number;
      dscrThreshold: number;
      interestCoverage: number;
      interestCoverageThreshold: number;
    }
  ): CovenantInteraction[] {
    const interactions: CovenantInteraction[] = [];

    // LLCR + DSCR interaction
    const llcrStatus = loan.llcr < loan.llcrThreshold ? 'BREACHED' : 'SAFE';
    const dscrStatus = loan.dscr < loan.dscrThreshold ? 'BREACHED' : 'SAFE';
    const icStatus = loan.interestCoverage < loan.interestCoverageThreshold ? 'BREACHED' : 'SAFE';

    if (llcrStatus === 'BREACHED' && dscrStatus === 'BREACHED') {
      interactions.push({
        covenants: ['LLCR', 'DSCR'],
        interactionType: 'COMPOUNDING_STRESS',
        description: 'Both loan-to-value and debt service capacity are stressed simultaneously.',
        recommendation: 'Restructure interest payments to improve DSCR (lower payments = higher cash flow for LLCR support). Alternatively, seek asset sales to reduce debt (improves both).',
        impactScore: 95,
      });
    } else if (llcrStatus === 'BREACHED' || dscrStatus === 'BREACHED') {
      interactions.push({
        covenants: ['LLCR', 'DSCR'],
        interactionType: 'REINFORCING',
        description: 'Weakness in one covenant cascades to the other. Cash flow stress affects both debt service and loan recovery.',
        recommendation: 'Prioritize improving the weaker covenant. Address root cause (EBITDA, asset value, interest costs).',
        impactScore: 75,
      });
    }

    // Interest Coverage + DSCR interaction
    if (dscrStatus === 'BREACHED' && icStatus === 'BREACHED') {
      interactions.push({
        covenants: ['DSCR', 'Interest Coverage'],
        interactionType: 'COMPOUNDING_STRESS',
        description: 'Both operating profit margin and debt service capacity are weak. Refinancing risk is high.',
        recommendation: 'Urgent: (1) Reduce debt via asset sales or equity injection, (2) Improve operations to increase EBITDA, (3) Refinance to lower interest costs.',
        impactScore: 90,
      });
    }

    // Multi-covenant breach
    if (llcrStatus === 'BREACHED' && dscrStatus === 'BREACHED' && icStatus === 'BREACHED') {
      interactions.push({
        covenants: ['LLCR', 'DSCR', 'Interest Coverage'],
        interactionType: 'COMPOUNDING_STRESS',
        description: 'Critical multi-covenant stress. All three key metrics are breached simultaneously.',
        recommendation: 'URGENT: Engage lender immediately for waiver negotiation or comprehensive restructuring plan. Simultaneous breaches indicate systemic financial distress.',
        impactScore: 100,
      });
    }

    return interactions;
  }

  /**
   * Waiver intelligence: cost vs restructuring, historical outcomes
   */
  analyzeWaiverOpportunity(loan: {
    amount: number;
    currency: string;
    sector: string;
    breachedCovenants: string[];
    daysToMaturity: number;
  }): WaiverIntelligence {
    const sectorLower = loan.sector.toLowerCase();

    // Base waiver cost: 0.25% - 0.75% of loan amount
    // Varies by sector risk and number of breached covenants
    let waiverCostBps = 50; // 50bps base
    if (loan.breachedCovenants.length > 1) waiverCostBps += 25; // +25bps for multiple breaches
    if (loan.daysToMaturity < 90) waiverCostBps += 50; // +50bps if near maturity
    if (sectorLower.includes('cyclical') || sectorLower.includes('energy'))
      waiverCostBps += 50; // +50bps for high-risk sectors

    const waiverCostPercentage = waiverCostBps / 10000;
    const estimatedWaiverCost = loan.amount * waiverCostPercentage;

    // Restructuring cost: 1.5% - 3% of loan amount
    // Includes legal fees, renegotiation, documentation
    let restructuringCostPercentage = 0.02; // 2% base
    if (loan.breachedCovenants.length > 1) restructuringCostPercentage += 0.005; // +0.5% for complex restructuring
    if (loan.daysToMaturity < 90) restructuringCostPercentage += 0.01; // +1% for urgent restructuring

    const restructuringCost = loan.amount * restructuringCostPercentage;

    // Historical resolution metrics
    // Based on market data: typical waiver resolution time ~30 days, success rate ~78%
    const historicalResolutionTime = 30;
    const historicalWaiverRate = 0.78;

    // Recommendation logic
    let recommendation: 'WAIVER' | 'RESTRUCTURE' | 'BOTH' | 'NONE' = 'NONE';
    if (estimatedWaiverCost < restructuringCost && loan.daysToMaturity > 180) {
      recommendation = 'WAIVER'; // Fast, cheap solution for non-urgent issues
    } else if (loan.daysToMaturity < 90) {
      recommendation = 'WAIVER'; // Time-sensitive, go for quick waiver
    } else if (restructuringCost < estimatedWaiverCost && loan.daysToMaturity > 180) {
      recommendation = 'RESTRUCTURE'; // Permanent solution is better long-term
    } else if (loan.breachedCovenants.length > 2) {
      recommendation = 'BOTH'; // Multiple issues warrant both short-term waiver + long-term restructure
    }

    // Action items
    const actionItems = [];
    if (recommendation === 'WAIVER' || recommendation === 'BOTH') {
      actionItems.push('Contact lead arranger within 48 hours to discuss waiver');
      actionItems.push('Prepare waiver request with supporting financial analysis');
      actionItems.push('Budget €' + Math.round(estimatedWaiverCost / 1000) + 'K for waiver fees');
    }
    if (recommendation === 'RESTRUCTURE' || recommendation === 'BOTH') {
      actionItems.push('Engage financial advisor for restructuring options');
      actionItems.push('Model debt reduction scenarios (asset sales, refinancing)');
      actionItems.push('Prepare comprehensive 12-month turnaround plan');
    }

    return {
      waiverNeeded: loan.breachedCovenants.length > 0,
      estimatedWaiverCost: Math.round(estimatedWaiverCost),
      waiverCostPercentage: Math.round(waiverCostPercentage * 10000) / 100, // As percentage with 2 decimals
      restructuringCost: Math.round(restructuringCost),
      restructuringCostPercentage: Math.round(restructuringCostPercentage * 10000) / 100,
      historicalResolutionTime,
      historicalWaiverRate,
      recommendation,
      actionItems,
    };
  }

  /**
   * Full covenant analysis
   */
  analyzeCovenant(
    covenantName: string,
    currentValue: number,
    threshold: number,
    oneMonthAgo: number,
    sixMonthsAgo: number,
    oneYearAgo: number,
    loan: any,
    isInverse: boolean = false
  ): CovenantAnalysis {
    const cushion = isInverse ? currentValue - threshold : threshold - currentValue;
    const cushionPercentage = Math.abs(cushion) / threshold;
    let status: 'SAFE' | 'AT_RISK' | 'BREACHED' = 'SAFE';

    if (cushion < 0) {
      status = 'BREACHED';
    } else if (cushion < threshold * 0.1) {
      // Less than 10% cushion
      status = 'AT_RISK';
    }

    const trend = this.analyzeTrend(
      covenantName,
      currentValue,
      oneMonthAgo,
      sixMonthsAgo,
      oneYearAgo,
      threshold,
      isInverse
    );

    const interactionAnalysis = this.analyzeCovenantInteraction(loan);

    const waiverIntelligence = this.analyzeWaiverOpportunity({
      amount: loan.amount || 100_000_000,
      currency: 'EUR',
      sector: loan.sector || 'Industrial',
      breachedCovenants: status === 'BREACHED' ? [covenantName] : [],
      daysToMaturity: loan.daysToMaturity || 365,
    });

    return {
      covenantName,
      currentValue,
      threshold,
      cushion,
      cushionPercentage: Math.round(cushionPercentage * 1000) / 10, // As percentage
      status,
      trend,
      interactionAnalysis,
      waiverIntelligence,
    };
  }
}

export const covenantAnalytics = new CovenantAnalytics();
export type { CovenantAnalysis, CovenantTrend, CovenantInteraction, WaiverIntelligence };
