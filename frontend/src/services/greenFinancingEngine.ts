/**
 * Green Financing Intelligence Engine
 * EU Taxonomy Classification, Green Bond Eligibility, Impact Metrics
 */

interface GreenFinancingIntelligence {
  euTaxonomy: EuTaxonomyClassification;
  greenBond: GreenBondEligibility;
  impactMetrics: ImpactMetrics;
  overallGreenScore: number; // 0-100
}

interface EuTaxonomyClassification {
  classification: 'Dark Green' | 'Light Green' | 'Transition' | 'Brown' | 'Unclassified';
  alignmentPercentage: number; // 0-100
  naceCode: string;
  technicalScreeningCriteria: Array<{
    criterion: string;
    status: 'MET' | 'NOT_MET' | 'UNKNOWN';
  }>;
  explanation: string;
}

interface GreenBondEligibility {
  isEligible: boolean;
  eligibilityPercentage: number; // 0-100 (% of loan eligible)
  eligibleAmount: number;
  savingsPercentage: number; // Interest savings vs conventional bond
  annualSavings: number;
  frameworkCompliance: {
    useOfProceeds: boolean;
    processQuality: boolean;
    reporting: boolean;
    externalReview: boolean;
  };
  complianceChecklist: Array<{
    requirement: string;
    status: 'COMPLIANT' | 'NON_COMPLIANT' | 'PENDING_DATA';
  }>;
}

interface ImpactMetrics {
  co2ReductionTonnes: number; // Annual tonnes of CO2 avoided
  renewableEnergyMwh: number; // Annual MWh of clean energy
  waterSavedM3: number; // Annual cubic meters of water saved
  wasteRecycledTonnes: number; // Annual tonnes of waste recycled
  jobsCreated: number; // Green jobs created
  sdgAlignment: string[]; // UN Sustainable Development Goals (e.g., "SDG 7: Affordable Clean Energy")
  impactPerDollar: {
    co2PerMillion: number; // tonnes CO2 per €1M
    renewablePerMillion: number; // MWh per €1M
  };
  equivalencyMetrics: {
    carsRemovedFromRoads: number; // Equivalent cars off roads
    housesEnergySupply: number; // Equivalent homes powered annually
  };
}

interface LoanDetails {
  amount: number; // EUR
  currency: string;
  sector: string;
  companySector: string;
  capexData?: {
    greenCapEx: number;
    totalCapEx: number;
  };
  energyUsage?: {
    currentConsumption: number; // kWh annually
    targetReduction: number; // % reduction target
  };
  emissionsData?: {
    currentEmissions: number; // tonnes CO2 equivalent annually
    emissionReductionTarget: number; // % target
  };
}

