import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, ImageIcon } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * Downloadable brand glyph page.
 *
 * Renders the MzzPay "M" mark (Bagel Fat One, rotated 30°, primary teal)
 * as a high-resolution canvas/SVG. Users can download:
 *  - SVG (vector, infinitely scalable, transparent background)
 *  - PNG (1024×1024, transparent background, retina-ready)
 */
export default function BrandGlyph() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [downloading, setDownloading] = useState<"svg" | "png" | null>(null);

  // Design-system primary teal. Inline so the downloaded file is self-contained.
  const TEAL = "hsl(172, 72%, 42%)";

  const buildSvgString = () => {
    // 1024×1024 canvas, glyph rotated 30°, Bagel Fat One.
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Bagel+Fat+One&amp;display=swap');
      .glyph { font-family: 'Bagel Fat One', system-ui, sans-serif; font-weight: 900; }
    </style>
  </defs>
  <g transform="translate(512 512) rotate(30)">
    <text class="glyph" x="0" y="0"
      text-anchor="middle"
      dominant-baseline="central"
      font-size="780"
      letter-spacing="-15"
      fill="${TEAL}">M</text>
  </g>
</svg>`;
  };

  const downloadSvg = () => {
    setDownloading("svg");
    const svg = buildSvgString();
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mzzpay-glyph.svg";
    a.click();
    URL.revokeObjectURL(url);
    setDownloading(null);
  };

  const downloadPng = async () => {
    setDownloading("png");
    try {
      const svg = buildSvgString();
      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = url;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to render glyph"));
      });

      const canvas = document.createElement("canvas");
      canvas.width = 1024;
      canvas.height = 1024;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");
      ctx.drawImage(img, 0, 0, 1024, 1024);

      const pngUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = "mzzpay-glyph.png";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <Link to="/" className="font-wordmark text-xl font-bold text-primary">
            mzzpay / brand
          </Link>
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to site
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground mb-3">
              Brand asset · v1.0
            </p>
            <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4">
              The Mzzpay glyph
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              A bold "M" set in Bagel Fat One, rotated 30°, in our signature
              electric teal. Download as SVG for vector use, or PNG for raster.
            </p>
          </div>

          {/* Glyph preview canvas */}
          <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
            <div
              className="aspect-square w-full flex items-center justify-center relative"
              style={{
                background:
                  "radial-gradient(ellipse at center, hsl(var(--muted) / 0.4), transparent 70%)",
              }}
            >
              {/* Inline preview matches the downloaded SVG exactly */}
              <svg
                ref={svgRef}
                viewBox="0 0 1024 1024"
                className="w-3/4 h-3/4"
                aria-label="Mzzpay glyph"
              >
                <g transform="translate(512 512) rotate(30)">
                  <text
                    x="0"
                    y="0"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="780"
                    letterSpacing="-15"
                    fill="hsl(var(--primary))"
                    style={{
                      fontFamily: "'Bagel Fat One', system-ui, sans-serif",
                      fontWeight: 900,
                    }}
                  >
                    M
                  </text>
                </g>
              </svg>
            </div>

            <div className="border-t border-border bg-muted/20 p-6 flex flex-col sm:flex-row gap-3">
              <Button
                onClick={downloadSvg}
                disabled={downloading !== null}
                className="flex-1 gap-2"
                size="lg"
              >
                <Download className="h-4 w-4" />
                {downloading === "svg" ? "Preparing…" : "Download SVG"}
              </Button>
              <Button
                onClick={downloadPng}
                disabled={downloading !== null}
                variant="outline"
                className="flex-1 gap-2"
                size="lg"
              >
                <ImageIcon className="h-4 w-4" />
                {downloading === "png" ? "Rendering…" : "Download PNG (1024px)"}
              </Button>
            </div>
          </div>

          {/* Specs */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
            <SpecCard label="Font" value="Bagel Fat One" />
            <SpecCard label="Rotation" value="30°" />
            <SpecCard label="Color" value="Electric Teal" mono="hsl(172 72% 42%)" />
            <SpecCard label="Canvas" value="1024 × 1024" />
          </div>
        </div>
      </main>
    </div>
  );
}

function SpecCard({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
        {label}
      </p>
      <p className="font-heading text-base font-semibold text-foreground">
        {value}
      </p>
      {mono && (
        <p className="font-mono text-xs text-muted-foreground mt-1">{mono}</p>
      )}
    </div>
  );
}
