import { cn } from "@/lib/utils";

interface BrandLogoProps {
  /** Tailwind class controlling the wordmark + icon color (e.g. text-foreground, text-white). */
  textClassName?: string;
  /** Optional extra wrapper classes. */
  className?: string;
  /** Tailwind size class for the icon (height). Defaults to h-26 (104px). */
  iconSizeClassName?: string;
  /** Font size for the wordmark in pixels. Defaults to 20px. */
  wordmarkSizePx?: number;
  /** Hide the wordmark and only render the icon. */
  iconOnly?: boolean;
  /** Alt text override (for screen readers). */
  alt?: string;
}

/**
 * MzzPay brand lockup — single source of truth.
 *
 * Spec (from product):
 *  - Icon: bold "M" glyph rendered in **Bagel Fat One** (Google Font), rotated 22°,
 *    10px margin all around, teal color. Icon height: h-26 (104px).
 *  - Wordmark: "mzzpay" in Coolvetica at 20px, sitting 2px next to the icon.
 */
export function BrandLogo({
  textClassName = "text-[hsl(172,72%,42%)]",
  className,
  iconSizeClassName = "h-26",
  wordmarkSizePx = 20,
  iconOnly = false,
  alt = "Mzzpay",
}: BrandLogoProps) {
  return (
    <div
      className={cn("flex items-center", className)}
      role="img"
      aria-label={alt}
    >
      {/* Icon: bold "M" glyph rendered as text so it inherits color & scales crisply */}
      <span
        aria-hidden="true"
        className={cn(
          "font-logo font-black leading-none select-none",
          "inline-flex items-center justify-center",
          iconSizeClassName,
          textClassName,
        )}
        style={{
          fontSize: "1em",
          lineHeight: 1,
          letterSpacing: "-0.02em",
          margin: "10px",
          transform: "rotate(22deg)",
        }}
      >
        M
      </span>

      {!iconOnly && (
        <span
          className={cn(
            "font-wordmark font-bold leading-none",
            "tracking-[0.01em]",
            textClassName,
          )}
          style={{
            marginLeft: "2px",
            fontSize: `${wordmarkSizePx}px`,
          }}
        >
          mzzpay
        </span>
      )}
    </div>
  );
}

export default BrandLogo;
