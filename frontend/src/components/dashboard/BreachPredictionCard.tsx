/**
 * Breach Prediction Card Component
 * Shows ML-powered breach probability prediction with confidence intervals
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { GreenLoan } from '@/types/greenLoan';
import { predictBreachProbability, BreachPrediction } from '@/lib/mlBreachPredictor';
import { useEffect, useState } from 'react';
import { logger } from '@/lib/logger';
import { AlertTriangle, TrendingUp, TrendingDown, Minus, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreachPredictionCardProps {
  loan: GreenLoan;
  ebitdaDropPercent: number;
  interestRateHikeBps: number;
}

const BreachPredictionCard = ({ loan, ebitdaDropPercent, interestRateHikeBps }: BreachPredictionCardProps) => {
  const [prediction, setPrediction] = useState<BreachPrediction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPrediction = async () => {
      setLoading(true);
      try {
        const pred = await predictBreachProbability(loan, ebitdaDropPercent, interestRateHikeBps);
        setPrediction(pred);
      } catch (error) {
        logger.error('Error predicting breach:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPrediction();
  }, [loan, ebitdaDropPercent, interestRateHikeBps]);

  if (loading || !prediction) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Calculating breach prediction...</p>
        </CardContent>
      </Card>
    );
  }

  const getProbabilityColor = (prob: number) => {
    if (prob >= 70) return 'text-red-600 dark:text-red-400';
    if (prob >= 50) return 'text-orange-600 dark:text-orange-400';
    if (prob >= 30) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getProbabilityBg = (prob: number) => {
    if (prob >= 70) return 'bg-red-50 dark:bg-red-950/20';
    if (prob >= 50) return 'bg-orange-50 dark:bg-orange-950/20';
    if (prob >= 30) return 'bg-yellow-50 dark:bg-yellow-950/20';
    return 'bg-green-50 dark:bg-green-950/20';
  };

  const getTrendIcon = () => {
    switch (prediction.trend) {
      case 'increasing':
        return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'decreasing':
        return <TrendingDown className="w-4 h-4 text-green-500" />;
      default:
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <Card className={cn('border-border/50', getProbabilityBg(prediction.probability))}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Breach Probability Score</CardTitle>
          <Badge variant="outline" className={cn('font-mono', getProbabilityColor(prediction.probability))}>
            {prediction.probability}% ±{prediction.confidence}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Probability Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Breach Risk</span>
            <span className={cn('font-semibold', getProbabilityColor(prediction.probability))}>
              {prediction.probability}% probability
            </span>
          </div>
          <Progress value={prediction.probability} className="h-2" />
        </div>

        {/* Prediction Timeline */}
        {prediction.predictedDays < Infinity && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            {getTrendIcon()}
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Predicted breach timeline</p>
              <p className="text-sm font-medium">
                {prediction.predictedDays} days at {100 - prediction.confidence}% confidence
              </p>
            </div>
          </div>
        )}

        {/* Contributing Factors */}
        {prediction.contributingFactors.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Primary Risk Factors:</p>
            <div className="space-y-1">
              {prediction.contributingFactors.map((factor, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs p-1.5 rounded bg-background/50">
                  <span>{factor.factor}</span>
                  <span className="text-red-600 dark:text-red-400 font-medium">
                    +{factor.impact.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {prediction.recommendations.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              <p className="text-xs font-semibold">Recommended Actions:</p>
            </div>
            <ul className="space-y-1">
              {prediction.recommendations.map((rec, idx) => (
                <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BreachPredictionCard;

