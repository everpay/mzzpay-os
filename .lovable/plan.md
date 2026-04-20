

## Goal

Standardize button sizing/styling across the entire project, deepen chart/card shadows, and bump base typography scale up one notch — all using the existing MzzPay design system (no external skill required).

> Note: `redesign-skill` is not an available Lovable skill (available skills are limited to ai-gateway, canvas-design, pdf, pptx, etc.). I'll execute the redesign using our existing Tailwind tokens and shadcn `Button` variants instead.

## 1. Unified Button System (`src/components/ui/button.tsx`)

Rewrite the `buttonVariants` so every button across the app inherits a consistent shape, height, and weight:

- **Shape**: all sizes use `rounded-full` (already partially true — `sm`/`lg`/`icon` currently use `rounded-md`; unify them).
- **Heights** (one step taller for better tap targets + bigger feel):
  - `sm` → `h-9 px-4 text-sm`
  - `default` → `h-11 px-5 text-[0.95rem]`
  - `lg` → `h-12 px-7 text-base`
  - `icon` → `h-11 w-11`
- **Weight**: keep `font-semibold`; add subtle `shadow-soft` to `default`/`destructive` for depth.
- **Variants**: leave the 6 existing variants but tighten the `outline` border to `border-2` for visibility at the new size.

This single change automatically propagates to ~all `<Button>` usages (Settings, Auth, dashboard, dialogs, etc.) — no per-page edits needed.

### Landing page hand-rolled buttons

Three buttons in `src/pages/Landing.tsx` (lines 105, 761, plus the header CTAs) use raw `<button>`/inline styles instead of `<Button>`. Convert them to `<Button>` with the new variants so they match.

## 2. Card & Chart Shadow Boost

Update the shadow tokens in `src/index.css` so cards/charts feel more elevated:

| Token | Before (light) | After (light) |
|---|---|---|
| `--shadow-card` | `0 1px 2px / 0 0 0 1px border` | `0 4px 12px hsl(210 11% 11% / 0.06), 0 0 0 1px border` |
| `--shadow-elevated` | `0 8px 30px / 0.08` | `0 16px 40px hsl(210 11% 11% / 0.12), 0 0 0 1px border` |
| `--shadow-soft` | `0 2px 8px / 0.04` | `0 4px 14px hsl(210 11% 11% / 0.06)` |

Same proportional bump for the dark theme variants.

Also update `src/components/ui/card.tsx` — replace the default `shadow-sm` with `shadow-card` so every shadcn `<Card>` (used in dozens of pages) picks up the deeper shadow automatically.

`VolumeChart`, `ProviderAnalytics`, `SubscriptionAnalytics` already use `shadow-card`, so they inherit the upgrade for free.

## 3. Typography Scale Up

In `src/index.css`:
- `html { font-size: 17px }` (from 16px) — bumps the entire rem scale ~6%.
- `body { font-size: 1rem }` (from `0.9375rem`) for body copy.

This single root change cascades through every Tailwind text utility (`text-sm`, `text-base`, `text-lg`, headings, etc.) so the whole app — admin, merchant, marketing, docs — gets bigger consistently without touching individual components.

## Files Touched

```text
src/components/ui/button.tsx       — unified variants
src/components/ui/card.tsx         — default shadow → shadow-card
src/index.css                      — root font-size + shadow tokens
src/pages/Landing.tsx              — 3 raw buttons → <Button>
```

## Out of Scope

- No changes to the 21st.dev component catalog (those would require new installs and the user didn't request specific blocks).
- No changes to chart colors or chart internals — just their container shadow.
- No changes to logos, layout grids, or copy.

