import { cn } from "@/lib/utils";

interface BrandLogoProps {
  /** Tailwind class controlling the wordmark + icon color (e.g. text-foreground, text-white). */
  textClassName?: string;
  /** Optional extra wrapper classes. */
  className?: string;
  /** Tailwind size class for the icon (height). Defaults to h-24. */
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
 *  - Icon: bold "M" glyph rendered in **Bagel Fat One** (Google Font), rotated 22°,
 *    10px margin all around. Color matches the surrounding text (so it inherits
 *    light/dark theme correctly).
 *  - Icon height: h-24 by default.
 *  - Wordmark: "mzzpay" in Bagel Fat One, sitting 2px next to the icon, with a touch
 *    of letter-spacing so the m / z / z / p / a / y don't crowd each other.
 */
export function BrandLogo({
  textClassName = "text-foreground",
  className,
  iconSizeClassName = "h-24",
  wordmarkSizeClassName = "text-3xl",
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
            "font-logo font-bold leading-none",
            "tracking-[0.01em]",
            wordmarkSizeClassName,
            textClassName,
          )}
          style={{
            marginLeft: "2px",
          }}
        >
          mzzpay
        </span>
      )}
    </div>
  );
}

export default BrandLogo;
