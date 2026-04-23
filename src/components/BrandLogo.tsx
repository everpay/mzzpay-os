import { cn } from "@/lib/utils";

interface BrandLogoProps {
  /** Tailwind class controlling the wordmark + icon color (e.g. text-foreground, text-white). */
  textClassName?: string;
  /** Optional extra wrapper classes. */
  className?: string;
  /** Tailwind size class for the icon (height). Defaults to h-20 per brand spec. */
  iconSizeClassName?: string;
  /** Tailwind text-size class for the wordmark. */
  wordmarkSizeClassName?: string;
  /** Hide the wordmark and only render the icon. */
  iconOnly?: boolean;
  /** Alt text override (for screen readers). */
  alt?: string;
}

/**
 * MzzPay brand lockup — single source of truth.
 *
 * Spec (from product):
 *  - Icon: bold "R" glyph rendered in **Raleway 900** (Google Font), rotated 30°,
 *    2px margin all around. Color matches the surrounding text (so it inherits
 *    light/dark theme correctly).
 *  - Icon height: h-20 by default.
 *  - Wordmark: "MzzPay" in Raleway, sitting -2px next to the icon, with a touch
 *    of letter-spacing so the M / z / z / P / a / y don't crowd each other.
 */
export function BrandLogo({
  textClassName = "text-foreground",
  className,
  iconSizeClassName = "h-20",
  wordmarkSizeClassName = "text-3xl",
  iconOnly = false,
  alt = "MzzPay",
}: BrandLogoProps) {
  return (
    <div
      className={cn("flex items-center", className)}
      role="img"
      aria-label={alt}
    >
      {/* Icon: bold rotated "R" rendered as text so it inherits color & scales crisply */}
      <span
        aria-hidden="true"
        className={cn(
          "font-logo font-black leading-none select-none",
          "rotate-[30deg] m-[2px] inline-flex items-center justify-center",
          iconSizeClassName,
          textClassName,
        )}
        style={{
          // Match the icon visual size to the height class via 1em sizing.
          fontSize: "1em",
          lineHeight: 1,
          // Optical tightening so the R reads as a mark, not a letter.
          letterSpacing: "-0.05em",
        }}
      >
        R
      </span>

      {!iconOnly && (
        <span
          className={cn(
            "font-logo font-bold leading-none",
            // -2px gap from the icon per spec, then a little tracking so
            // "MzzPay" doesn't feel cramped (matches Recurly-style reference).
            "ml-[-2px] tracking-[0.01em]",
            wordmarkSizeClassName,
            textClassName,
          )}
        >
          MzzPay
        </span>
      )}
    </div>
  );
}

export default BrandLogo;
