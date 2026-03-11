import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface DisputeStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  variant?: 'default' | 'success' | 'warning' | 'destructive';
}

const variantStyles = {
  default: 'border-border',
  success: 'border-success/20',
  warning: 'border-warning/20',
  destructive: 'border-destructive/20',
};

const iconVariant = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
};

export function DisputeStatCard({ title, value, subtitle, icon: Icon, trend, variant = 'default' }: DisputeStatCardProps) {
  return (
    <div className={cn('rounded-lg border bg-card p-5 transition-shadow hover:shadow-md', variantStyles[variant])}>
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-card-foreground tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          {trend && (
            <div className="flex items-center gap-1 pt-1">
              <span className={cn(
                'text-xs font-semibold',
                trend.value >= 0 ? 'text-success' : 'text-destructive'
              )}>
                {trend.value >= 0 ? '+' : ''}{trend.value}%
              </span>
              <span className="text-xs text-muted-foreground">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={cn('p-2.5 rounded-lg', iconVariant[variant])}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}