class GreenFinancingEngine {
  /**
   * EU Taxonomy Classification Engine
   */
  classifyEuTaxonomy(loan: LoanDetails): EuTaxonomyClassification {
    let classification: 'Dark Green' | 'Light Green' | 'Transition' | 'Brown' | 'Unclassified' = 'Unclassified';
    let alignmentPercentage = 0;
    const technicalScreeningCriteria = [];

    // Determine classification based on sector and investment type
    const sectorLower = loan.companySector.toLowerCase();
    const isGreenSector =
      sectorLower.includes('solar') ||
      sectorLower.includes('wind') ||
      sectorLower.includes('renewable') ||
      sectorLower.includes('green') ||
      sectorLower.includes('sustainable');

    const isTransitionSector =
      sectorLower.includes('gas') ||
      sectorLower.includes('manufacturing') ||
      sectorLower.includes('chemical');

    if (isGreenSector) {
      // Check capex alignment
      if (loan.capexData && loan.capexData.greenCapEx / loan.capexData.totalCapEx > 0.8) {
        classification = 'Dark Green';
        alignmentPercentage = 100;
      } else if (loan.capexData && loan.capexData.greenCapEx / loan.capexData.totalCapEx > 0.5) {
        classification = 'Light Green';
        alignmentPercentage = 75;
      } else {
        classification = 'Light Green';
        alignmentPercentage = 60;
      }
    } else if (isTransitionSector) {
      if (loan.energyUsage?.targetReduction && loan.energyUsage.targetReduction > 25) {
        classification = 'Transition';
        alignmentPercentage = 50;
      } else {
        classification = 'Brown';
        alignmentPercentage = 5;
      }
    } else {
      classification = 'Brown';
      alignmentPercentage = 0;
    }

    // Technical Screening Criteria
    technicalScreeningCriteria.push({
      criterion: 'Do No Significant Harm (DNSH)',
      status: classification === 'Brown' ? 'NOT_MET' : 'MET',
    });
    technicalScreeningCriteria.push({
      criterion: 'Minimum Safeguards',
      status: 'MET',
    });
    technicalScreeningCriteria.push({
      criterion: 'Climate Mitigation Contribution',
      status: classification !== 'Brown' ? 'MET' : 'NOT_MET',
    });
    technicalScreeningCriteria.push({
      criterion: 'Adaptation & Resilience',
      status: classification === 'Dark Green' ? 'MET' : 'UNKNOWN',
    });

    const naceCodeMap: { [key: string]: string } = {
      solar: '3.1.1', // Solar energy
      wind: '3.1.2', // Wind energy
      renewable: '3.1.3', // Hydropower and other renewables
      sustainable: '3.1.4', // Other renewable energy sources
      manufacturing: '4.3', // Energy efficiency retrofitting
      gas: '4.27', // Clean transport
      default: 'UNCLASSIFIED',
    };

    let naceCode = 'UNCLASSIFIED';
    for (const [key, code] of Object.entries(naceCodeMap)) {
      if (sectorLower.includes(key)) {
        naceCode = code;
        break;
      }
    }

    const explanations: {
      [key in 'Dark Green' | 'Light Green' | 'Transition' | 'Brown' | 'Unclassified']: string;
    } = {
      'Dark Green':
        'Loan fully aligned with EU Taxonomy green activities. 100% eligible for green financing.',
      'Light Green':
        'Loan substantially aligned with EU Taxonomy. Primary business activities are green.',
      Transition:
        'Transition finance. Loan supports move to net-zero but not yet fully green.',
      Brown: 'Not aligned with EU Taxonomy. Limited green financing eligibility.',
      Unclassified: 'Insufficient data to classify under EU Taxonomy framework.',
    };

    return {
      classification,
      alignmentPercentage,
      naceCode,
      technicalScreeningCriteria,
      explanation: explanations[classification],
    };
  }

  /**
   * Green Bond Eligibility Calculator
   */
  calculateGreenBondEligibility(
    loan: LoanDetails,
    taxonomyClassification: EuTaxonomyClassification
  ): GreenBondEligibility {
    let isEligible = taxonomyClassification.classification !== 'Brown';
    let eligibilityPercentage = taxonomyClassification.alignmentPercentage;

    if (taxonomyClassification.classification === 'Brown') {
      isEligible = false;
      eligibilityPercentage = 0;
    } else if (taxonomyClassification.classification === 'Light Green') {
      isEligible = true;
      eligibilityPercentage = 75;
    }

    const eligibleAmount = (loan.amount * eligibilityPercentage) / 100;
    const savingsPercentage = isEligible ? 0.15 : 0; // 15bps savings on green bonds
    const annualSavings = (eligibleAmount * (loan.amount / eligibleAmount)) * (savingsPercentage / 100);

    const complianceChecklist = [
      { requirement: 'Use of Proceeds Clarity', status: isEligible ? 'COMPLIANT' : 'NON_COMPLIANT' as const },
      { requirement: 'Process Quality & Governance', status: 'COMPLIANT' as const },
      { requirement: 'Reporting & Transparency', status: isEligible ? 'COMPLIANT' : 'PENDING_DATA' as const },
      { requirement: 'External Review (SPO/IIR)', status: isEligible ? 'COMPLIANT' : 'NON_COMPLIANT' as const },
    ];

    return {
      isEligible,
      eligibilityPercentage,
      eligibleAmount,
      savingsPercentage,
      annualSavings: Math.round(annualSavings),
      frameworkCompliance: {
        useOfProceeds: isEligible,
        processQuality: isEligible,
        reporting: isEligible,
        externalReview: isEligible,
      },
      complianceChecklist,
    };
  }

