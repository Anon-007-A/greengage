import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { logger } from '@/lib/logger';

type Loan = {
  id: string;
  name?: string;
  riskScore: number;
  covenantType?: string;
  esgScore?: number;
  daysUntilBreach?: number | null;
  sector?: string;
  loanAmount?: number;
  borrower?: string;
};

export type Recommendation = {
  id: string;
  icon: string; // emoji or short string
  title: string;
  description: string;
  impact: string;
  timeline: string;
  urgency: 'low' | 'medium' | 'high' | 'critical' | 'info' | 'teal';
  actionLabel?: string;
};

const COLOR_MAP: Record<string, string> = {
  low: '#10B981', // green
  medium: '#F59E0B', // yellow
  high: '#FF6B35', // orange
  critical: '#DC2626', // red
  info: '#3B82F6', // blue
  teal: '#14B8A6',
};

export function generateRecommendations(loan: Loan): Recommendation[] {
  // Mock overrides for specific example loans (helps during testing)
  if (loan.id === 'loan-107') {
    return [
      {
        id: 'rec-maintain',
        icon: '✓',
        title: 'Maintain Current Position',
        description: 'Strong covenant performance. Continue quarterly monitoring.',
        impact: 'Maintains 0% risk',
        timeline: 'Ongoing',
        urgency: 'low',
        actionLabel: 'View Details',
      },
      {
        id: 'rec-esg',
        icon: '📈',
        title: 'ESG Improvement Opportunity',
        description: 'Improve ESG by 10 points to access better refinancing rates.',
        impact: 'Expected Savings: €50K-150K per year',
        timeline: '6-month program',
        urgency: 'info',
        actionLabel: 'View Details',
      },
      {
        id: 'rec-repay',
        icon: '💰',
        title: 'Early Repayment Option',
        description: 'Consider early repayment at current rates (locked until Jan 20).',
        impact: 'Saves interest costs',
        timeline: 'Decision by Jan 15',
        urgency: 'teal',
        actionLabel: 'Schedule Call',
      },
    ];
  }

  if (loan.id === 'loan-27') {
    // High risk sample
    return [
      {
        id: '27-review',
        icon: '🚨',
        title: 'Immediate Review Required',
        description: 'High breach probability. Schedule urgent borrower review and credit committee briefing.',
        impact: 'Prevent breach, identify remediation',
        timeline: 'Within 7 days',
        urgency: 'high',
        actionLabel: 'Schedule Meeting',
      },
      {
        id: '27-restructure',
        icon: '💼',
        title: 'Explore Restructuring',
        description: 'Assess covenant amendment or temporary forbearance to buy time for recovery.',
        impact: 'Reduce breach probability by 40-60%',
        timeline: 'Negotiate within 2 weeks',
        urgency: 'high',
        actionLabel: 'View Details',
      },
      {
        id: '27-workout',
        icon: '🤝',
        title: 'Activate Workout Team',
        description: 'Deploy a cross-functional workout team to create a rapid remediation plan.',
        impact: 'Stabilize operations and cashflow',
        timeline: 'Team meeting within 48 hours',
        urgency: 'critical',
        actionLabel: 'Schedule Call',
      },
    ];
  }

  if (loan.id === 'loan-42') {
    // Low risk sample
    return [
      {
        id: '42-maintain',
        icon: '✓',
        title: 'Maintain Current Position',
        description: 'Covenants are healthy. Continue quarterly monitoring and standard reporting.',
        impact: 'Low maintenance overhead',
        timeline: 'Ongoing',
        urgency: 'low',
        actionLabel: 'View Details',
      },
      {
        id: '42-esg',
        icon: '📈',
        title: 'ESG Upside Program',
        description: 'Target incremental ESG improvements to unlock preferential pricing.',
        impact: 'Potential savings: €30K-100K/year',
        timeline: '6-month roadmap',
        urgency: 'info',
        actionLabel: 'View Details',
      },
    ];
  }

  if (loan.id === 'loan-200') {
    // Critical risk sample
    return [
      {
        id: '200-critical',
        icon: '🚨',
        title: 'CRITICAL: Breach Imminent',
        description: 'Immediate actions required to avoid imminent covenant breach.',
        impact: 'Prevent covenant breach',
        timeline: 'Action required TODAY',
        urgency: 'critical',
        actionLabel: 'Schedule Call',
      },
      {
        id: '200-forbear',
        icon: '⚡',
        title: 'Emergency Forbearance',
        description: 'Seek short-term forbearance or amendment to pause enforcement while plan executes.',
        impact: 'Buy time for operational fixes',
        timeline: 'Finalize within 48 hours',
        urgency: 'critical',
        actionLabel: 'View Details',
      },
      {
        id: '200-workout',
        icon: '🤝',
        title: 'Engage Restructuring Advisors',
        description: 'Engage specialist advisors and syndicate to design turn-around measures.',
        impact: 'Stabilize and reduce tail-risk',
        timeline: 'Immediate',
        urgency: 'critical',
        actionLabel: 'Schedule Call',
      },
    ];
  }

  const r = loan.riskScore;
  if (r < 30) {
    return [
      {
        id: 'low-maintain',
        icon: '✓',
        title: 'Maintain Current Position',
        description: 'Strong covenant performance. Continue quarterly monitoring.',
        impact: 'Maintains 0% risk',
        timeline: 'Ongoing',
        urgency: 'low',
        actionLabel: 'View Details',
      },
      {
        id: 'low-esg',
        icon: '📈',
        title: 'ESG Improvement Opportunity',
        description: 'Improve ESG by 10 points to access better refinancing rates.',
        impact: 'Expected Savings: €50K-150K per year',
        timeline: '6-month program',
        urgency: 'info',
        actionLabel: 'View Details',
      },
      {
        id: 'low-repay',
        icon: '💰',
        title: 'Early Repayment Option',
        description: 'Consider early repayment at current rates.',
        impact: 'Saves interest costs',
        timeline: 'Decision by next quarter',
        urgency: 'teal',
        actionLabel: 'Schedule Call',
      },
    ];
  }

  if (r >= 30 && r < 60) {
    return [
      {
        id: 'med-monitor',
        icon: '⚠️',
        title: 'Monitor Closely',
        description: 'Covenant ratio approaching threshold. Monthly reviews recommended.',
        impact: 'Early detection of issues',
        timeline: 'Monthly checks',
        urgency: 'medium',
        actionLabel: 'View Details',
      },
      {
        id: 'med-contact',
        icon: '📞',
        title: 'Borrower Communication',
        description: 'Schedule quarterly covenant review with borrower.',
        impact: 'Build relationship, proactive management',
        timeline: 'Meeting due by Feb 1',
        urgency: 'medium',
        actionLabel: 'Schedule Call',
      },
      {
        id: 'med-refi',
        icon: '💡',
        title: 'Refinancing Window',
        description: 'Current rates favorable. Consider refinancing to improve terms.',
        impact: 'Better covenant flexibility',
        timeline: 'Rate lock expires Feb 28',
        urgency: 'medium',
        actionLabel: 'View Details',
      },
    ];
  }

  if (r >= 60 && r < 80) {
    return [
      {
        id: 'high-review',
        icon: '🚨',
        title: 'Immediate Review Required',
        description: 'Schedule urgent review with borrower regarding covenant breach risk.',
        impact: 'Prevent breach, discuss remediation',
        timeline: 'Within 7 days',
        urgency: 'high',
        actionLabel: 'Schedule Call',
      },
      {
        id: 'high-restructure',
        icon: '💼',
        title: 'Restructuring Options',
        description: 'Explore covenant restructuring or covenant amendment.',
        impact: 'Reduce breach probability by 40-60%',
        timeline: 'Negotiate within 2 weeks',
        urgency: 'high',
        actionLabel: 'View Details',
      },
      {
        id: 'high-stress',
        icon: '📊',
        title: 'Stress Test Analysis',
        description: 'Run stress scenarios to identify breaking points and cushion.',
        impact: 'Clear visibility into risk boundaries',
        timeline: 'Analysis within 3 days',
        urgency: 'medium',
        actionLabel: 'View Details',
      },
    ];
  }

  // r >= 80
  return [
    {
      id: 'crit-imminent',
      icon: '🚨',
      title: 'CRITICAL: Breach Imminent',
      description: 'Covenant breach likely within 30 days. Immediate action required.',
      impact: 'Prevent covenant breach',
      timeline: 'Action required TODAY',
      urgency: 'critical',
      actionLabel: 'Schedule Call',
    },
    {
      id: 'crit-struct',
      icon: '⚡',
      title: 'Emergency Restructuring',
      description: 'Initiate emergency covenant amendment or forbearance agreement.',
      impact: 'Buy time for operational improvements',
      timeline: 'Finalize within 48 hours',
      urgency: 'critical',
      actionLabel: 'View Details',
    },
    {
      id: 'crit-workout',
      icon: '🤝',
      title: 'Collaborative Problem-Solving',
      description: 'Activate workout team. Work with borrower on rapid remediation plan.',
      impact: 'Turn around within 60 days',
      timeline: 'Team meeting today',
      urgency: 'critical',
      actionLabel: 'Schedule Call',
    },
  ];
}

