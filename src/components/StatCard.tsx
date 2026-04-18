import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  subtitle?: string;
}

export function StatCard({ title, value, change, changeType = 'neutral', icon: Icon, subtitle }: StatCardProps) {
  return (
    <div className="group rounded-2xl border border-border bg-card p-6 shadow-card hover:shadow-elevated hover:border-primary/30 transition-all duration-300 animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className="font-heading text-3xl font-extrabold tracking-tight text-foreground">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/15 group-hover:bg-primary/15 transition-colors">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
      {change && (
        <div className="mt-3 flex items-center gap-1">
          <span
            className={`text-xs font-medium ${
              changeType === 'positive'
                ? 'text-success'
                : changeType === 'negative'
                ? 'text-destructive'
                : 'text-muted-foreground'
            }`}
          >
            {change}
          </span>
          <span className="text-xs text-muted-foreground">vs last period</span>
        </div>
      )}
    </div>
  );
}
