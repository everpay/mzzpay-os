import { ReactNode } from "react";
import { Info, AlertTriangle, ShieldCheck, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "info" | "warning" | "success" | "tip";

const styles: Record<Variant, { icon: typeof Info; classes: string; iconClass: string }> = {
  info: {
    icon: Info,
    classes: "border-[hsl(172_72%_48%_/_0.35)] bg-[hsl(172_72%_48%_/_0.06)]",
    iconClass: "text-[hsl(172_72%_38%)]",
  },
  warning: {
    icon: AlertTriangle,
    classes: "border-amber-500/40 bg-amber-500/5",
    iconClass: "text-amber-600 dark:text-amber-400",
  },
  success: {
    icon: ShieldCheck,
    classes: "border-emerald-500/40 bg-emerald-500/5",
    iconClass: "text-emerald-600 dark:text-emerald-400",
  },
  tip: {
    icon: Lightbulb,
    classes: "border-violet-500/40 bg-violet-500/5",
    iconClass: "text-violet-600 dark:text-violet-400",
  },
};

interface Props {
  variant?: Variant;
  title?: string;
  children: ReactNode;
  className?: string;
}

export const Callout = ({ variant = "info", title, children, className }: Props) => {
  const { icon: Icon, classes, iconClass } = styles[variant];
  return (
    <div className={cn("flex gap-3 rounded-xl border p-4", classes, className)}>
      <Icon className={cn("w-5 h-5 mt-0.5 shrink-0", iconClass)} />
      <div className="space-y-1.5 text-sm">
        {title && <p className="font-semibold text-foreground leading-tight">{title}</p>}
        <div className="text-muted-foreground leading-relaxed [&_code]:text-[12px] [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:border [&_code]:border-border">
          {children}
        </div>
      </div>
    </div>
  );
};
