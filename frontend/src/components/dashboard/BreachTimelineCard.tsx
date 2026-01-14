import React from 'react';
import { BreachTimelineData } from '../utils/breachTimelinePredictor';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Props {
  breach: BreachTimelineData;
}

/**
 * Component to display breach timeline prediction
 * Shows when a covenant will breach with urgency-based styling
 */
export const BreachTimelineCard: React.FC<Props> = ({ breach }) => {
  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'IMMEDIATE':
        return 'bg-red-100 border-red-300 border-l-4';
      case 'HIGH':
        return 'bg-orange-100 border-orange-300 border-l-4';
      case 'MODERATE':
        return 'bg-yellow-100 border-yellow-300 border-l-4';
      default:
        return 'bg-green-100 border-green-300 border-l-4';
    }
  };

  const getUrgencyTextColor = (urgency: string) => {
    switch (urgency) {
      case 'IMMEDIATE':
        return 'text-red-900';
      case 'HIGH':
        return 'text-orange-900';
      case 'MODERATE':
        return 'text-yellow-900';
      default:
        return 'text-green-900';
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'IMMEDIATE':
        return { variant: 'destructive' as const, label: '🚨 IMMEDIATE' };
      case 'HIGH':
        return { variant: 'destructive' as const, label: '⚠️ HIGH' };
      case 'MODERATE':
        return { variant: 'default' as const, label: '⚡ MODERATE' };
      default:
        return { variant: 'outline' as const, label: '✓ LOW' };
    }
  };

  const badge = getUrgencyBadge(breach.actionUrgency);

  return (
    <Card className={`p-4 rounded-lg ${getUrgencyColor(breach.actionUrgency)} ${getUrgencyTextColor(breach.actionUrgency)}`}>
      {/* Header with company, covenant, and urgency */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-bold text-lg mb-1">
            {breach.company} — {breach.covenant}
          </h4>
          <Badge variant={badge.variant} className="text-xs">
            {badge.label}
          </Badge>
        </div>
      </div>

      {/* Current metrics */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-sm bg-white bg-opacity-40 p-2 rounded">
        <div>
          <span className="font-semibold">Current:</span> {breach.currentValue.toFixed(2)}x
        </div>
        <div>
          <span className="font-semibold">Threshold:</span> {breach.threshold.toFixed(2)}x
        </div>
        <div>
          <span className="font-semibold">Cushion:</span> {breach.cushionPercent.toFixed(1)}%
        </div>
        <div>
          <span className="font-semibold">Scenario:</span> {breach.ebitdaDrop}% EBITDA, {breach.rateHike}bps
        </div>
      </div>

      {/* Breach timeline - LARGE AND PROMINENT */}
      <div className="mb-3 bg-white bg-opacity-60 p-3 rounded border-l-4 border-current">
        <div className="text-sm text-gray-700 mb-1">
          <strong>⏰ Weeks to Breach</strong>
        </div>
        <div className="text-2xl font-bold">
          {breach.estimatedWeeksToBreachQuarterly}
          <span className="text-sm font-normal ml-1">weeks</span>
        </div>
        <div className="text-xs text-gray-600 mt-1">
          (Annualized: {breach.estimatedWeeksToBreachAnnualized} weeks)
        </div>
      </div>

      {/* Recommendation box */}
      <div className="mb-3 bg-white bg-opacity-50 p-3 rounded text-sm">
        <p className="font-semibold mb-1">📋 Recommended Actions:</p>
        <p className="whitespace-pre-wrap text-xs leading-relaxed">
          {breach.recommendation}
        </p>
      </div>

      {/* Historical context */}
      <div className="bg-white bg-opacity-40 p-2 rounded text-xs italic border-l-2 border-gray-400">
        <p>
          <strong>📊 Historical Context:</strong> {breach.historicalContext}
        </p>
      </div>
    </Card>
  );
};

/**
 * Container component for showing multiple breach timeline predictions
 */
interface BreachTimelineContainerProps {
  breachTimelines: BreachTimelineData[];
  maxVisible?: number;
  title?: string;
}

export const BreachTimelineContainer: React.FC<BreachTimelineContainerProps> = ({
  breachTimelines,
  maxVisible = 3,
  title = '⏰ Breach Timeline Predictions',
}) => {
  if (!breachTimelines || breachTimelines.length === 0) {
    return (
      <Card className="p-4 bg-green-50 border-green-200">
        <p className="text-green-800 text-sm">
          ✓ No urgent covenant breaches predicted in this scenario.
        </p>
      </Card>
    );
  }

  // Filter to show only urgent ones (not 'LOW')
  const urgentBreaches = breachTimelines
    .filter((b) => b.actionUrgency !== 'LOW')
    .slice(0, maxVisible);

  if (urgentBreaches.length === 0) {
    return (
      <Card className="p-4 bg-green-50 border-green-200">
        <p className="text-green-800 text-sm">
          ✓ All covenant breaches are classified as low-risk in this scenario.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-foreground">{title}</h3>
        <Badge variant="outline" className="text-xs">
          {urgentBreaches.length} urgent {urgentBreaches.length === 1 ? 'breach' : 'breaches'}
        </Badge>
      </div>

      <div className="space-y-3">
        {urgentBreaches.map((breach) => (
          <BreachTimelineCard key={`${breach.loanId}-${breach.covenant}`} breach={breach} />
        ))}
      </div>

      {breachTimelines.filter((b) => b.actionUrgency !== 'LOW').length > maxVisible && (
        <p className="text-xs text-gray-600 text-center mt-4">
          Showing {maxVisible} of {breachTimelines.filter((b) => b.actionUrgency !== 'LOW').length} urgent breaches
        </p>
      )}
    </div>
  );
};