// Robust generator compatible with any loan shape
export function generateRecommendationsForLoan(loanData: {
  id: string;
  name?: string;
  riskScore?: number;
  sector?: string;
  covenantType?: string;
  esgScore?: number;
  daysUntilBreach?: number | null;
  loanAmount?: number;
}) {
  try {
    const loan = loanData || ({} as any);
    const riskScore = typeof loan.riskScore === 'number' ? loan.riskScore : 0;
    const recommendations: Recommendation[] = [];

    if (riskScore <= 35) {
      recommendations.push({
        id: loan.id + '-low-1',
        icon: '✓',
        title: 'Maintain Current Position',
        description: `Strong covenant performance on ${loan.name || loan.id}. Continue quarterly monitoring.`,
        impact: 'Maintains 0% breach risk',
        timeline: 'Ongoing',
        urgency: 'low',
        actionLabel: 'View Details',
      });
      recommendations.push({
        id: loan.id + '-low-2',
        icon: '📈',
        title: 'ESG Improvement Opportunity',
        description: `Current ESG: ${loan.esgScore ?? 'N/A'}/100. Improve by 10 points to access better refinancing rates.`,
        impact: '€50K-150K savings per year',
        timeline: '6-month program',
        urgency: 'info',
        actionLabel: 'Start Program',
      });
      recommendations.push({
        id: loan.id + '-low-3',
        icon: '💰',
        title: 'Early Repayment Option',
        description: `Consider early repayment at current rates. Rate lock expires Jan 31.`,
        impact: 'Saves interest costs',
        timeline: 'Decision by Jan 25',
        urgency: 'teal',
        actionLabel: 'Calculate Savings',
      });
    } else if (riskScore <= 65) {
      recommendations.push({
        id: loan.id + '-med-1',
        icon: '⚠️',
        title: 'Monitor Closely',
        description: `Covenant ratio approaching threshold on ${loan.name || loan.id}. Monthly reviews recommended to prevent escalation.`,
        impact: 'Early warning system',
        timeline: 'Monthly checks required',
        urgency: 'medium',
        actionLabel: 'Schedule Review',
      });
      recommendations.push({
        id: loan.id + '-med-2',
        icon: '📞',
        title: 'Borrower Communication',
        description: `Schedule immediate covenant review meeting. Discuss current covenant performance and early warning signals.`,
        impact: 'Strengthen relationship & proactive management',
        timeline: `Schedule by ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}`,
        urgency: 'medium',
        actionLabel: 'Schedule Meeting',
      });
      recommendations.push({
        id: loan.id + '-med-3',
        icon: '💡',
        title: 'Covenant Flexibility Options',
        description: `Explore covenant amendment options. ESG score (${loan.esgScore ?? 'N/A'}/100) supports flexibility negotiation.`,
        impact: 'Reduce breach probability by 25%',
        timeline: 'Discuss options by Jan 22',
        urgency: 'medium',
        actionLabel: 'Explore Options',
      });
    } else if (riskScore <= 85) {
      recommendations.push({
        id: loan.id + '-high-1',
        icon: '🚨',
        title: 'Immediate Review Required',
        description: `HIGH RISK on ${loan.name || loan.id}. Schedule urgent review with borrower regarding covenant breach risk.`,
        impact: 'Prevent breach, discuss remediation',
        timeline: '⚠️ Within 7 days',
        urgency: 'high',
        actionLabel: 'Schedule Urgent Call',
      });
      recommendations.push({
        id: loan.id + '-high-2',
        icon: '💼',
        title: 'Restructuring Options',
        description: `Explore covenant restructuring or amendment. Consider forbearance agreement if needed.`,
        impact: 'Reduce breach probability by 40-60%',
        timeline: '⚠️ Negotiate within 2 weeks',
        urgency: 'high',
        actionLabel: 'Review Options',
      });
      recommendations.push({
        id: loan.id + '-high-3',
        icon: '📊',
        title: 'Stress Test Analysis',
        description: `Run stress scenarios to identify breaking points. Understand cash flow cushion.`,
        impact: 'Clear visibility into risk boundaries',
        timeline: 'Analysis within 3 days',
        urgency: 'medium',
        actionLabel: 'Run Analysis',
      });
    } else {
      recommendations.push({
        id: loan.id + '-crit-1',
        icon: '🚨',
        title: 'CRITICAL: Breach Imminent',
        description: `CRITICAL RISK on ${loan.name || loan.id}. Covenant breach likely within ${loan.daysUntilBreach ?? 30} days. Immediate action required.`,
        impact: 'Prevent covenant breach TODAY',
        timeline: '🚨 ACTION REQUIRED TODAY',
        urgency: 'critical',
        actionLabel: 'Emergency Call',
      });
      recommendations.push({
        id: loan.id + '-crit-2',
        icon: '⚡',
        title: 'Emergency Restructuring',
        description: `Initiate emergency covenant amendment or forbearance agreement. Buy time for operational improvements.`,
        impact: 'Turn around within 60 days',
        timeline: '🚨 Finalize within 48 hours',
        urgency: 'critical',
        actionLabel: 'Emergency Action',
      });
      recommendations.push({
        id: loan.id + '-crit-3',
        icon: '🤝',
        title: 'Collaborative Problem-Solving',
        description: `Activate workout team. Work with borrower on rapid remediation plan.`,
        impact: 'Stabilize situation',
        timeline: '🚨 Team meeting today',
        urgency: 'critical',
        actionLabel: 'Activate Workout',
      });
    }

    return recommendations.slice(0, 3);
  } catch (error) {
    logger.error('Error generating recommendations:', error);
    return [
      {
        id: (loanData && loanData.id ? loanData.id + '-fallback' : 'fallback'),
        icon: '📋',
        title: 'Standard Review',
        description: 'Continue regular loan monitoring and covenant tracking.',
        impact: 'Maintain compliance',
        timeline: 'Ongoing',
        urgency: 'low',
        actionLabel: 'View Details',
      },
    ];
  }
}

