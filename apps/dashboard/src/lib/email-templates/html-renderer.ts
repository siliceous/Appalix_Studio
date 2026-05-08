/**
 * Generates a self-contained HTML email preview string from content + brand snapshot.
 * Designed to be rendered in an <iframe srcdoc="..."> in the UI.
 * Regenerated on demand — NOT stored in DB.
 */

import type { TemplateStyle } from './presets'
import type { ResolvedBrandSnapshot } from '@/lib/brand/resolve-brand-assets'

// ── Style overrides ────────────────────────────────────────────────────────────

export interface StyleOptions {
  // Visibility
  show_header_logo:    boolean
  show_social_icons:   boolean   // basic template only
  show_footer_address: boolean   // basic template only

  // Section backgrounds
  wrapper_bg:  string   // outer page bg
  header_bg:   string   // logo row background
  body_bg:     string   // main content area
  footer_bg:   string   // footer row

  // Text
  heading_color: string
  body_color:    string
  heading_size:  'sm' | 'md' | 'lg'

  // Link
  link_color: string

  // Padding
  section_padding: 'compact' | 'normal' | 'relaxed'

  // Border
  card_radius: number   // px
  show_border: boolean
  border_color: string
}

export const DEFAULT_STYLE_OPTIONS: StyleOptions = {
  show_header_logo:    true,
  show_social_icons:   true,
  show_footer_address: true,
  wrapper_bg:          '#f4f4f5',
  header_bg:           '',          // '' = use brand primary / style default
  body_bg:             '#ffffff',
  footer_bg:           '#ffffff',
  heading_color:       '',          // '' = use brand primary
  body_color:          '',          // '' = use brand text color
  heading_size:        'md',
  link_color:          '',          // '' = use brand primary
  section_padding:     'normal',
  card_radius:         12,
  show_border:         false,
  border_color:        '#e5e7eb',
}

const PADDING_MAP = {
  compact:  { v: 20, h: 24 },
  normal:   { v: 32, h: 40 },
  relaxed:  { v: 48, h: 56 },
}

const HEADING_SIZE_MAP = {
  sm: '20px',
  md: '26px',
  lg: '34px',
}

// ── Blocks ─────────────────────────────────────────────────────────────────────

export type BlockType =
  | 'headline' | 'text' | 'image' | 'button' | 'divider' | 'spacer'
  | 'logo' | 'social' | 'footer_block' | 'columns'

export type ColumnRatio = '1:1' | '1:1:1' | '1:1:1:1' | '1:2' | '2:1' | '1:3' | '3:1'

export interface ContentBlock {
  id:      string
  type:    BlockType
  text?:   string
  url?:    string
  alt?:    string
  align?:  'left' | 'center' | 'right'
  height?: number        // spacer only, px
  // logo
  logoUrl?:  string
  logoAlt?:  string
  bgColor?:  string      // background color (logo header bg, button bg)
  // text / headline / button styling
  textColor?:   string   // override text / headline color
  fontFamily?:  string   // override font-family
  fontSize?:    number   // override font size (px)
  bold?:        boolean
  italic?:      boolean
  underline?:   boolean
  imageWidth?:  string   // e.g. '80%', '100%'
  imageRotate?: number   // degrees: 0 | 90 | 180 | 270
  columnWidths?: number[] // flex-grow units, same length as columns array
  blockBgColor?: string  // block-level background (behind all content)
  // social
  socialLinks?: Record<string, string>
  // columns
  ratio?:   ColumnRatio
  columns?: ContentBlock[][]
  // footer_block
  companyName?:    string
  companyUrl?:     string
  unsubscribeUrl?: string
}

// ── Content ────────────────────────────────────────────────────────────────────

