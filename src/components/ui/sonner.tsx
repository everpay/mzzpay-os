import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Global Toaster — anchored above center, horizontally centered.
 *
 * - Title uses `text-sm` / `leading-snug` and description uses `text-xs` /
 *   `leading-relaxed` to match the rest of the dark fintech UI (cards,
 *   drawers, tables all use this same scale).
 * - Per-type auto-dismiss timeouts via the global `duration` callback:
 *   errors stay longer (8s) so merchants can copy the `[code: …]` line,
 *   success toasts dismiss quickly (2.5s), info/default at 4s.
 *   `notifyError` / `notifySuccess` callers can still override per-call.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      position="top-center"
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          top: "28%",
          left: "50%",
          right: "auto",
          transform: "translateX(-50%)",
          width: "min(420px, calc(100vw - 2rem))",
        } as React.CSSProperties
      }
      offset={0}
      duration={4000}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-2xl group-[.toaster]:rounded-md group-[.toaster]:max-w-md text-center [&>div]:w-full [&>div]:text-center",
          title: "w-full text-center text-sm font-semibold leading-snug tracking-tight",
          description:
            "group-[.toast]:text-muted-foreground whitespace-pre-line font-mono text-xs leading-relaxed w-full text-center",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success:
            "group-[.toaster]:!bg-success group-[.toaster]:!border-success group-[.toaster]:!text-success-foreground [&_[data-description]]:!text-success-foreground/90",
          error:
            "group-[.toaster]:!bg-destructive group-[.toaster]:!border-destructive group-[.toaster]:!text-destructive-foreground [&_[data-description]]:!text-destructive-foreground/90",
          info: "group-[.toaster]:!bg-primary group-[.toaster]:!border-primary group-[.toaster]:!text-primary-foreground [&_[data-description]]:!text-primary-foreground/90",
        },
      }}
      {...props}
    />
  );
};

/**
 * Per-type default durations (ms). Centralized so `notify*` helpers and
 * direct `toast.*` callers stay consistent.
 */
export const TOAST_DURATIONS = {
  success: 2500,
  info: 4000,
  default: 4000,
  warning: 6000,
  error: 8000,
} as const;

export { Toaster, toast };
