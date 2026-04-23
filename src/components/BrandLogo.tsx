import { cn } from "@/lib/utils";

interface BrandLogoProps {
  /**
   * Tailwind class controlling the wordmark + icon color.
   * Defaults to the design-system primary (teal in both light & dark themes).
   */
  textClassName?: string;
  /** Optional extra wrapper classes. */
  className?: string;
  /**
   * Tailwind size class for the icon (height).
   * Default scales: h-26 on mobile → h-32 on md+.
   */
  iconSizeClassName?: string;
  /**
   * Tailwind text-size class for the wordmark.
   * Wordmark is locked at 20px via inline style — this class is kept for
   * backwards compatibility but no longer overrides the size.
   */
  wordmarkSizeClassName?: string;
  /** Hide the wordmark and only render the icon. */
  iconOnly?: boolean;
  /** Alt text override (for screen readers). */
  alt?: string;
}

/**
 * MzzPay brand lockup — single source of truth.
 *
 * Spec:
 *  - Icon: bold "M" glyph in **Bagel Fat One**, rotated 22°, 10px margin.
 *    Default height: h-26 mobile, h-32 (h-32) on md+ screens.
 *  - Wordmark: "mzzpay" in Coolvetica, locked at exactly 20px, 2px gap from icon.
 *  - Color: inherits from --primary (design-system teal in both themes).
 *  - iconOnly mode preserves the same icon dimensions & color.
 */
export function BrandLogo({
  textClassName = "text-primary",
  className,
  iconSizeClassName = "h-26 md:h-32",
  wordmarkSizeClassName,
  iconOnly = false,
  alt = "Mzzpay",
}: BrandLogoProps) {
  return (
    <div
      className={cn("flex items-center", className)}
      role="img"
      aria-label={alt}
    >
      {/* Icon glyph — Bagel Fat One, rotated, scales with iconSizeClassName */}
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
          transformOrigin: "center",
        }}
      >
        M
      </span>

      {!iconOnly && (
        <span
          className={cn(
            "font-wordmark font-bold leading-none",
            "tracking-[0.01em]",
            wordmarkSizeClassName,
            textClassName,
          )}
          style={{
            marginLeft: "2px",
            // Locked per spec — wordmark stays exactly 20px regardless of icon size
            fontSize: "20px",
          }}
        >
          mzzpay
        </span>
      )}
    </div>
  );
}

export default BrandLogo;
