// This function takes ANY loan and generates recommendations based on ONLY the risk score
// It works for all loans and does not use hardcoded IDs.
export function generateRecommendations(loan: any) {
  // Accept a flexible loan object. Prefer structured values where available.
  const risk = Number(loan.riskScore ?? (loan.riskScore?.overall ?? 0)) || 0;
  const esg = Number(loan.esgScore ?? loan.esgScore?.overall ?? 0) || 0;
  const days = loan.daysUntilBreach ?? (loan.covenants && loan.covenants[0] ? loan.covenants[0].daysToBreachEstimate : null);

  // Helper to assemble a recommendation with metadata
  const make = (base: any) => ({
    icon: base.icon,
    title: base.title,
    description: base.description,
    color: base.color,
    badge: base.badge,
    triggers: base.triggers || [],
    trend: base.trend || 'stable',
    suggestedActions: base.suggestedActions || [],
    daysUntilBreach: days ?? null,
  });

  // TIER 1: LOW RISK (0-35)
  if (risk <= 35) {
    return [
      make({
        icon: '✓',
        title: 'Maintain Current Position',
        description: `Strong covenant performance. Continue quarterly monitoring.`,
        color: 'green',
        badge: 'Low Risk',
        suggestedActions: ['Quarterly review', 'Monitor covenants'],
        triggers: []
      }),
      make({
        icon: '📈',
        title: 'ESG Improvement Opportunity',
        description: `Current ESG: ${esg || 'N/A'}/100. Improve to unlock better rates.`,
        color: 'blue',
        badge: 'Growth',
        suggestedActions: ['Discuss ESG improvements', 'Consider green incentives'],
        triggers: [{ metric: 'ESG Score', threshold: 'Industry avg', value: esg }]
      }),
      make({
        icon: '💰',
        title: 'Early Repayment Option',
        description: `Consider early repayment at current favorable rates.`,
        color: 'teal',
        badge: 'Opportunity',
        suggestedActions: ['Model prepayment savings'],
        triggers: []
      })
    ];
  }

  // TIER 2: MEDIUM RISK (35-65)
  if (risk <= 65) {
    return [
      make({
        icon: '⚠️',
        title: 'Monitor Closely',
        description: `Risk Score ${risk}/100: Covenant approaching threshold. Monthly reviews essential.`,
        color: 'orange',
        badge: 'Medium Risk',
        suggestedActions: ['Monthly metrics check', 'Increase monitoring cadence'],
        triggers: [{ metric: 'Risk Score', threshold: '>=35', value: risk }]
      }),
      make({
        icon: '📞',
        title: 'Borrower Communication',
        description: `Schedule immediate covenant review meeting to discuss early warning signals.`,
        color: 'orange',
        badge: 'Action',
        suggestedActions: ['Schedule call', 'Request latest financials'],
        triggers: []
      }),
      make({
        icon: '💡',
        title: 'Covenant Flexibility Options',
        description: `Explore covenant amendment. ESG: ${esg || 'N/A'}/100 may support negotiation.`,
        color: 'yellow',
        badge: 'Option',
        suggestedActions: ['Model amendment impacts'],
        triggers: [{ metric: 'ESG Score', threshold: '>=industry avg', value: esg }]
      })
    ];
  }

  // TIER 3: HIGH RISK (65-85)
  if (risk <= 85) {
    return [
      make({
        icon: '🚨',
        title: 'Immediate Review Required',
        description: `Risk Score ${risk}/100: HIGH RISK. Schedule urgent review within 7 days.`,
        color: 'red',
        badge: 'URGENT',
        suggestedActions: ['Immediate covenant review', 'Collect updated financials'],
        triggers: [{ metric: 'Risk Score', threshold: '>=65', value: risk }, ...(loan.covenants?.map((c:any)=>({ metric: c.name, threshold: c.threshold, value: c.currentValue }))||[])]
      }),
      make({
        icon: '💼',
        title: 'Restructuring Exploration',
        description: `Explore covenant restructuring or forbearance agreement options.`,
        color: 'red',
        badge: 'URGENT',
        suggestedActions: ['Model restructuring scenarios', 'Engage legal/workout team'],
        triggers: []
      }),
      make({
        icon: '📊',
        title: 'Stress Test Analysis',
        description: `Run stress scenarios to identify breaking points and cash flow cushion.`,
        color: 'orange',
        badge: 'Analysis',
        suggestedActions: ['Run mild/mid/severe stress tests'],
        triggers: []
      })
    ];
  }

  // TIER 4: CRITICAL RISK (85+)
  return [
    make({
      icon: '🚨',
      title: 'CRITICAL: Breach Imminent',
      description: `Risk Score ${risk}/100: CRITICAL. Breach likely within ${days ?? 30} days. IMMEDIATE ACTION REQUIRED.`,
      color: 'darkred',
      badge: 'CRITICAL',
      suggestedActions: ['Escalate to senior management', 'Prepare restructuring proposals'],
      triggers: [{ metric: 'Risk Score', threshold: '>=85', value: risk }]
    }),
    make({
      icon: '⚡',
      title: 'Emergency Restructuring',
      description: `Initiate emergency covenant amendment or forbearance. Finalize within 48 hours.`,
      color: 'darkred',
      badge: 'CRITICAL',
      suggestedActions: ['Negotiate immediate covenant relief', 'Approve emergency liquidity measures']
    }),
    make({
      icon: '🤝',
      title: 'Activate Workout Team',
      description: `Engage specialized workout team. Schedule emergency meeting today.`,
      color: 'darkred',
      badge: 'CRITICAL',
      suggestedActions: ['Convene workout team', 'Assign case manager']
    })
  ];
}

export default generateRecommendations;