const RecommendationCard: React.FC<{
  rec: Recommendation;
  loan: Loan;
}> = ({ rec, loan }) => {
  const [expanded, setExpanded] = useState(false);

  const color = COLOR_MAP[rec.urgency] || '#10B981';

  const handleExport = () => {
    // simple PDF export for single recommendation
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.setTextColor(10, 10, 10);
      doc.text(rec.title, 14, 20);
      doc.setFontSize(11);
      doc.text(`Loan: ${loan.name || loan.id}`, 14, 30);
      doc.text(`Description: ${rec.description}`, 14, 40);
      doc.text(`Impact: ${rec.impact}`, 14, 50);
      doc.text(`Timeline: ${rec.timeline}`, 14, 60);
      doc.save(`${loan.id}_${rec.id}.pdf`);
    } catch (err) {
      logger.error('Export failed', err);
    }
  };

  return (
    <div className="border rounded-lg p-4 mb-4 shadow-sm bg-white">
      <div className="flex items-start">
        <div className="mr-3" style={{ fontSize: 20 }}>
          <span style={{ backgroundColor: color, color: '#fff', padding: 8, borderRadius: 8 }}>{rec.icon}</span>
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-semibold text-lg">{rec.title}</div>
            </div>
            <div className="text-sm text-gray-500">Timeline: {rec.timeline}</div>
          </div>
          <div className="text-sm text-gray-700 mt-2">
            {expanded ? rec.description : rec.description.length > 120 ? `${rec.description.slice(0, 120)}...` : rec.description}
          </div>

          <div className="mt-3 text-sm text-gray-600">Impact: {rec.impact}</div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setExpanded((s) => !s)}
              className="px-3 py-1 rounded bg-gray-100 text-sm"
            >
              {expanded ? 'Hide Details' : rec.actionLabel || 'View Details'}
            </button>
            <button
              onClick={() => alert('Schedule Call — integrate calendar/modal in parent')}
              className="px-3 py-1 rounded bg-blue-50 text-sm"
            >
              Schedule Call
            </button>
            <button
              onClick={handleExport}
              className="px-3 py-1 rounded bg-gray-50 text-sm border"
            >
              Export Rec
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const RecommendationsPanel: React.FC<{ loan: Loan }> = ({ loan }) => {
  const recs = generateRecommendations(loan).slice(0, 4);

  return (
    <aside className="w-full md:w-80 lg:w-96 p-4">
      <h3 className="text-xl font-bold mb-3">Recommendations</h3>
      <div>
        {recs.map((r) => (
          <RecommendationCard key={r.id} rec={r} loan={loan} />
        ))}
      </div>
    </aside>
  );
};

export default RecommendationsPanel;
