import railwayIcon from "@/assets/mzzpay-railway-icon.png";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  /** Tailwind class controlling the wordmark color (e.g. text-foreground, text-white). */
  textClassName?: string;
  /** Optional extra wrapper classes. */
  className?: string;
  /** Tailwind size class for the icon. Defaults to h-28 w-28 per brand spec. */
  iconSizeClassName?: string;
  /** Tailwind text-size class for the wordmark. */
  wordmarkSizeClassName?: string;
  /** Hide the wordmark and only render the icon. */
  iconOnly?: boolean;
  /** Alt text override. */
  alt?: string;
}

/**
 * MzzPay brand lockup — single source of truth.
 *
 * Spec:
 *  - Icon: Railway-inspired bold "R" mark, rotated 30°, 2px margin all around,
 *    keeps the brand teal color (image is already rendered in teal).
 *  - Wordmark: "MzzPay" in Coolvetica Regular with an 8px gap from the icon.
 */
export function BrandLogo({
  textClassName = "text-foreground",
  className,
  iconSizeClassName = "h-28 w-28",
  wordmarkSizeClassName = "text-3xl",
  iconOnly = false,
  alt = "MzzPay",
}: BrandLogoProps) {
  return (
    <div className={cn("flex items-center", className)}>
      <img
        src={railwayIcon}
        alt={alt}
        loading="lazy"
        width={1024}
        height={1024}
        className={cn(
          iconSizeClassName,
          "rotate-[30deg] m-[2px] object-contain drop-shadow-sm",
        )}
      />
      {!iconOnly && (
        <span
          className={cn(
            "font-logo tracking-wide ml-[8px] leading-none",
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