export interface TemplateContent {
  subject:        string
  preheader:      string
  footer_text:    string
  blocks:         ContentBlock[]
  style_options?: Partial<StyleOptions>
  // Legacy fields — kept for backward compat with saved templates
  headline?:   string
  body_text?:  string
  cta_text?:   string
  cta_url?:    string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function interpolate(text: string, brand: ResolvedBrandSnapshot): string {
  return text
    .replace(/\{\{company_name\}\}/g, brand.company_name ?? 'Your Company')
    .replace(/\{\{tagline\}\}/g, brand.tagline ?? '')
    .replace(/\{\{month\}\}/g, new Date().toLocaleString('default', { month: 'long', year: 'numeric' }))
    .replace(/\{\{headline\}\}/g, '')
}

function escape(str: string): string {
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
}

function safeUrl(url: string): string {
  try {
    const u = new URL(url)
    if (u.protocol === 'https:' || u.protocol === 'http:') return url
  } catch { /* ignore */ }
  return '#'
}

// ── Block renderer ─────────────────────────────────────────────────────────────

function wrap(inner: string, bg?: string): string {
  return bg
    ? `<div style="background:${bg};">${inner}</div>`
    : inner
}

function renderBlocksHtml(blocks: ContentBlock[], c: Ctx): string {
  return blocks.map(block => {
    switch (block.type) {
      case 'headline': {
        const align    = block.align ?? 'center'
        const text     = escape(block.text ?? '')
        if (!text) return ''
        const color    = block.textColor   || c.headColor
        const ff       = block.fontFamily  ? `'${block.fontFamily}',${c.fontFamily}` : c.fontFamily
        const fs       = block.fontSize    ? `${block.fontSize}px` : c.headSize
        const fi       = block.italic    ? 'italic'    : 'normal'
        const td       = block.underline ? 'underline' : 'none'
        const inner    = `<h2 style="font-size:${fs};font-weight:700;font-style:${fi};text-decoration:${td};color:${color};line-height:1.3;margin:0 0 20px;text-align:${align};font-family:${ff};">${text}</h2>`
        return wrap(inner, block.blockBgColor)
      }
      case 'text': {
        const align  = block.align ?? 'left'
        const color  = block.textColor  || c.textColor
        const ff     = block.fontFamily ? `'${block.fontFamily}',${c.bodyFont}` : c.bodyFont
        const fs     = block.fontSize   ? `${block.fontSize}px` : '15px'
        const fw     = block.bold      ? '700'       : '400'
        const fi     = block.italic    ? 'italic'    : 'normal'
        const td     = block.underline ? 'underline' : 'none'
        const paras  = (block.text ?? '').split('\n\n').filter(Boolean)
          .map(p => `<p style="font-size:${fs};line-height:1.8;color:${color};font-family:${ff};font-weight:${fw};font-style:${fi};text-decoration:${td};margin:0 0 16px;text-align:${align};">${p.replace(/\n/g, '<br/>')}</p>`)
          .join('\n')
        return wrap(paras, block.blockBgColor)
      }
      case 'image': {
        if (!block.url) return ''
        const align  = block.align ?? 'center'
        const margin = align === 'center' ? 'margin:0 auto 24px;display:block;'
          : align === 'right' ? 'margin:0 0 24px auto;display:block;'
          : 'display:block;margin-bottom:24px;'
        const w      = block.imageWidth  ? `width:${block.imageWidth};` : 'max-width:100%;'
        const rot    = block.imageRotate ? `transform:rotate(${block.imageRotate}deg);` : ''
        const inner  = `<img src="${escape(block.url)}" alt="${escape(block.alt ?? '')}" style="${w}height:auto;border-radius:8px;${rot}${margin}" />`
        return wrap(inner, block.blockBgColor)
      }
      case 'button': {
        if (!block.text) return ''
        const href    = block.url ? safeUrl(block.url) : '#'
        const align   = block.align ?? 'center'
        const btnBg   = block.bgColor    || c.linkColor
        const btnClr  = block.textColor  || '#ffffff'
        const ff      = block.fontFamily ? `'${block.fontFamily}',${c.fontFamily}` : c.fontFamily
        const fs      = block.fontSize   ? `${block.fontSize}px` : '14px'
        const fw      = block.bold      ? '700'       : '600'
        const fi      = block.italic    ? 'italic'    : 'normal'
        const td      = block.underline ? 'underline' : 'none'
        const inner   = `<div style="text-align:${align};margin:8px 0 24px;"><a href="${escape(href)}" style="display:inline-block;padding:12px 28px;background:${btnBg};color:${btnClr};text-decoration:${td};border-radius:6px;font-family:${ff};font-size:${fs};font-weight:${fw};font-style:${fi};">${escape(block.text)}</a></div>`
        return wrap(inner, block.blockBgColor)
      }
      case 'divider':
        return `<div style="height:1px;background:#e5e7eb;margin:24px 0;"></div>`
      case 'spacer':
        return `<div style="height:${block.height ?? 32}px;"></div>`
      case 'logo': {
        const bg = block.blockBgColor || block.bgColor || '#f8f9fa'
        const align = block.align ?? 'left'
        const logoEl = block.logoUrl
          ? `<img src="${escape(block.logoUrl)}" alt="${escape(block.logoAlt ?? c.companyName)}" style="max-height:48px;max-width:180px;object-fit:contain;display:block;" />`
          : `<span style="font-family:${c.fontFamily};font-size:20px;font-weight:700;color:${c.headColor};">${escape(block.logoAlt ?? c.companyName)}</span>`
        return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr><td style="padding:20px 40px;background:${bg};text-align:${align};">${logoEl}</td></tr></table>`
      }
      case 'social': {
        const links = block.socialLinks ?? {}
        const platforms = Object.keys(links).filter(k => links[k])
        if (!platforms.length) return ''
        const icons = platforms.map(p =>
          `<a href="${escape(links[p])}" style="display:inline-block;margin:0 5px;width:34px;height:34px;border-radius:50%;background:${c.linkColor};color:#fff;text-align:center;line-height:34px;text-decoration:none;font-family:${c.fontFamily};font-size:13px;font-weight:700;">${escape(p[0].toUpperCase())}</a>`
        ).join('')
        return `<div style="text-align:${block.align ?? 'center'};padding:16px 40px;">${icons}</div>`
      }
      case 'footer_block': {
        const company = escape(block.companyName ?? c.companyName)
        const cu = block.companyUrl ? safeUrl(block.companyUrl) : '#'
        const uu = block.unsubscribeUrl ? safeUrl(block.unsubscribeUrl) : '#'
        const socialLinks = block.socialLinks ?? {}
        const socialIcons = Object.keys(socialLinks).filter(k => socialLinks[k]).map(p =>
          `<a href="${escape(socialLinks[p])}" style="display:inline-block;margin:0 4px;width:30px;height:30px;border-radius:50%;background:${c.linkColor};color:#fff;text-align:center;line-height:30px;text-decoration:none;font-size:12px;font-weight:700;">${escape(p[0].toUpperCase())}</a>`
        ).join('')
        return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr><td style="padding:24px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;font-family:${c.fontFamily};">
${socialIcons ? `<div style="margin-bottom:12px;">${socialIcons}</div>` : ''}
<p style="margin:0 0 6px;font-size:13px;color:#6b7280;">© ${c.year} <a href="${escape(cu)}" style="color:${c.linkColor};text-decoration:none;">${company}</a> · All rights reserved.</p>
<p style="margin:0;font-size:11px;color:#9ca3af;"><a href="${escape(uu)}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a></p>
</td></tr></table>`
      }
      case 'columns': {
        const ratio  = block.ratio ?? '1:1'
        const parts  = ratio.split(':').map(Number)
        const total  = parts.reduce((a, b) => a + b, 0)
        const cols   = block.columns ?? parts.map(() => [])
        const colBg  = block.blockBgColor ? `background:${block.blockBgColor};` : ''
        const tds    = cols.map((col, i) => {
          const pct   = Math.round((parts[i] / total) * 100)
          const inner = renderBlocksHtml(col, c)
          return `<td style="width:${pct}%;vertical-align:top;padding:8px;${colBg}">${inner}</td>`
        }).join('')
        return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:8px 0;"><tr>${tds}</tr></table>`
      }
      default: return ''
    }
  }).join('\n')
}

// ── Main entry ─────────────────────────────────────────────────────────────────

export function renderEmailHtml(
  style:   TemplateStyle,
  content: TemplateContent,
  brand:   ResolvedBrandSnapshot,
): string {
  // Merge style overrides with defaults
  const so: StyleOptions = { ...DEFAULT_STYLE_OPTIONS, ...(content.style_options ?? {}) }
  const pad = PADDING_MAP[so.section_padding]

  const primary    = brand.colors.primary    ?? '#111111'
  const bgDefault  = brand.colors.background ?? '#ffffff'
  const textColor  = so.body_color    || brand.colors.text   || '#333333'
  const headColor  = so.heading_color || primary
  const linkColor  = so.link_color    || primary
  const bodyBg     = so.body_bg
  const headerBg   = so.header_bg || (style === 'promotional' || style === 'announcement' ? primary : bgDefault)
  const footerBg   = so.footer_bg
  const wrapperBg  = so.wrapper_bg
  const headSize   = HEADING_SIZE_MAP[so.heading_size]

  const fontFamily = brand.fonts.heading
    ? `'${brand.fonts.heading}', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
    : `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
  const bodyFont = brand.fonts.body
    ? `'${brand.fonts.body}', Georgia, 'Times New Roman', serif`
    : fontFamily

  // Block-based or legacy field rendering
  const hasBlocks  = content.blocks && content.blocks.length > 0
  const headline   = escape(interpolate(content.headline   ?? '', brand))
  const bodyText   = escape(interpolate(content.body_text  ?? '', brand))
  const ctaText    = escape(interpolate(content.cta_text   ?? '', brand))
  const footerText = escape(interpolate(content.footer_text, brand))
  const ctaHref    = content.cta_url ? safeUrl(content.cta_url) : '#'

  const cardStyle = [
    `background:${bodyBg}`,
    `border-radius:${so.card_radius}px`,
    `overflow:hidden`,
    `box-shadow:0 1px 4px rgba(0,0,0,.08)`,
    so.show_border ? `border:1px solid ${so.border_color}` : '',
  ].filter(Boolean).join(';')

  const logoImg = brand.logo_url
    ? `<img src="${escape(brand.logo_url)}" alt="${escape(brand.company_name ?? 'Logo')}" style="max-height:48px;max-width:180px;object-fit:contain;display:block;" />`
    : `<span style="font-family:${fontFamily};font-size:20px;font-weight:700;color:${headColor};">${escape(brand.company_name ?? 'Your Brand')}</span>`

  const logoBlock  = so.show_header_logo ? logoImg : ''
  const ctaBlock = ctaText
    ? `<a href="${escape(ctaHref)}" style="display:inline-block;padding:12px 28px;background:${linkColor};color:#ffffff;text-decoration:none;border-radius:6px;font-family:${fontFamily};font-size:14px;font-weight:600;letter-spacing:0.3px;">${ctaText}</a>`
    : ''

  const companyName = escape(brand.company_name ?? 'Your Company')
  const year        = new Date().getFullYear().toString()

  const baseCtx = {
    headline, bodyText, ctaBlock, footerText, logoBlock, logoImg,
    primary, headColor, bodyBg, headerBg, footerBg, wrapperBg,
    textColor, headSize, fontFamily, bodyFont, linkColor,
    cardStyle, pad, so, companyName, year, ctaHref,
    blocksHtml: '', hasBlocks,
  }

  const blocksHtml = hasBlocks ? renderBlocksHtml(content.blocks, baseCtx) : ''

  const ctx: Ctx = { ...baseCtx, blocksHtml }

  switch (style) {
    case 'basic':        return basicHtml(ctx)
    case 'minimalist':   return minimalistHtml(ctx)
    case 'promotional':  return promotionalHtml(ctx)
    case 'offer':        return offerHtml(ctx)
    case 'newsletter':   return newsletterHtml(ctx)
    case 'announcement': return announcementHtml(ctx)
    case 'custom':       return minimalistHtml(ctx)
    default:             return minimalistHtml(ctx)
  }
}

// ── Shared context type ────────────────────────────────────────────────────────

interface Ctx {
  headline:    string
  bodyText:    string
  ctaBlock:    string
  footerText:  string
  logoBlock:   string
  logoImg:     string
  primary:     string
  headColor:   string
  bodyBg:      string
  headerBg:    string
  footerBg:    string
  wrapperBg:   string
  textColor:   string
  headSize:    string
  fontFamily:  string
  bodyFont:    string
  linkColor:   string
  cardStyle:   string
  pad:         { v: number; h: number }
  so:          StyleOptions
  companyName: string
  year:        string
  ctaHref:     string
  blocksHtml:  string
  hasBlocks:   boolean
}

// ── SVG social icons ───────────────────────────────────────────────────────────

const FB_SVG  = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>`
const IG_SVG  = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>`
const TW_SVG  = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.7 5.5 4.3 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>`

function socialRow(linkColor: string): string {
  const btn = (icon: string) =>
    `<a href="#" style="display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;background:${linkColor};color:#fff;text-decoration:none;margin:0 4px;">${icon}</a>`
  return `<div style="text-align:center;padding:20px 0;">${btn(FB_SVG)}${btn(IG_SVG)}${btn(TW_SVG)}</div>`
}

// ── Renderers ──────────────────────────────────────────────────────────────────

function basicHtml(c: Ctx): string {
  const { pad, so } = c
  const bodyParas = c.bodyText.split('\n\n').filter(Boolean)
    .map(p => `<p style="font-size:15px;line-height:1.8;color:${c.textColor};font-family:${c.bodyFont};margin:0 0 16px;">${p.replace(/\n/g, '<br/>')}</p>`)
    .join('\n')

  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:${c.wrapperBg};font-family:${c.fontFamily};-webkit-font-smoothing:antialiased}
.wrap{max-width:600px;margin:0 auto}
a{color:${c.linkColor}}
</style></head>
<body>
<div class="wrap">
  <div style="${c.cardStyle};margin:0 0 8px;">
    <!-- Logo header -->
    ${c.logoBlock ? `<div style="text-align:center;padding:${pad.v}px ${pad.h}px ${pad.v * 0.75}px;background:${c.headerBg};border-bottom:1px solid rgba(0,0,0,.06);">${c.logoBlock}</div>` : ''}

    <!-- Body -->
    <div style="background:${c.bodyBg};padding:${pad.v}px ${pad.h}px;">
      ${c.hasBlocks ? c.blocksHtml : `
      <h1 style="font-size:${c.headSize};font-weight:700;color:${c.headColor};line-height:1.3;margin:0 0 20px;text-align:center;font-family:${c.fontFamily};">${c.headline}</h1>
      ${bodyParas}
      ${c.ctaBlock ? `<div style="text-align:center;margin:24px 0 8px;">${c.ctaBlock}</div>` : ''}`}
    </div>

    <!-- Divider -->
    <div style="height:1px;background:#f0f0f0;margin:0 ${pad.h}px;"></div>

    <!-- Social icons -->
    ${so.show_social_icons ? socialRow(c.linkColor) : ''}

    <!-- Footer logo -->
    ${c.logoBlock ? `<div style="text-align:center;padding:${pad.v * 0.75}px ${pad.h}px ${pad.v * 0.5}px;border-top:1px solid #f0f0f0;">${c.logoImg}</div>` : ''}

    <!-- Copyright & address -->
    <div style="background:${c.footerBg};text-align:center;padding:0 ${pad.h}px;font-size:11px;color:#9ca3af;line-height:1.8;">
      <p>Copyright &copy; ${c.year} ${c.companyName}. All rights reserved.</p>
      ${so.show_footer_address ? `<br/><p>Our mailing address is:</p><p>${c.companyName}</p>` : ''}
    </div>

    <!-- Preferences -->
    <div style="text-align:center;padding:14px ${pad.h}px ${pad.v}px;font-size:11px;color:#9ca3af;">
      Want to change how you receive these emails?<br/>
      You can <a href="#" style="color:${c.linkColor};text-decoration:underline;">update your preferences</a> or
      <a href="#" style="color:${c.linkColor};text-decoration:underline;">unsubscribe</a>
    </div>
  </div>
</div>
</body></html>`
}

