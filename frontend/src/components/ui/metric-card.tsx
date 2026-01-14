import * as React from 'react';
import { cn } from '@/lib/utils';

interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: React.ReactNode;
  delta?: React.ReactNode;
  hint?: string;
  children?: React.ReactNode; // small sparkline or icon
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, delta, hint, children, className, ...props }) => {
  return (
    <div className={cn('rounded-lg border bg-card text-card-foreground shadow-sm hover:-translate-y-1 hover:shadow-lg transition-transform duration-150 p-4', className)} {...props}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-muted-foreground">{title}</div>
          <div className="flex items-baseline gap-3">
            <div className="text-2xl md:text-3xl font-semibold tabular-nums">{value}</div>
            {delta ? <div className="text-sm text-muted-foreground">{delta}</div> : null}
          </div>
          {hint ? <div className="text-xs text-muted-foreground mt-1">{hint}</div> : null}
        </div>
        {children ? <div className="self-center">{children}</div> : null}
      </div>
    </div>
  );
};

export default MetricCard;