  /**
   * Impact Metrics Aggregator
   */
  calculateImpactMetrics(loan: LoanDetails): ImpactMetrics {
    // Calculate based on loan amount, sector, and provided data
    const baseMultiplier = loan.amount / 1_000_000; // Per EUR 1M

    let co2ReductionTonnes = 0;
    let renewableEnergyMwh = 0;
    let waterSavedM3 = 0;
    let wasteRecycledTonnes = 0;
    let jobsCreated = 0;
    const sdgAlignment: string[] = [];

    const sectorLower = loan.companySector.toLowerCase();

    // Solar/Wind/Renewable loans
    if (sectorLower.includes('solar') || sectorLower.includes('renewable')) {
      co2ReductionTonnes = baseMultiplier * 280; // 280 tonnes CO2/€1M
      renewableEnergyMwh = baseMultiplier * 40; // 40 MWh/€1M
      jobsCreated = baseMultiplier * 3; // 3 jobs/€1M
      sdgAlignment.push('SDG 7: Affordable Clean Energy', 'SDG 13: Climate Action');
    }

    if (sectorLower.includes('wind')) {
      co2ReductionTonnes += baseMultiplier * 350; // 350 tonnes CO2/€1M
      renewableEnergyMwh += baseMultiplier * 50; // 50 MWh/€1M
      jobsCreated += baseMultiplier * 4; // 4 jobs/€1M
    }

    if (
      sectorLower.includes('water') ||
      sectorLower.includes('efficiency') ||
      sectorLower.includes('green')
    ) {
      waterSavedM3 = baseMultiplier * 500_000; // 500K m³/€1M
      wasteRecycledTonnes = baseMultiplier * 100; // 100 tonnes/€1M
      sdgAlignment.push('SDG 6: Clean Water', 'SDG 12: Responsible Consumption');
    }

    // Add custom emissions data if provided
    if (loan.emissionsData?.emissionReductionTarget) {
      const customReduction = (loan.emissionsData.currentEmissions * loan.emissionsData.emissionReductionTarget) / 100;
      co2ReductionTonnes += customReduction;
    }

    // Add SDG 8 for job creation
    if (jobsCreated > 0) {
      sdgAlignment.push('SDG 8: Decent Work and Economic Growth');
    }

    // Remove duplicates
    const uniqueSdg = [...new Set(sdgAlignment)];

    const impactPerDollar = {
      co2PerMillion: Math.round(co2ReductionTonnes / baseMultiplier),
      renewablePerMillion: Math.round(renewableEnergyMwh / baseMultiplier),
    };

    const equivalencyMetrics = {
      carsRemovedFromRoads: Math.round((co2ReductionTonnes / 16) * 0.8), // Average car emits 16 tonnes CO2/year
      housesEnergySupply: Math.round(renewableEnergyMwh / 12), // Average house uses 12 MWh/year
    };

    return {
      co2ReductionTonnes: Math.round(co2ReductionTonnes),
      renewableEnergyMwh: Math.round(renewableEnergyMwh),
      waterSavedM3: Math.round(waterSavedM3),
      wasteRecycledTonnes: Math.round(wasteRecycledTonnes),
      jobsCreated: Math.round(jobsCreated),
      sdgAlignment: uniqueSdg,
      impactPerDollar,
      equivalencyMetrics,
    };
  }

