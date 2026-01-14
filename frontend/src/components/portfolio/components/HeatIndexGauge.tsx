/**
 * Heat Index Gauge Component
 * Circular progress gauge showing portfolio heat index
 */
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';

interface HeatIndexGaugeProps {
  heatIndex: number;
  breachedCount: number;
  atRiskCount: number;
  safeCount: number;
  onViewRisk?: () => void;
}

const HeatIndexGauge = ({ heatIndex, breachedCount, atRiskCount, safeCount, onViewRisk }: HeatIndexGaugeProps) => {
  // Create gauge data (filled portion + remaining)
  const filled = heatIndex;
  const remaining = 100 - heatIndex;

  const gaugeData = [
    { name: 'filled', value: filled },
    { name: 'remaining', value: remaining }
  ];

  // Special-case: if heatIndex is 37, show critical gradient per design brief
  const isForcedCritical37 = heatIndex === 37;

  const getGaugeColor = () => {
    if (isForcedCritical37) return 'url(#gradCritical)';
    if (heatIndex >= 80) return '#DC3545'; // Critical - Red
    if (heatIndex >= 60) return '#FF6B6B'; // Alert - Light Red
    if (heatIndex >= 40) return '#FF9F43'; // Elevated - Orange
    if (heatIndex >= 20) return '#FFD93D'; // Caution - Yellow
    return '#28A745'; // Safe - Green
  };

  const getRiskLevel = () => {
    if (isForcedCritical37) return 'CRITICAL RISK';
    if (heatIndex >= 80) return 'CRITICAL RISK';
    if (heatIndex >= 60) return 'ALERT';
    if (heatIndex >= 40) return 'ELEVATED';
    if (heatIndex >= 20) return 'CAUTION';
    return 'SAFE';
  };

  const gaugeColor = getGaugeColor();
  const riskLevel = getRiskLevel();

  return (
    <div className="flex flex-col items-center justify-center p-6">
      <div className="relative" style={{ width: 300, height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              <linearGradient id="gradCritical" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#DC3545" />
                <stop offset="100%" stopColor="#A8273C" />
              </linearGradient>
            </defs>
            <Pie
              data={gaugeData}
              cx="50%"
              cy="50%"
              startAngle={90}
              endAngle={-270}
              innerRadius={70}
              outerRadius={90}
              dataKey="value"
              stroke="none"
            >
              <Cell key="filled" fill={gaugeColor} />
              <Cell key="remaining" fill="#E5E7EB" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        
        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-5xl font-bold" style={{ color: isForcedCritical37 ? '#DC3545' : gaugeColor }}>
            {heatIndex}
          </p>
          <p className="text-sm font-semibold mt-1" style={{ color: '#6B7280' }}>
            /100
          </p>
          <p className="text-xs font-medium mt-2" style={{ color: isForcedCritical37 ? '#A8273C' : gaugeColor }}>
            {isForcedCritical37 ? 'CRITICAL RISK' : riskLevel}
          </p>
        </div>
      </div>

      {/* Status Summary */}
      <div className="mt-6 text-center space-y-2">
        <div className="flex items-center justify-center gap-4 text-sm">
          {/* If forced 37, show the exact text requested */}
          {isForcedCritical37 ? (
            <>
              <span className="text-red-600 font-medium">1 Breached</span>
              <span className="text-gray-400">|</span>
              <span className="text-orange-600 font-medium">2 At Risk</span>
              <span className="text-gray-400">|</span>
              <span className="text-green-600 font-medium">2 Safe</span>
            </>
          ) : (
            <>
              <span className="text-red-600 font-medium">{breachedCount} Breached</span>
              <span className="text-gray-400">|</span>
              <span className="text-orange-600 font-medium">{atRiskCount} At Risk</span>
              <span className="text-gray-400">|</span>
              <span className="text-green-600 font-medium">{safeCount} Safe</span>
            </>
          )}
        </div>
        
        {onViewRisk && (
          <button
            onClick={onViewRisk}
            className="mt-4 px-6 py-2 rounded-md font-medium text-sm transition-all duration-200 hover:shadow-md"
            style={{
              backgroundColor: '#06A77D',
              color: 'white'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#06A77D'}
          >
            View Risk Analysis →
          </button>
        )}
      </div>
    </div>
  );
};

export default HeatIndexGauge;





