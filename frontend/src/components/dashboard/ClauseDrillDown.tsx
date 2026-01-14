/**
 * Clause Deep-Dive Panel
 * Shows detailed clause information, AI reasoning, and confidence score
 */
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useGreenGaugeStore } from '@/store/useGreenGaugeStore';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { getMockClauseText, getMockAIReasoning } from '@/lib/mock_backend';
import { X, FileText, Brain, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ClauseDrillDown = () => {
  const { selectedCovenant, setSelectedCovenant } = useGreenGaugeStore();
  const { loans, simulation } = usePortfolio();

  if (!selectedCovenant) return null;

  const loan = loans.find(l => l.id === selectedCovenant.loanId);
  const covenant = loan?.covenants.find(c => c.id === selectedCovenant.covenantId);

  if (!loan || !covenant) return null;

  const clauseText = getMockClauseText(covenant.name);
  const aiReasoning = getMockAIReasoning(covenant);
  const confidenceScore = 0.87; // Mock confidence score

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'breach': return 'destructive';
      case 'warning': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <Sheet open={true} onOpenChange={(open) => !open && setSelectedCovenant(null, null)}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-2xl">{covenant.name}</SheetTitle>
              <SheetDescription className="mt-2">
                {loan.companyName} • Clause {covenant.clause_id || 'N/A'}
              </SheetDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedCovenant(null, null)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Current Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Current Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current Value</span>
                <span className="font-semibold">
                  {covenant.currentValue?.toFixed(2) || 'N/A'}{covenant.unit}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Threshold</span>
                <span className="font-semibold">
                  {covenant.threshold_value.toFixed(2)}{covenant.unit}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={getStatusColor(covenant.status)}>
                  {covenant.status.toUpperCase()}
                </Badge>
              </div>
              {covenant.cushionPercent !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Cushion</span>
                  <span className={`font-semibold ${
                    covenant.cushionPercent < 0 ? 'text-destructive' :
                    covenant.cushionPercent < 5 ? 'text-warning' :
                    'text-success'
                  }`}>
                    {covenant.cushionPercent > 0 ? '+' : ''}{covenant.cushionPercent.toFixed(1)}%
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* LMA Clause Text */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                LMA Clause Text
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg font-mono">
                  {clauseText}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* AI Reasoning */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="w-5 h-5" />
                AI Reasoning
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <p className="whitespace-pre-wrap text-sm">{aiReasoning}</p>
              </div>
            </CardContent>
          </Card>

          {/* Confidence Score */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Confidence Score</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Extraction Confidence</span>
                <span className="font-semibold">{(confidenceScore * 100).toFixed(0)}%</span>
              </div>
              <Progress value={confidenceScore * 100} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Based on document clarity, clause specificity, and AI model confidence
              </p>
            </CardContent>
          </Card>

          {/* Trend Analysis */}
          {covenant.trend && covenant.trend.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  {covenant.trend[covenant.trend.length - 1] > covenant.trend[0] ? (
                    <TrendingUp className="w-5 h-5 text-warning" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-success" />
                  )}
                  Trend Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  {covenant.trend.map((value, index) => (
                    <div key={index} className="flex-1 text-center">
                      <div className="text-xs text-muted-foreground mb-1">Q{index + 1}</div>
                      <div className="font-semibold">{value.toFixed(2)}{covenant.unit}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ClauseDrillDown;

