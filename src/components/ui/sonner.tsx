import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Global Toaster — anchored above center, horizontally centered.
 *
 * Sonner only ships top/bottom anchors. We anchor to `top-center` and add an
 * override that pushes toasts to ~28% from the top of the viewport (above
 * the geometric center, where the eye naturally lands). Description text
 * is rendered as `whitespace-pre-line` so the `[code: …]` line from
 * `src/lib/error-toast.ts` lands on its own line.
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
          // Force the Sonner viewport to be horizontally centered.
          // Sonner's default `top-center` still anchors width to the right
          // edge on some viewports — these CSS vars + offset pin it to the
          // true horizontal center, ~28% from the top.
          top: "28%",
          left: "50%",
          right: "auto",
          transform: "translateX(-50%)",
          width: "min(420px, calc(100vw - 2rem))",
        } as React.CSSProperties
      }
      offset={0}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-2xl group-[.toaster]:rounded-xl group-[.toaster]:max-w-md",
          description: "group-[.toast]:text-muted-foreground whitespace-pre-line font-mono text-xs",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success: "group-[.toaster]:!bg-success/10 group-[.toaster]:!border-success/30 group-[.toaster]:!text-success",
          error: "group-[.toaster]:!bg-destructive/10 group-[.toaster]:!border-destructive/30 group-[.toaster]:!text-destructive",
          info: "group-[.toaster]:!bg-primary/10 group-[.toaster]:!border-primary/30 group-[.toaster]:!text-primary",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
