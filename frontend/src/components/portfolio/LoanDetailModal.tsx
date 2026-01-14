import React from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { GreenLoan } from '@/types/greenLoan';
import { Card, CardContent } from '@/components/ui/card';

interface Props {
  open: boolean;
  loan: GreenLoan | null;
  onClose: () => void;
}

const miniSparkline = (trend: number[] = []) => {
  if (!trend || trend.length === 0) return null;
  const max = Math.max(...trend);
  const min = Math.min(...trend);
  const w = 120; const h = 28;
  const points = trend.map((v, i) => {
    const x = (i / Math.max(1, trend.length - 1)) * w;
    const y = h - ((v - min) / Math.max(1e-6, max - min)) * h;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} className="inline-block align-middle">
      <polyline fill="none" stroke="#0ea5a4" strokeWidth={2} points={points} />
    </svg>
  );
};

const LoanDetailModal: React.FC<Props> = ({ open, loan, onClose }) => {
  if (!loan) return null;

  const primaryCovenant = (loan.covenants && loan.covenants[0]) || null;
  const currentRatio = primaryCovenant?.currentValue ?? primaryCovenant?.current ?? 0;
  const threshold = primaryCovenant?.threshold ?? 0;
  const monthlyDeclineRate = primaryCovenant?.trend && primaryCovenant.trend.length > 1
    ? (primaryCovenant.trend[primaryCovenant.trend.length - 1] - primaryCovenant.trend[0]) / Math.max(1, primaryCovenant.trend.length - 1)
    : 0.01;
  const daysToBreach = Math.round((threshold - currentRatio) / (monthlyDeclineRate * 30.44));

  const riskScore = loan.riskScore?.overall ?? 0;
  const status = loan.status || 'active';

  const recommendation = (() => {
    if (status === 'active') {
      if (riskScore < 30) return '✓ Loan performing well. Continue quarterly monitoring.';
      return `Monitor closely. ${Math.abs(Math.round(monthlyDeclineRate * 1000) / 10)}% declining monthly. Schedule call within 60 days to discuss outlook.`;
    }
    if (status === 'watchlist') {
      const metric = primaryCovenant?.name || 'Primary covenant';
      const currentValue = currentRatio;
      return `⚠ ATTENTION REQUIRED. ${metric} at ${currentValue}, threshold ${threshold}. Schedule borrower call within 30 days. Recommend: covenant waiver discussion, capital infusion, or hedging strategy.`;
    }
    if (status === 'default') {
      const days = daysToBreach <= 0 ? 'BREACHED' : `${daysToBreach} days`;
      return `🔴 URGENT ACTION. Covenant ${primaryCovenant?.name || ''} breached. Days to default: ${days}. Initiate covenant waiver negotiation immediately. Contact legal & workout team within 24 hours.`;
    }
    return '';
  })();

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{loan.companyName} <span className="text-sm text-muted-foreground">• {loan.sector}</span></AlertDialogTitle>
          <AlertDialogDescription>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="font-semibold">€{(loan.loanAmount / 1000000).toFixed(2)}M</p>
                <p className="text-sm text-muted-foreground mt-2">Covenant: {primaryCovenant?.name || 'N/A'}</p>
                <p className="text-sm mt-1">Current Ratio: <strong>{currentRatio}</strong> (threshold {threshold})</p>
                <p className="text-sm mt-1">Risk Score: <strong>{riskScore}</strong></p>
                <p className="text-sm mt-1">Days to Breach: <strong>{daysToBreach <= 0 ? 'BREACHED' : `${daysToBreach} days`}</strong></p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Covenant Metrics</p>
                <div className="mt-2">
                  {loan.covenants?.slice(0,3).map((c: any) => (
                    <div key={c.id || c.name} className="mb-2">
                      <p className="text-xs font-medium">{c.name || c.type}</p>
                      <p className="text-sm">Current: {c.currentValue ?? c.current} | Threshold: {c.threshold}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">3-month Risk Trend</p>
                  <div className="mt-2">{miniSparkline(primaryCovenant?.trend || [])}</div>
                </div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-muted/40 rounded">{recommendation}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Close</AlertDialogCancel>
          <AlertDialogAction onClick={onClose}>Acknowledge</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default LoanDetailModal;