function minimalistHtml(c: Ctx): string {
  const { pad } = c
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>*{box-sizing:border-box;margin:0;padding:0}body{background:${c.wrapperBg};font-family:${c.fontFamily};-webkit-font-smoothing:antialiased}.wrap{max-width:560px;margin:32px auto}</style>
</head><body><div class="wrap">
  <div style="${c.cardStyle}">
    <div style="padding:${pad.v}px ${pad.h}px ${pad.v * 0.75}px;border-bottom:1px solid #f0f0f0;background:${c.headerBg};">${c.logoBlock}</div>
    <div style="background:${c.bodyBg};padding:${pad.v}px ${pad.h}px;">
      ${c.hasBlocks ? c.blocksHtml : `
      <h1 style="font-size:${c.headSize};font-weight:700;color:${c.headColor};line-height:1.3;margin:0 0 16px;font-family:${c.fontFamily};">${c.headline}</h1>
      <p style="font-size:15px;line-height:1.7;color:${c.textColor};font-family:${c.bodyFont};margin:0 0 24px;">${c.bodyText.replace(/\n/g, '<br/>')}</p>
      ${c.ctaBlock ? `<div>${c.ctaBlock}</div>` : ''}`}
    </div>
    <div style="background:${c.footerBg};padding:${pad.v * 0.625}px ${pad.h}px;text-align:center;font-size:11px;color:#9ca3af;">${c.footerText}</div>
  </div>
</div></body></html>`
}

function promotionalHtml(c: Ctx): string {
  const { pad } = c
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>*{box-sizing:border-box;margin:0;padding:0}body{background:${c.wrapperBg};font-family:${c.fontFamily};-webkit-font-smoothing:antialiased}.wrap{max-width:560px;margin:32px auto}</style>
</head><body><div class="wrap">
  <div style="${c.cardStyle}">
    <div style="background:${c.headerBg};padding:${pad.v}px ${pad.h}px;text-align:center;">
      ${c.logoBlock}
      <h1 style="font-size:${c.headSize};font-weight:800;color:#ffffff;line-height:1.25;margin-top:16px;font-family:${c.fontFamily};">${c.headline}</h1>
    </div>
    <div style="background:${c.bodyBg};padding:${pad.v}px ${pad.h}px;text-align:center;">
      <p style="font-size:15px;line-height:1.7;color:${c.textColor};font-family:${c.bodyFont};margin:0 0 24px;">${c.bodyText.replace(/\n/g, '<br/>')}</p>
      ${c.ctaBlock ?? ''}
    </div>
    <div style="background:${c.footerBg};padding:${pad.v * 0.625}px ${pad.h}px;text-align:center;font-size:11px;color:#9ca3af;">${c.footerText}</div>
  </div>
</div></body></html>`
}

