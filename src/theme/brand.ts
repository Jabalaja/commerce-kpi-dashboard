/**
 * DIGITALL brand design tokens.
 *
 * Extracted from https://digitall.com/ (Phase 3, Playwright) on 2026-06-19:
 *  - Logo wordmark colors:  sky #64c7f3  +  deep blue #1818bf
 *  - Dominant ink:          #383838 (rgb 56,56,56)
 *  - Muted text:            #6f6f6f
 *  - Page surface:          #edeeef (rgb 237,238,239)
 *  - CTA buttons:           filled sky/cyan (#64c6f2 / #22b8f0), white text, rounded 10-20px
 *  - Typeface:              "Montserrat" (site uses a Montserrat custom font), weights 400/500/700
 *
 * This file is the single source of design truth; the app reads from it (and the
 * CSS variables it generates) rather than hard-coding colors in components.
 */

export const brand = {
  /** Core DIGITALL brand colors, straight from the logo + site. */
  color: {
    blue: '#1818bf', // primary brand (logo deep blue)
    blueBright: '#2874fc', // from the site "midnight" gradient
    sky: '#64c7f3', // secondary brand (logo sky blue)
    cyan: '#22b8f0', // bright CTA accent

    ink: '#383838', // primary text
    inkMuted: '#6f6f6f', // secondary text
    inkFaint: '#9aa0a6', // tertiary / captions

    surface: '#f4f6f8', // app background (cooled from site #edeeef)
    surfaceSunken: '#e8ebef', // recessed panels
    card: '#ffffff',
    border: '#dde3ea',
    borderStrong: '#c6cdd6',

    white: '#ffffff',
    black: '#000000',

    /** Dark canvas option for presenter mode / hero. */
    navy: '#0b1437',
    navyDeep: '#070d26',
  },

  /** A gradient lifted from the DIGITALL site, used for the header / hero. */
  gradient: {
    brand: 'linear-gradient(135deg, #1818bf 0%, #2874fc 100%)',
    skyGlow: 'linear-gradient(135deg, #2874fc 0%, #64c7f3 100%)',
  },

  /**
   * Section accent colors. Anchored on the two DIGITALL logo blues, then spread
   * into a harmonized, distinguishable sequence so each section reads as its own
   * area on the graph. Keys match SectionId in src/kpi-types.ts.
   */
  section: {
    business: '#1818bf', // deep brand blue — the apex / financials
    acquisition: '#2e78f0', // azure
    product: '#18a0c7', // cyan
    basket: '#14b8a6', // teal
    checkout: '#7c5ce0', // indigo-violet
    performance: '#3aae5a', // green (go-fast / tech)
    fulfillment: '#f0a227', // amber (logistics)
    retention: '#e5499b', // magenta
    cost: '#eb5757', // coral-red (money out)
  } as Record<string, string>,

  /**
   * Relationship (edge) colors — how a child influences its parent.
   * Keys match Relationship in src/kpi-types.ts.
   */
  relationship: {
    multiplicative: '#2874fc', // blue
    additive: '#14b8a6', // teal
    inverse: '#f0a227', // amber
    cost: '#eb5757', // coral-red
    driver: '#8a8fa3', // muted slate (qualitative influence)
  } as Record<string, string>,

  /** Impact / effort badge colors (low / medium / high). */
  magnitude: {
    low: '#9aa0a6',
    medium: '#2874fc',
    high: '#1818bf',
  } as Record<string, string>,

  font: {
    family:
      "'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    weight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
    /** Type scale (rem). Large enough to read on a projector at a distance. */
    size: {
      xs: '0.75rem',
      sm: '0.85rem',
      base: '0.95rem',
      md: '1.05rem',
      lg: '1.35rem',
      xl: '1.75rem',
      xxl: '2.5rem',
    },
  },

  /** Spacing rhythm, echoing the site's scale. */
  space: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '40px', xxl: '64px' },

  radius: { sm: '8px', md: '12px', lg: '20px', pill: '999px' },

  shadow: {
    sm: '0 1px 2px rgba(11, 20, 55, 0.06), 0 1px 3px rgba(11, 20, 55, 0.10)',
    md: '0 4px 12px rgba(11, 20, 55, 0.10)',
    lg: '0 12px 32px rgba(11, 20, 55, 0.18)',
    focus: '0 0 0 3px rgba(40, 116, 252, 0.35)',
  },
} as const;

/** Flatten the brand tokens into CSS custom properties for :root. */
export function brandCssVariables(): Record<string, string> {
  const vars: Record<string, string> = {
    '--brand-blue': brand.color.blue,
    '--brand-blue-bright': brand.color.blueBright,
    '--brand-sky': brand.color.sky,
    '--brand-cyan': brand.color.cyan,
    '--ink': brand.color.ink,
    '--ink-muted': brand.color.inkMuted,
    '--ink-faint': brand.color.inkFaint,
    '--surface': brand.color.surface,
    '--surface-sunken': brand.color.surfaceSunken,
    '--card': brand.color.card,
    '--border': brand.color.border,
    '--border-strong': brand.color.borderStrong,
    '--navy': brand.color.navy,
    '--navy-deep': brand.color.navyDeep,
    '--gradient-brand': brand.gradient.brand,
    '--font-family': brand.font.family,
    '--radius-sm': brand.radius.sm,
    '--radius-md': brand.radius.md,
    '--radius-lg': brand.radius.lg,
    '--shadow-sm': brand.shadow.sm,
    '--shadow-md': brand.shadow.md,
    '--shadow-lg': brand.shadow.lg,
    '--shadow-focus': brand.shadow.focus,
  };
  for (const [key, value] of Object.entries(brand.section)) vars[`--section-${key}`] = value;
  for (const [key, value] of Object.entries(brand.relationship)) vars[`--rel-${key}`] = value;
  return vars;
}

export type Brand = typeof brand;
