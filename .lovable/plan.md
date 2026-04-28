## Goal
Restyle the entire site (dark mode only) to a black + darker pastel mustard yellow palette, and replace the hero subheading.

## Palette direction
- Base: deep near-black with a faint warm undertone (not pure #000, avoids harshness).
- Brand: darker pastel mustard — muted, desaturated gold (think aged-mustard, not neon yellow).
- Accent: warmer dusty amber for hover/highlight contrast.
- Text: soft warm off-white for readability on black.

## Changes

### 1. Theme tokens — `src/styles.css` (dark/`:root` block only)
Swap the purple/cyan/pink aurora system for black + pastel mustard. Keep all variable and class names so every page picks up the change automatically.

- `--background`: deep warm-black, e.g. `oklch(0.14 0.012 80)`
- `--foreground`: warm off-white, e.g. `oklch(0.95 0.015 85)`
- `--card`, `--popover`: slightly lifted black with warm tint and existing alpha
- `--secondary`, `--muted`: dark warm grays (`oklch(0.22 0.015 80)` range)
- `--muted-foreground`: muted cream (`oklch(0.7 0.02 85)`)
- `--primary`: darker pastel mustard, e.g. `oklch(0.72 0.11 88)`
- `--primary-foreground`: near-black
- `--accent`: dusty amber, e.g. `oklch(0.66 0.12 75)`
- `--accent-foreground`: near-black
- `--ring`: mustard (matches primary)
- `--border`, `--input`: warm white at low alpha (`oklch(1 0 0 / 0.07)`)
- `--success` / `--warning` / `--destructive`: keep semantics but desaturate slightly so they blend with the pastel palette
- Chart palette (`--chart-1`…`--chart-7`): muted mustard, dusty amber, warm taupe, soft sand, olive-gold, cream, faded ochre — all in the pastel range
- Sidebar tokens: mirror the main surfaces
- Gradients:
  - `--gradient-primary`: mustard → dusty amber
  - `--gradient-aurora`: mustard → amber → soft cream-gold (replaces purple/cyan/pink)
  - `--gradient-card`: layered warm-black translucent
  - `--gradient-hero`: radial mustard glow on black
- Shadows / glow:
  - `--shadow-glow` and `--shadow-glow-cyan` both retinted to pastel mustard glow (different intensities so existing class usage still varies)
- Body background radial orbs in `@layer base body`: replace the three purple/cyan/pink ellipses with mustard + amber + deep-gold tints at low alpha so the ambient glow matches.
- `pulse-glow` keyframe colors: retint to mustard.

Light mode (`.light` block): leave untouched per your direction. Dark mode is the default and the only one being restyled.

### 2. Hero copy — `src/routes/index.tsx`
Replace the paragraph (~lines 81–90) currently:
> "Track every ₹, budget like a pro, get smart spending insights, and split group outings without the awkward math."

With:
> "Campus Finance: Spend Smart. Split Easy."

Keep the existing motion wrapper and styling.

## Out of scope
- No component markup changes beyond the one copy edit.
- No light-mode token changes.
- No logo / icon swaps — `Sparkles` and gradient text inherit the new mustard automatically.
- No routing, auth, or data changes.

## Verification
- Visit `/`, `/dashboard`, `/groups`, `/groups/$id`, `/expenses`, `/budgets`, `/analytics`, `/profile`, `/settings` to confirm the pastel mustard + black palette applies cleanly (cards, buttons, charts, gradient text, glow shadows).
- Confirm the hero shows the new short tagline.
- Confirm contrast remains readable on muted-foreground text and chart labels.