  /**
   * Full green financing intelligence analysis
   */
  analyzeGreenFinancing(loan: LoanDetails): GreenFinancingIntelligence {
    const euTaxonomy = this.classifyEuTaxonomy(loan);
    const greenBond = this.calculateGreenBondEligibility(loan, euTaxonomy);
    const impactMetrics = this.calculateImpactMetrics(loan);

    // Overall score: 0-100
    let overallGreenScore = euTaxonomy.alignmentPercentage * 0.6 + (impactMetrics.co2ReductionTonnes > 0 ? 40 : 0);
    if (greenBond.isEligible) overallGreenScore += 20;
    overallGreenScore = Math.min(100, overallGreenScore);

    return {
      euTaxonomy,
      greenBond,
      impactMetrics,
      overallGreenScore: Math.round(overallGreenScore),
    };
  }

  /**
   * Portfolio-level aggregation
   */
  aggregatePortfolioImpact(loans: LoanDetails[]): {
    totalGreenEligible: number;
    greenBondOpportunity: number;
    portfolioImpact: ImpactMetrics;
    averageGreenScore: number;
  } {
    let totalAmount = 0;
    let totalGreenEligible = 0;
    let greenBondOpportunity = 0;
    const portfolioImpact: ImpactMetrics = {
      co2ReductionTonnes: 0,
      renewableEnergyMwh: 0,
      waterSavedM3: 0,
      wasteRecycledTonnes: 0,
      jobsCreated: 0,
      sdgAlignment: [],
      impactPerDollar: { co2PerMillion: 0, renewablePerMillion: 0 },
      equivalencyMetrics: { carsRemovedFromRoads: 0, housesEnergySupply: 0 },
    };
    let totalGreenScore = 0;

    for (const loan of loans) {
      const analysis = this.analyzeGreenFinancing(loan);
      totalAmount += loan.amount;
      totalGreenEligible += analysis.greenBond.eligibleAmount;
      greenBondOpportunity += analysis.greenBond.eligibleAmount;

      // Aggregate impact metrics
      portfolioImpact.co2ReductionTonnes += analysis.impactMetrics.co2ReductionTonnes;
      portfolioImpact.renewableEnergyMwh += analysis.impactMetrics.renewableEnergyMwh;
      portfolioImpact.waterSavedM3 += analysis.impactMetrics.waterSavedM3;
      portfolioImpact.wasteRecycledTonnes += analysis.impactMetrics.wasteRecycledTonnes;
      portfolioImpact.jobsCreated += analysis.impactMetrics.jobsCreated;
      portfolioImpact.sdgAlignment.push(...analysis.impactMetrics.sdgAlignment);
      totalGreenScore += analysis.overallGreenScore;
    }

    portfolioImpact.sdgAlignment = [...new Set(portfolioImpact.sdgAlignment)]; // Remove duplicates
    portfolioImpact.impactPerDollar.co2PerMillion = totalAmount > 0 ? Math.round((portfolioImpact.co2ReductionTonnes * 1_000_000) / totalAmount) : 0;
    portfolioImpact.impactPerDollar.renewablePerMillion = totalAmount > 0 ? Math.round((portfolioImpact.renewableEnergyMwh * 1_000_000) / totalAmount) : 0;
    portfolioImpact.equivalencyMetrics.carsRemovedFromRoads = Math.round((portfolioImpact.co2ReductionTonnes / 16) * 0.8);
    portfolioImpact.equivalencyMetrics.housesEnergySupply = Math.round(portfolioImpact.renewableEnergyMwh / 12);

    return {
      totalGreenEligible,
      greenBondOpportunity,
      portfolioImpact,
      averageGreenScore: loans.length > 0 ? Math.round(totalGreenScore / loans.length) : 0,
    };
  }
}

export const greenFinancingEngine = new GreenFinancingEngine();
export type {
  GreenFinancingIntelligence,
  EuTaxonomyClassification,
  GreenBondEligibility,
  ImpactMetrics,
  LoanDetails,
};
