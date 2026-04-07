/**
 * Variation generator — produces 4 named design skins per template style.
 *
 * Each variation is a complete StyleOptions config derived deterministically
 * from the brand's resolved assets. Variations are visually distinct and
 * represent clear design personalities, not random colour shuffles.
 *
 * Variation personas:
 *   1  Clean / Minimal         — light, airy, professional
 *   2  Bold / Promotional      — high-impact, brand-forward
 *   3  Conversion Focused      — compact, action-driven
 *   4  Premium / Editorial     — dark, sophisticated, brand-rich
 */

import { DEFAULT_STYLE_OPTIONS, type StyleOptions } from './html-renderer'
import type { TemplateStyle } from './presets'
import type { ResolvedBrandSnapshot } from '@/lib/brand/resolve-brand-assets'

// ── Types ─────────────────────────────────────────────────────────────────────

export type CampaignIntent =
  | 'product_launch'
  | 'promotion'
  | 'newsletter'
  | 'announcement'
  | 'other'

export interface VariationConfig {
  index:       1 | 2 | 3 | 4
  name:        string
  tagline:     string
  style_options: StyleOptions
}

// ── Color utilities ────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '').padEnd(6, '0').slice(0, 6)
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b]
    .map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
    .join('')
}

function getLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(v => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function isDark(hex: string): boolean {
  try { return getLuminance(hex) < 0.35 } catch { return false }
}

function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount))
}

function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(
    r + (255 - r) * amount,
    g + (255 - g) * amount,
    b + (255 - b) * amount,
  )
}

/** Create a deep editorial dark bg with a hint of the brand hue */
function editorialDark(primary: string): string {
  const [r, g, b] = hexToRgb(primary)
  return rgbToHex(
    Math.max(8,  Math.round(r * 0.12 + 8)),
    Math.max(8,  Math.round(g * 0.12 + 8)),
    Math.max(12, Math.round(b * 0.18 + 10)),
  )
}

/** Pick a readable light color for text on dark backgrounds */
function lightOnDark(primary: string, accent: string | null): string {
  // Use accent if it's light enough, otherwise lighten the primary
  const candidate = accent ?? primary
  return getLuminance(candidate) > 0.4 ? candidate : lighten(primary, 0.6)
}

/** Neutral slightly-tinted bg derived from primary */
function tintedNeutral(primary: string): string {
  const [r, g, b] = hexToRgb(primary)
  return rgbToHex(
    Math.round(246 + (r - 246) * 0.06),
    Math.round(248 + (g - 248) * 0.04),
    Math.round(250 + (b - 250) * 0.08),
  )
}

/** Desaturated accent for borders and subtle highlights */
function subtleBorder(primary: string): string {
  return lighten(primary, 0.7)
}

// ── Variation generator ────────────────────────────────────────────────────────

export function generateVariations(
  brand: ResolvedBrandSnapshot,
  _style: TemplateStyle,
): VariationConfig[] {
  const primary   = brand.colors.primary   || '#7c3aed'
  const secondary = brand.colors.secondary || '#a78bfa'
  const accent    = brand.colors.accent    || secondary
  const palette   = brand.palette           // ranked hex strings

  // Derived colour tokens
  const darkBg      = editorialDark(primary)
  const darkBodyBg  = darken(darkBg, 0.25)  // slightly lighter than outer
  const darkText    = lightOnDark(primary, accent)
  const ctaOnDark   = palette.length > 2 ? palette[2] : lighten(primary, 0.55)
  const convCta     = isDark(accent) ? accent : darken(accent, 0.08)
  const tintedBg    = tintedNeutral(primary)

  return [
    // ── 1 · Clean / Minimal ──────────────────────────────────────────────────
    {
      index:   1,
      name:    'Clean / Minimal',
      tagline: 'Light, airy and professional',
      style_options: {
        ...DEFAULT_STYLE_OPTIONS,
        wrapper_bg:          tintedBg,
        header_bg:           '#ffffff',
        body_bg:             '#ffffff',
        footer_bg:           tintedBg,
        heading_color:       primary,
        body_color:          '#374151',
        link_color:          primary,
        heading_size:        'md',
        section_padding:     'relaxed',
        card_radius:         16,
        show_border:         false,
        show_header_logo:    true,
        show_social_icons:   true,
        show_footer_address: true,
      },
    },

    // ── 2 · Bold / Promotional ───────────────────────────────────────────────
    {
      index:   2,
      name:    'Bold / Promotional',
      tagline: 'High-impact and brand-forward',
      style_options: {
        ...DEFAULT_STYLE_OPTIONS,
        wrapper_bg:          primary,
        header_bg:           primary,
        body_bg:             '#ffffff',
        footer_bg:           '#f3f4f6',
        heading_color:       primary,
        body_color:          '#1f2937',
        link_color:          accent,
        heading_size:        'lg',
        section_padding:     'normal',
        card_radius:         8,
        show_border:         false,
        show_header_logo:    true,
        show_social_icons:   true,
        show_footer_address: true,
      },
    },

    // ── 3 · Conversion Focused ───────────────────────────────────────────────
    {
      index:   3,
      name:    'Conversion Focused',
      tagline: 'Compact, action-driven',
      style_options: {
        ...DEFAULT_STYLE_OPTIONS,
        wrapper_bg:          '#ffffff',
        header_bg:           '#f9fafb',
        body_bg:             '#ffffff',
        footer_bg:           '#f3f4f6',
        heading_color:       '#111827',
        body_color:          '#374151',
        link_color:          convCta,
        heading_size:        'md',
        section_padding:     'compact',
        card_radius:         6,
        show_border:         true,
        border_color:        subtleBorder(primary),
        show_header_logo:    true,
        show_social_icons:   false,
        show_footer_address: true,
      },
    },

    // ── 4 · Premium / Editorial ──────────────────────────────────────────────
    {
      index:   4,
      name:    'Premium / Editorial',
      tagline: 'Dark, sophisticated, brand-rich',
      style_options: {
        ...DEFAULT_STYLE_OPTIONS,
        wrapper_bg:          darken(darkBg, 0.3),
        header_bg:           darkBg,
        body_bg:             darkBodyBg,
        footer_bg:           darkBg,
        heading_color:       '#ffffff',
        body_color:          '#d1d5db',
        link_color:          ctaOnDark,
        heading_size:        'lg',
        section_padding:     'normal',
        card_radius:         12,
        show_border:         false,
        show_header_logo:    true,
        show_social_icons:   true,
        show_footer_address: false,
      },
    },
  ]
}

// ── Variation recommendation by campaign intent ────────────────────────────────

const INTENT_VARIATION: Record<CampaignIntent, 1 | 2 | 3 | 4> = {
  product_launch: 2,  // Bold — make impact
  promotion:      3,  // Conversion — drive action
  newsletter:     1,  // Clean — readable digest
  announcement:   2,  // Bold — big news deserves presence
  other:          1,  // Clean — safe, professional default
}

export function recommendVariationIndex(intent: CampaignIntent): 1 | 2 | 3 | 4 {
  return INTENT_VARIATION[intent] ?? 1
}

export function getVariationByIndex(
  variations: VariationConfig[],
  index: 1 | 2 | 3 | 4,
): VariationConfig {
  return variations.find(v => v.index === index) ?? variations[0]
}