function offerHtml(c: Ctx): string {
  const { pad } = c
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>*{box-sizing:border-box;margin:0;padding:0}body{background:${c.wrapperBg};font-family:${c.fontFamily};-webkit-font-smoothing:antialiased}.wrap{max-width:560px;margin:32px auto}</style>
</head><body><div class="wrap">
  <div style="${c.cardStyle}">
    <div style="height:3px;background:${c.primary};"></div>
    <div style="background:${c.headerBg};padding:${pad.v * 0.875}px ${pad.h}px ${pad.v * 0.75}px;">
      ${c.logoBlock}
      <div style="margin-top:16px;">
        <span style="display:inline-block;background:${c.primary};color:#fff;font-size:11px;font-weight:700;letter-spacing:1px;padding:3px 12px;border-radius:100px;text-transform:uppercase;margin-bottom:10px;">Limited Offer</span>
        <h1 style="font-size:${c.headSize};font-weight:800;color:${c.headColor};line-height:1.2;margin:0 0 6px;font-family:${c.fontFamily};">${c.headline}</h1>
      </div>
    </div>
    <div style="background:${c.bodyBg};padding:${pad.v}px ${pad.h}px;">
      <p style="font-size:15px;line-height:1.7;color:${c.textColor};margin:0 0 24px;">${c.bodyText.replace(/\n/g, '<br/>')}</p>
      ${c.ctaBlock}
    </div>
    <div style="background:${c.footerBg};padding:${pad.v * 0.625}px ${pad.h}px;text-align:center;font-size:11px;color:#9ca3af;">${c.footerText}</div>
  </div>
</div></body></html>`
}

function newsletterHtml(c: Ctx): string {
  const { pad } = c
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>*{box-sizing:border-box;margin:0;padding:0}body{background:${c.wrapperBg};font-family:${c.fontFamily};-webkit-font-smoothing:antialiased}.wrap{max-width:560px;margin:32px auto}</style>
</head><body><div class="wrap">
  <div style="${c.cardStyle}">
    <div style="background:${c.headerBg};padding:${pad.v * 0.75}px ${pad.h}px;display:flex;align-items:center;justify-content:space-between;">
      ${c.logoBlock}
      <span style="font-size:11px;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:1px;">Newsletter</span>
    </div>
    <div style="background:${c.bodyBg};padding:${pad.v}px ${pad.h}px;border-bottom:1px solid #f0f0f0;">
      <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${c.primary};margin-bottom:10px;">This month</div>
      <h1 style="font-size:${c.headSize};font-weight:700;color:${c.headColor};line-height:1.3;margin:0 0 12px;font-family:${c.fontFamily};">${c.headline}</h1>
      <p style="font-size:14px;line-height:1.8;color:${c.textColor};font-family:${c.bodyFont};">${c.bodyText.replace(/\n/g, '<br/>')}</p>
    </div>
    ${c.ctaBlock ? `<div style="background:${c.bodyBg};padding:${pad.v * 0.75}px ${pad.h}px;">${c.ctaBlock}</div>` : ''}
    <div style="background:${c.footerBg};padding:${pad.v * 0.625}px ${pad.h}px;text-align:center;font-size:11px;color:#9ca3af;">${c.footerText}</div>
  </div>
</div></body></html>`
}

