/**
 * Synthetic Data Loader Component
 * Allows loading 1,000+ synthetic loans for enterprise scalability demonstration
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { Database, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

const SyntheticDataLoader = () => {
  const { loans, loadLoans, appendLoans, resetToBaseline } = usePortfolio() as any;
  const [count, setCount] = useState(1000);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleLoadSynthetic = async () => {
    if (count < 1 || count > 10000) {
      toast({
        title: 'Invalid Count',
        description: 'Please enter a number between 1 and 10,000',
        variant: 'destructive'
      });
      return;
    }
    setLoading(true);
    try {
      // Use PortfolioContext to generate/load loans (keeps global single source of truth)
      await loadLoans(count, true);
      // Reset simulator to baseline is handled by loadLoans via context
      toast({
        title: 'Synthetic Data Loaded',
        description: `Loaded ${count} loans. Portfolio updated.`,
      });
    } catch (error) {
      logger.error('Error loading synthetic data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load synthetic data. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAppendSynthetic = async () => {
    if (count < 1 || count > 10000) {
      toast({
        title: 'Invalid Count',
        description: 'Please enter a number between 1 and 10,000',
        variant: 'destructive'
      });
      return;
    }
    setLoading(true);
    try {
      await appendLoans(count);
      toast({
        title: 'Synthetic Data Appended',
        description: `Appended ${count} loans to portfolio.`,
      });
    } catch (error) {
      logger.error('Error appending synthetic data:', error);
      toast({
        title: 'Error',
        description: 'Failed to append synthetic data. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetToMock = () => {
    // Reset to original sample data (would need to import mockLoans)
    toast({
      title: 'Reset to v1.0 Sample Data',
      description: 'Please refresh the page to load original sample data.',
    });
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Enterprise Scale Data Loader
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>Current:</strong> {loans.length || 150} loans
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="loan-count">Number of Loans to Generate</Label>
          <Input
            id="loan-count"
            type="number"
            min="1"
            max="10000"
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            placeholder="1000"
          />
          <p className="text-xs text-muted-foreground">
            Generate realistic synthetic loans for enterprise scalability demonstration (1-10,000)
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleLoadSynthetic}
            disabled={loading}
            className="flex-1 gap-2"
          >
            <Database className="w-4 h-4" />
            Load {count} Loans
          </Button>
          <Button
            onClick={handleAppendSynthetic}
            disabled={loading}
            variant="outline"
            className="flex-1 gap-2"
          >
            <Database className="w-4 h-4" />
            Append {count} Loans
          </Button>
        </div>

        <div className="pt-4 border-t space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Quick Actions:</p>
          <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCount(100)}
              >
                100
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCount(1000)}
              >
                1,000
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCount(5000)}
              >
                5,000
              </Button>
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span>Portfolio ready for enterprise-scale demonstration</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SyntheticDataLoader;

