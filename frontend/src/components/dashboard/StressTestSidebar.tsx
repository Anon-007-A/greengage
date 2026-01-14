/**
 * Stress Test Sidebar Component
 * Interactive sliders for EBITDA and Interest Rate stress testing
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { useGreenGaugeStore } from '@/store/useGreenGaugeStore';
import { TrendingDown, TrendingUp } from 'lucide-react';

const StressTestSidebar = () => {
  const { ebitdaDropPercent, interestRateHikeBps, setStressTestParams } = useGreenGaugeStore();

  return (
    <Card className="sticky top-20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-primary" />
          Stress Test
        </CardTitle>
        <CardDescription>
          Adjust parameters to simulate covenant breaches
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* EBITDA Margin Sensitivity */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="ebitda-drop">EBITDA Margin Sensitivity</Label>
            <div className="flex items-center gap-2">
              <Input
                id="ebitda-drop"
                type="number"
                min="0"
                max="100"
                value={ebitdaDropPercent}
                onChange={(e) => setStressTestParams(Number(e.target.value), interestRateHikeBps)}
                className="w-20 h-8"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
          <Slider
            value={[ebitdaDropPercent]}
            onValueChange={([value]) => setStressTestParams(value, interestRateHikeBps)}
            min={0}
            max={100}
            step={1}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Simulate a {ebitdaDropPercent}% reduction in EBITDA
          </p>
        </div>

        {/* Interest Rate Change */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="rate-hike">Interest Rate Change</Label>
            <div className="flex items-center gap-2">
              <Input
                id="rate-hike"
                type="number"
                min="0"
                max="500"
                value={interestRateHikeBps}
                onChange={(e) => setStressTestParams(ebitdaDropPercent, Number(e.target.value))}
                className="w-20 h-8"
              />
              <span className="text-sm text-muted-foreground">bps</span>
            </div>
          </div>
          <Slider
            value={[interestRateHikeBps]}
            onValueChange={([value]) => setStressTestParams(ebitdaDropPercent, value)}
            min={0}
            max={500}
            step={10}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            {interestRateHikeBps} basis points ({interestRateHikeBps / 100}%) increase
          </p>
        </div>

        {/* Info Box */}
        <div className="p-3 bg-muted rounded-lg text-xs text-muted-foreground">
          <p className="font-semibold mb-1">How it works:</p>
          <p>
            As you adjust these parameters, covenant status badges will update in real-time.
            Red = Breach, Amber = At Risk, Green = Safe
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default StressTestSidebar;

