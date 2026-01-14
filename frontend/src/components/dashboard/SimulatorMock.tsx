import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { usePortfolio } from '@/contexts/PortfolioContext';

const SimulatorMock: React.FC = () => {
  const { runSimulation, resetSimulation, simulation } = usePortfolio();
  const [ebitda, setEbitda] = useState(0);
  const [rate, setRate] = useState(0);

  return (
    <div className="p-4 border rounded bg-white dark:bg-gray-900">
      <h3 className="font-semibold mb-2">Covenant Breach Simulator v1.0</h3>
      <div className="mb-3">
        <label className="text-sm text-gray-600">EBITDA drop (%)</label>
        <div className="flex items-center gap-4">
          <input type="range" min={0} max={100} value={ebitda} onChange={(e) => setEbitda(Number(e.target.value))} />
          <div className="w-12 text-right">{ebitda}%</div>
        </div>
      </div>
      <div className="mb-3">
        <label className="text-sm text-gray-600">Interest rate hike (bps)</label>
        <div className="flex items-center gap-4">
          <input type="range" min={0} max={500} value={rate} onChange={(e) => setRate(Number(e.target.value))} />
          <div className="w-16 text-right">{rate}bps</div>
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => runSimulation(ebitda, rate)} className="bg-teal-600 hover:bg-teal-700">Apply Scenario</Button>
        <Button variant="outline" onClick={() => resetSimulation()}>Reset to Baseline</Button>
      </div>

      {simulation && simulation.stressedResults && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded">
          <p className="text-sm">Stressed Results:</p>
          <p className="font-semibold">Breached: {simulation.stressedResults.breachedCount}</p>
          <p className="font-semibold">At Risk: {simulation.stressedResults.atRiskCount}</p>
        </div>
      )}
    </div>
  );
};

export default SimulatorMock;