function announcementHtml(c: Ctx): string {
  const { pad } = c
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>*{box-sizing:border-box;margin:0;padding:0}body{background:${c.wrapperBg};font-family:${c.fontFamily};-webkit-font-smoothing:antialiased}.wrap{max-width:560px;margin:32px auto}</style>
</head><body><div class="wrap">
  <div style="${c.cardStyle}">
    <div style="background:${c.headerBg};padding:${pad.v}px ${pad.h}px ${pad.v * 0.75}px;">${c.logoBlock}</div>
    <div style="background:${c.primary};padding:${pad.v}px ${pad.h}px;text-align:center;">
      <h1 style="font-size:${c.headSize};font-weight:900;color:#ffffff;line-height:1.15;letter-spacing:-0.5px;font-family:${c.fontFamily};">${c.headline}</h1>
    </div>
    <div style="background:${c.bodyBg};padding:${pad.v}px ${pad.h}px;">
      <p style="font-size:15px;line-height:1.75;color:${c.textColor};">${c.bodyText.replace(/\n/g, '<br/>')}</p>
    </div>
    ${c.ctaBlock ? `<div style="background:${c.bodyBg};padding:0 ${pad.h}px ${pad.v}px;text-align:center;">${c.ctaBlock}</div>` : ''}
    <div style="background:${c.footerBg};padding:${pad.v * 0.625}px ${pad.h}px;text-align:center;font-size:11px;color:#9ca3af;">${c.footerText}</div>
  </div>
</div></body></html>`
}
