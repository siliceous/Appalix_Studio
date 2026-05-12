/**
 * Email template gallery definitions.
 * Each template category has 4 professional variations with distinct layouts.
 * Used for both gallery preview and editor initialization.
 */

import type { TemplateContent, ContentBlock, StyleOptions, ColumnRatio } from './html-renderer'
import type { TemplateStyle } from './presets'

export interface VariationConfig {
  index: 1 | 2 | 3 | 4
  name: string
  tagline: string
  defaultContent: TemplateContent
}

export interface GalleryTemplate {
  id: TemplateStyle
  label: string
  description: string
  previewImage: string | null
  variations: VariationConfig[]
}

function createBlock(block: Partial<ContentBlock> & { id?: string }): ContentBlock {
  return {
    id: block.id ?? `block-${Math.random().toString(36).slice(2, 9)}`,
    type: block.type ?? 'text',
    ...block,
  } as ContentBlock
}

// ── BASIC TEMPLATE ────────────────────────────────────────────────────────────

const basicVariation1: VariationConfig = {
  index: 1,
  name: 'Clean / Minimal',
  tagline: 'Light, centered, spacious',
  defaultContent: {
    subject: 'A message from {{company_name}}',
    preheader: "Here's what we'd like to share",
    footer_text: '{{company_name}} · All rights reserved',
    blocks: [
      createBlock({ type: 'logo', logoUrl: '{{brand.logo}}', align: 'center', height: 40 }),
      createBlock({ type: 'spacer', height: 24 }),
      createBlock({ type: 'image', url: '/email-images/basic-hero.jpg', alt: 'Hero', align: 'center', imageWidth: '100%' }),
      createBlock({ type: 'spacer', height: 32 }),
      createBlock({ type: 'headline', text: "It's time to connect", align: 'center', fontSize: 32, bold: true }),
      createBlock({ type: 'spacer', height: 12 }),
      createBlock({ type: 'text', text: 'Thank you for being part of our community. We are excited to share this with you.', align: 'center' }),
      createBlock({ type: 'spacer', height: 24 }),
      createBlock({ type: 'button', text: 'Get Started', url: 'https://example.com', align: 'center' }),
      createBlock({ type: 'spacer', height: 40 }),
      createBlock({ type: 'footer_block', companyName: '{{company_name}}' }),
    ],
    style_options: {
      show_header_logo: true,
      show_social_icons: true,
      show_footer_address: true,
      wrapper_bg: '#f9fafb',
      header_bg: '#ffffff',
      body_bg: '#ffffff',
      footer_bg: '#f3f4f6',
      heading_color: '#000000',
      body_color: '#4b5563',
      heading_size: 'md',
      link_color: '#0066cc',
      section_padding: 'relaxed',
      card_radius: 8,
      show_border: false,
      border_color: '#e5e7eb',
    },
  },
}

const basicVariation2: VariationConfig = {
  index: 2,
  name: 'Bold / Promotional',
  tagline: 'High-contrast, attention-grabbing',
  defaultContent: {
    subject: 'Special offer inside',
    preheader: 'Limited time only',
    footer_text: '{{company_name}}',
    blocks: [
      createBlock({ type: 'headline', text: 'SPECIAL OFFER', align: 'center', fontSize: 42, bold: true, textColor: '#ffffff' }),
      createBlock({ type: 'text', text: 'Limited time only', align: 'center', textColor: '#ffffff', fontSize: 18 }),
      createBlock({ type: 'spacer', height: 20 }),
      createBlock({ type: 'image', url: '/email-images/product-1.jpg', alt: 'Product', align: 'center', imageWidth: '100%' }),
      createBlock({ type: 'spacer', height: 20 }),
      createBlock({ type: 'button', text: 'Claim Offer Now', url: 'https://example.com', align: 'center', bgColor: '#ffffff', textColor: '#000000' }),
      createBlock({ type: 'spacer', height: 40 }),
      createBlock({ type: 'footer_block', companyName: '{{company_name}}' }),
    ],
    style_options: {
      show_header_logo: false,
      show_social_icons: false,
      show_footer_address: false,
      wrapper_bg: '#1a1a1a',
      header_bg: '#1a1a1a',
      body_bg: '#2d2d2d',
      footer_bg: '#1a1a1a',
      heading_color: '#ffffff',
      body_color: '#e0e0e0',
      heading_size: 'lg',
      link_color: '#ffffff',
      section_padding: 'normal',
      card_radius: 0,
      show_border: false,
      border_color: '#444444',
    },
  },
}

const basicVariation3: VariationConfig = {
  index: 3,
  name: 'Conversion Focused',
  tagline: 'Two-column product layout',
  defaultContent: {
    subject: 'Check out our latest',
    preheader: 'Two amazing products inside',
    footer_text: '{{company_name}}',
    blocks: [
      createBlock({ type: 'logo', logoUrl: '{{brand.logo}}', align: 'left', height: 35 }),
      createBlock({ type: 'spacer', height: 16 }),
      createBlock({ type: 'headline', text: 'Two Great Options', align: 'left', fontSize: 28, bold: true }),
      createBlock({ type: 'spacer', height: 20 }),
      createBlock({
        type: 'columns',
        ratio: '1:1',
        columns: [
          [
            createBlock({ type: 'image', url: '/email-images/product-2.jpg', alt: 'Product A', align: 'center', imageWidth: '100%' }),
            createBlock({ type: 'spacer', height: 12 }),
            createBlock({ type: 'headline', text: 'Product A', align: 'center', fontSize: 18, bold: true }),
            createBlock({ type: 'text', text: 'Amazing features', align: 'center', fontSize: 12 }),
            createBlock({ type: 'button', text: 'Learn More', url: 'https://example.com', align: 'center' }),
          ],
          [
            createBlock({ type: 'image', url: '/email-images/product-3.jpg', alt: 'Product B', align: 'center', imageWidth: '100%' }),
            createBlock({ type: 'spacer', height: 12 }),
            createBlock({ type: 'headline', text: 'Product B', align: 'center', fontSize: 18, bold: true }),
            createBlock({ type: 'text', text: 'Great value', align: 'center', fontSize: 12 }),
            createBlock({ type: 'button', text: 'Learn More', url: 'https://example.com', align: 'center' }),
          ],
        ],
      }),
      createBlock({ type: 'spacer', height: 24 }),
      createBlock({ type: 'footer_block', companyName: '{{company_name}}' }),
    ],
    style_options: {
      show_header_logo: true,
      show_social_icons: false,
      show_footer_address: false,
      wrapper_bg: '#f0f9ff',
      header_bg: '#f0f9ff',
      body_bg: '#ffffff',
      footer_bg: '#f0f9ff',
      heading_color: '#0c4a6e',
      body_color: '#164e63',
      heading_size: 'md',
      link_color: '#0369a1',
      section_padding: 'normal',
      card_radius: 8,
      show_border: false,
      border_color: '#06b6d4',
    },
  },
}

const basicVariation4: VariationConfig = {
  index: 4,
  name: 'Premium / Editorial',
  tagline: 'Dark elegant with features',
  defaultContent: {
    subject: 'Introducing something special',
    preheader: 'Premium experience inside',
    footer_text: '{{company_name}} · Crafted with care',
    blocks: [
      createBlock({ type: 'image', url: '/email-images/offer-hero.jpg', alt: 'Hero', align: 'center', imageWidth: '100%' }),
      createBlock({ type: 'spacer', height: 24 }),
      createBlock({ type: 'headline', text: 'The Premium Experience', align: 'center', fontSize: 36, bold: true, textColor: '#ffffff' }),
      createBlock({ type: 'text', text: 'Discover what makes us different', align: 'center', textColor: '#d1d5db' }),
      createBlock({ type: 'spacer', height: 24 }),
      createBlock({
        type: 'columns',
        ratio: '1:1:1',
        columns: [
          [
            createBlock({ type: 'headline', text: '✨ Feature 1', align: 'center', fontSize: 14, bold: true, textColor: '#ffffff' }),
            createBlock({ type: 'text', text: 'Quality service', align: 'center', fontSize: 12, textColor: '#9ca3af' }),
          ],
          [
            createBlock({ type: 'headline', text: '⚡ Feature 2', align: 'center', fontSize: 14, bold: true, textColor: '#ffffff' }),
            createBlock({ type: 'text', text: 'Fast delivery', align: 'center', fontSize: 12, textColor: '#9ca3af' }),
          ],
          [
            createBlock({ type: 'headline', text: '🛡️ Feature 3', align: 'center', fontSize: 14, bold: true, textColor: '#ffffff' }),
            createBlock({ type: 'text', text: 'Always secure', align: 'center', fontSize: 12, textColor: '#9ca3af' }),
          ],
        ],
      }),
      createBlock({ type: 'spacer', height: 24 }),
      createBlock({ type: 'button', text: 'Explore Premium', url: 'https://example.com', align: 'center', bgColor: '#60a5fa', textColor: '#000000' }),
      createBlock({ type: 'spacer', height: 40 }),
      createBlock({ type: 'footer_block', companyName: '{{company_name}}' }),
    ],
    style_options: {
      show_header_logo: false,
      show_social_icons: true,
      show_footer_address: false,
      wrapper_bg: '#111827',
      header_bg: '#1f2937',
      body_bg: '#1f2937',
      footer_bg: '#111827',
      heading_color: '#ffffff',
      body_color: '#d1d5db',
      heading_size: 'lg',
      link_color: '#60a5fa',
      section_padding: 'relaxed',
      card_radius: 12,
      show_border: true,
      border_color: '#374151',
    },
  },
}

const BASIC_TEMPLATE: GalleryTemplate = {
  id: 'basic',
  label: 'Basic',
  description: 'Simple, elegant template for any message',
  previewImage: '/email-images/basic-hero.jpg',
  variations: [basicVariation1, basicVariation2, basicVariation3, basicVariation4],
}

// ── NEWSLETTER TEMPLATE ───────────────────────────────────────────────────────

const newsletterVariation1: VariationConfig = {
  index: 1,
  name: 'Clean / Minimal',
  tagline: 'Multi-section newsletter layout',
  defaultContent: {
    subject: 'This month\'s newsletter',
    preheader: 'Check out our latest updates',
    footer_text: '{{company_name}} · Newsletter',
    blocks: [
      createBlock({ type: 'logo', logoUrl: '{{brand.logo}}', align: 'center', height: 40 }),
      createBlock({ type: 'spacer', height: 20 }),
      createBlock({ type: 'headline', text: 'Monthly Newsletter', align: 'center', fontSize: 28, bold: true }),
      createBlock({ type: 'spacer', height: 16 }),
      createBlock({ type: 'image', url: '/email-images/newsletter-hero.jpg', alt: 'Newsletter', align: 'center', imageWidth: '100%' }),
      createBlock({ type: 'spacer', height: 20 }),
      createBlock({
        type: 'columns',
        ratio: '1:1',
        columns: [
          [
            createBlock({ type: 'headline', text: 'Article 1', align: 'left', fontSize: 16, bold: true }),
            createBlock({ type: 'text', text: 'Read about our latest insights and updates.', align: 'left', fontSize: 12 }),
          ],
          [
            createBlock({ type: 'headline', text: 'Article 2', align: 'left', fontSize: 16, bold: true }),
            createBlock({ type: 'text', text: 'Discover what\'s new in the industry.', align: 'left', fontSize: 12 }),
          ],
        ],
      }),
      createBlock({ type: 'spacer', height: 20 }),
      createBlock({ type: 'button', text: 'Read Full Newsletter', url: 'https://example.com', align: 'center' }),
      createBlock({ type: 'spacer', height: 24 }),
      createBlock({ type: 'footer_block', companyName: '{{company_name}}' }),
    ],
    style_options: {
      show_header_logo: true,
      show_social_icons: true,
      show_footer_address: false,
      wrapper_bg: '#f9fafb',
      header_bg: '#ffffff',
      body_bg: '#ffffff',
      footer_bg: '#f3f4f6',
      heading_color: '#000000',
      body_color: '#4b5563',
      heading_size: 'md',
      link_color: '#0066cc',
      section_padding: 'normal',
      card_radius: 8,
      show_border: false,
      border_color: '#e5e7eb',
    },
  },
}

const newsletterVariation2: VariationConfig = {
  index: 2,
  name: 'Bold / Promotional',
  tagline: 'Featured story focus',
  defaultContent: {
    subject: 'Breaking: Check this out',
    preheader: 'Our top story this month',
    footer_text: '{{company_name}}',
    blocks: [
      createBlock({ type: 'image', url: '/email-images/product-4.jpg', alt: 'Featured', align: 'center', imageWidth: '100%' }),
      createBlock({ type: 'spacer', height: 24 }),
      createBlock({ type: 'headline', text: 'FEATURED STORY', align: 'center', fontSize: 24, bold: true, textColor: '#ffffff' }),
      createBlock({ type: 'text', text: 'Our biggest announcement yet', align: 'center', textColor: '#e0e0e0' }),
      createBlock({ type: 'spacer', height: 20 }),
      createBlock({ type: 'button', text: 'Read Story', url: 'https://example.com', align: 'center', bgColor: '#ffffff', textColor: '#1a1a1a' }),
      createBlock({ type: 'spacer', height: 24 }),
      createBlock({ type: 'footer_block', companyName: '{{company_name}}' }),
    ],
    style_options: {
      show_header_logo: false,
      show_social_icons: false,
      show_footer_address: false,
      wrapper_bg: '#1a1a1a',
      header_bg: '#1a1a1a',
      body_bg: '#2d2d2d',
      footer_bg: '#1a1a1a',
      heading_color: '#ffffff',
      body_color: '#d1d5db',
      heading_size: 'lg',
      link_color: '#ffffff',
      section_padding: 'normal',
      card_radius: 0,
      show_border: false,
      border_color: '#444444',
    },
  },
}

const newsletterVariation3: VariationConfig = {
  index: 3,
  name: 'Conversion Focused',
  tagline: 'Three-column updates',
  defaultContent: {
    subject: 'Your weekly updates',
    preheader: 'Three things to know',
    footer_text: '{{company_name}}',
    blocks: [
      createBlock({ type: 'logo', logoUrl: '{{brand.logo}}', align: 'center', height: 35 }),
      createBlock({ type: 'spacer', height: 16 }),
      createBlock({ type: 'headline', text: 'This Week in Updates', align: 'center', fontSize: 24, bold: true }),
      createBlock({ type: 'spacer', height: 20 }),
      createBlock({
        type: 'columns',
        ratio: '1:1:1',
        columns: [
          [
            createBlock({ type: 'image', url: '/email-images/product-5.jpg', alt: 'Update 1', align: 'center', imageWidth: '100%' }),
            createBlock({ type: 'spacer', height: 12 }),
            createBlock({ type: 'headline', text: 'Update 1', align: 'center', fontSize: 14, bold: true }),
            createBlock({ type: 'text', text: 'Latest news', align: 'center', fontSize: 11 }),
          ],
          [
            createBlock({ type: 'image', url: '/email-images/product-2.jpg', alt: 'Update 2', align: 'center', imageWidth: '100%' }),
            createBlock({ type: 'spacer', height: 12 }),
            createBlock({ type: 'headline', text: 'Update 2', align: 'center', fontSize: 14, bold: true }),
            createBlock({ type: 'text', text: 'Feature launch', align: 'center', fontSize: 11 }),
          ],
          [
            createBlock({ type: 'image', url: '/email-images/product-6.jpg', alt: 'Update 3', align: 'center', imageWidth: '100%' }),
            createBlock({ type: 'spacer', height: 12 }),
            createBlock({ type: 'headline', text: 'Update 3', align: 'center', fontSize: 14, bold: true }),
            createBlock({ type: 'text', text: 'Community win', align: 'center', fontSize: 11 }),
          ],
        ],
      }),
      createBlock({ type: 'spacer', height: 24 }),
      createBlock({ type: 'footer_block', companyName: '{{company_name}}' }),
    ],
    style_options: {
      show_header_logo: true,
      show_social_icons: false,
      show_footer_address: false,
      wrapper_bg: '#ecfdf5',
      header_bg: '#ecfdf5',
      body_bg: '#ffffff',
      footer_bg: '#ecfdf5',
      heading_color: '#065f46',
      body_color: '#047857',
      heading_size: 'md',
      link_color: '#059669',
      section_padding: 'normal',
      card_radius: 8,
      show_border: false,
      border_color: '#10b981',
    },
  },
}

const newsletterVariation4: VariationConfig = {
  index: 4,
  name: 'Premium / Editorial',
  tagline: 'Luxe multi-story layout',
  defaultContent: {
    subject: 'Premium digest inside',
    preheader: 'Curated news for you',
    footer_text: '{{company_name}} · Curated',
    blocks: [
      createBlock({ type: 'headline', text: 'CURATED DIGEST', align: 'center', fontSize: 20, bold: true, textColor: '#fbbf24' }),
      createBlock({ type: 'spacer', height: 16 }),
      createBlock({ type: 'image', url: '/email-images/newsletter-hero.jpg', alt: 'Featured', align: 'center', imageWidth: '100%' }),
      createBlock({ type: 'spacer', height: 20 }),
      createBlock({ type: 'headline', text: 'Premium Content Collection', align: 'center', fontSize: 24, bold: true, textColor: '#ffffff' }),
      createBlock({ type: 'spacer', height: 16 }),
      createBlock({ type: 'text', text: 'Exclusive insights from industry leaders', align: 'center', textColor: '#d1d5db' }),
      createBlock({ type: 'spacer', height: 24 }),
      createBlock({ type: 'button', text: 'View Full Digest', url: 'https://example.com', align: 'center', bgColor: '#fbbf24', textColor: '#000000' }),
      createBlock({ type: 'spacer', height: 40 }),
      createBlock({ type: 'footer_block', companyName: '{{company_name}}' }),
    ],
    style_options: {
      show_header_logo: false,
      show_social_icons: true,
      show_footer_address: false,
      wrapper_bg: '#1f1f23',
      header_bg: '#2d2d31',
      body_bg: '#2d2d31',
      footer_bg: '#1f1f23',
      heading_color: '#ffffff',
      body_color: '#d1d5db',
      heading_size: 'lg',
      link_color: '#fbbf24',
      section_padding: 'relaxed',
      card_radius: 12,
      show_border: true,
      border_color: '#3f3f46',
    },
  },
}

const NEWSLETTER_TEMPLATE: GalleryTemplate = {
  id: 'newsletter',
  label: 'Newsletter',
  description: 'Multi-section digest with featured content',
  previewImage: '/email-images/newsletter-hero.jpg',
  variations: [newsletterVariation1, newsletterVariation2, newsletterVariation3, newsletterVariation4],
}

// ── ANNOUNCEMENT TEMPLATE ─────────────────────────────────────────────────────

const announcementVariation1: VariationConfig = {
  index: 1,
  name: 'Clean / Minimal',
  tagline: 'Centered announcement',
  defaultContent: {
    subject: 'An important announcement',
    preheader: 'We have news to share',
    footer_text: '{{company_name}}',
    blocks: [
      createBlock({ type: 'spacer', height: 40 }),
      createBlock({ type: 'headline', text: 'Important Announcement', align: 'center', fontSize: 36, bold: true }),
      createBlock({ type: 'spacer', height: 16 }),
      createBlock({ type: 'text', text: 'We are excited to share this important news with you.', align: 'center', fontSize: 16 }),
      createBlock({ type: 'spacer', height: 24 }),
      createBlock({ type: 'image', url: '/email-images/announcement-hero.jpg', alt: 'Announcement', align: 'center', imageWidth: '100%' }),
      createBlock({ type: 'spacer', height: 24 }),
      createBlock({ type: 'button', text: 'Learn More', url: 'https://example.com', align: 'center' }),
      createBlock({ type: 'spacer', height: 40 }),
      createBlock({ type: 'footer_block', companyName: '{{company_name}}' }),
    ],
    style_options: {
      show_header_logo: false,
      show_social_icons: false,
      show_footer_address: false,
      wrapper_bg: '#ffffff',
      header_bg: '#ffffff',
      body_bg: '#ffffff',
      footer_bg: '#f3f4f6',
      heading_color: '#000000',
      body_color: '#4b5563',
      heading_size: 'lg',
      link_color: '#dc2626',
      section_padding: 'relaxed',
      card_radius: 0,
      show_border: false,
      border_color: '#e5e7eb',
    },
  },
}

const announcementVariation2: VariationConfig = {
  index: 2,
  name: 'Bold / Promotional',
  tagline: 'Eye-catching banner style',
  defaultContent: {
    subject: 'BREAKING NEWS',
    preheader: 'You need to see this',
    footer_text: '{{company_name}}',
    blocks: [
      createBlock({ type: 'headline', text: 'BREAKING NEWS', align: 'center', fontSize: 48, bold: true, textColor: '#ffffff' }),
      createBlock({ type: 'spacer', height: 24 }),
      createBlock({ type: 'image', url: '/email-images/product-1.jpg', alt: 'Breaking', align: 'center', imageWidth: '100%' }),
      createBlock({ type: 'spacer', height: 24 }),
      createBlock({ type: 'headline', text: 'Something Major Happened', align: 'center', fontSize: 28, bold: true, textColor: '#ffffff' }),
      createBlock({ type: 'spacer', height: 16 }),
      createBlock({ type: 'button', text: 'Get Full Details', url: 'https://example.com', align: 'center', bgColor: '#fbbf24', textColor: '#000000' }),
      createBlock({ type: 'spacer', height: 40 }),
      createBlock({ type: 'footer_block', companyName: '{{company_name}}' }),
    ],
    style_options: {
      show_header_logo: false,
      show_social_icons: false,
      show_footer_address: false,
      wrapper_bg: '#991b1b',
      header_bg: '#7f1d1d',
      body_bg: '#b91c1c',
      footer_bg: '#7f1d1d',
      heading_color: '#ffffff',
      body_color: '#fecaca',
      heading_size: 'lg',
      link_color: '#fbbf24',
      section_padding: 'normal',
      card_radius: 0,
      show_border: false,
      border_color: '#dc2626',
    },
  },
}

const announcementVariation3: VariationConfig = {
  index: 3,
  name: 'Conversion Focused',
  tagline: 'Details with call-to-action',
  defaultContent: {
    subject: 'Update: What you need to know',
    preheader: 'New changes explained',
    footer_text: '{{company_name}}',
    blocks: [
      createBlock({ type: 'logo', logoUrl: '{{brand.logo}}', align: 'left', height: 32 }),
      createBlock({ type: 'spacer', height: 20 }),
      createBlock({ type: 'headline', text: 'System Update', align: 'left', fontSize: 24, bold: true }),
      createBlock({ type: 'spacer', height: 12 }),
      createBlock({ type: 'text', text: 'Here\'s what changed and why it matters to you.', align: 'left' }),
      createBlock({ type: 'spacer', height: 16 }),
      createBlock({
        type: 'columns',
        ratio: '1:1',
        columns: [
          [
            createBlock({ type: 'headline', text: '✓ Improvement 1', align: 'left', fontSize: 14, bold: true }),
            createBlock({ type: 'text', text: 'Faster processing', align: 'left', fontSize: 12 }),
          ],
          [
            createBlock({ type: 'headline', text: '✓ Improvement 2', align: 'left', fontSize: 14, bold: true }),
            createBlock({ type: 'text', text: 'Better security', align: 'left', fontSize: 12 }),
          ],
        ],
      }),
      createBlock({ type: 'spacer', height: 16 }),
      createBlock({ type: 'button', text: 'Review Changes', url: 'https://example.com', align: 'left' }),
      createBlock({ type: 'spacer', height: 24 }),
      createBlock({ type: 'footer_block', companyName: '{{company_name}}' }),
    ],
    style_options: {
      show_header_logo: true,
      show_social_icons: false,
      show_footer_address: false,
      wrapper_bg: '#f0f9ff',
      header_bg: '#f0f9ff',
      body_bg: '#ffffff',
      footer_bg: '#f0f9ff',
      heading_color: '#0c4a6e',
      body_color: '#164e63',
      heading_size: 'md',
      link_color: '#0284c7',
      section_padding: 'normal',
      card_radius: 6,
      show_border: false,
      border_color: '#06b6d4',
    },
  },
}

const announcementVariation4: VariationConfig = {
  index: 4,
  name: 'Premium / Editorial',
  tagline: 'Sophisticated announcement',
  defaultContent: {
    subject: 'An exclusive announcement for you',
    preheader: 'Something special inside',
    footer_text: '{{company_name}} · Exclusive',
    blocks: [
      createBlock({ type: 'image', url: '/email-images/announcement-hero.jpg', alt: 'Announcement', align: 'center', imageWidth: '100%' }),
      createBlock({ type: 'spacer', height: 32 }),
      createBlock({ type: 'headline', text: 'EXCLUSIVE ANNOUNCEMENT', align: 'center', fontSize: 18, bold: true, textColor: '#a78bfa' }),
      createBlock({ type: 'spacer', height: 12 }),
      createBlock({ type: 'headline', text: 'Something Remarkable', align: 'center', fontSize: 32, bold: true, textColor: '#ffffff' }),
      createBlock({ type: 'spacer', height: 16 }),
      createBlock({ type: 'text', text: 'For our most valued members', align: 'center', textColor: '#d1d5db', fontSize: 14 }),
      createBlock({ type: 'spacer', height: 28 }),
      createBlock({ type: 'button', text: 'Discover More', url: 'https://example.com', align: 'center', bgColor: '#a78bfa', textColor: '#000000' }),
      createBlock({ type: 'spacer', height: 40 }),
      createBlock({ type: 'footer_block', companyName: '{{company_name}}' }),
    ],
    style_options: {
      show_header_logo: false,
      show_social_icons: true,
      show_footer_address: false,
      wrapper_bg: '#2e1065',
      header_bg: '#3b0764',
      body_bg: '#4c1d95',
      footer_bg: '#2e1065',
      heading_color: '#ffffff',
      body_color: '#e9d5ff',
      heading_size: 'lg',
      link_color: '#c4b5fd',
      section_padding: 'relaxed',
      card_radius: 12,
      show_border: true,
      border_color: '#6b21a8',
    },
  },
}

const ANNOUNCEMENT_TEMPLATE: GalleryTemplate = {
  id: 'announcement',
  label: 'Announcement',
  description: 'Bold announcement with hero section',
  previewImage: '/email-images/announcement-hero.jpg',
  variations: [announcementVariation1, announcementVariation2, announcementVariation3, announcementVariation4],
}

// ── PROMOTIONAL TEMPLATE ──────────────────────────────────────────────────────

const promotionalVariation1: VariationConfig = {
  index: 1,
  name: 'Clean / Minimal',
  tagline: 'Elegant product showcase',
  defaultContent: {
    subject: 'New products you might love',
    preheader: 'See what\'s new',
    footer_text: '{{company_name}} · Shop Now',
    blocks: [
      createBlock({ type: 'logo', logoUrl: '{{brand.logo}}', align: 'center', height: 40 }),
      createBlock({ type: 'spacer', height: 24 }),
      createBlock({ type: 'headline', text: 'New Collection', align: 'center', fontSize: 28, bold: true }),
      createBlock({ type: 'spacer', height: 16 }),
      createBlock({ type: 'image', url: '/email-images/product-1.jpg', alt: 'Product', align: 'center', imageWidth: '100%' }),
      createBlock({ type: 'spacer', height: 20 }),
      createBlock({ type: 'text', text: 'Discover our latest premium collection', align: 'center' }),
      createBlock({ type: 'spacer', height: 20 }),
      createBlock({ type: 'button', text: 'Shop Collection', url: 'https://example.com', align: 'center' }),
      createBlock({ type: 'spacer', height: 24 }),
      createBlock({ type: 'footer_block', companyName: '{{company_name}}' }),
    ],
    style_options: {
      show_header_logo: true,
      show_social_icons: true,
      show_footer_address: false,
      wrapper_bg: '#f9fafb',
      header_bg: '#ffffff',
      body_bg: '#ffffff',
      footer_bg: '#f3f4f6',
      heading_color: '#000000',
      body_color: '#4b5563',
      heading_size: 'md',
      link_color: '#9333ea',
      section_padding: 'normal',
      card_radius: 8,
      show_border: false,
      border_color: '#e5e7eb',
    },
  },
}

const promotionalVariation2: VariationConfig = {
  index: 2,
  name: 'Bold / Promotional',
  tagline: 'High-impact product hero',
  defaultContent: {
    subject: 'LIMITED: Premium Offer Inside',
    preheader: 'Exclusive deal waiting',
    footer_text: '{{company_name}}',
    blocks: [
      createBlock({ type: 'image', url: '/email-images/product-4.jpg', alt: 'Premium Product', align: 'center', imageWidth: '100%' }),
      createBlock({ type: 'spacer', height: 20 }),
      createBlock({ type: 'headline', text: '🎉 EXCLUSIVE DEAL', align: 'center', fontSize: 40, bold: true, textColor: '#ffffff' }),
      createBlock({ type: 'spacer', height: 12 }),
      createBlock({ type: 'text', text: '50% OFF - TODAY ONLY', align: 'center', textColor: '#ffffff', fontSize: 20, bold: true }),
      createBlock({ type: 'spacer', height: 20 }),
      createBlock({ type: 'button', text: 'Claim Deal Now', url: 'https://example.com', align: 'center', bgColor: '#ffffff', textColor: '#000000' }),
      createBlock({ type: 'spacer', height: 24 }),
      createBlock({ type: 'footer_block', companyName: '{{company_name}}' }),
    ],
    style_options: {
      show_header_logo: false,
      show_social_icons: false,
      show_footer_address: false,
      wrapper_bg: '#7c3aed',
      header_bg: '#6d28d9',
      body_bg: '#8b5cf6',
      footer_bg: '#7c3aed',
      heading_color: '#ffffff',
      body_color: '#ede9fe',
      heading_size: 'lg',
      link_color: '#ffffff',
      section_padding: 'normal',
      card_radius: 0,
      show_border: false,
      border_color: '#a78bfa',
    },
  },
}

const promotionalVariation3: VariationConfig = {
  index: 3,
  name: 'Conversion Focused',
  tagline: 'Product grid layout',
  defaultContent: {
    subject: 'Three must-have products',
    preheader: 'Great deals inside',
    footer_text: '{{company_name}}',
    blocks: [
      createBlock({ type: 'headline', text: 'Featured Products', align: 'center', fontSize: 24, bold: true }),
      createBlock({ type: 'spacer', height: 16 }),
      createBlock({
        type: 'columns',
        ratio: '1:1:1',
        columns: [
          [
            createBlock({ type: 'image', url: '/email-images/product-2.jpg', alt: 'Product A', align: 'center', imageWidth: '100%' }),
            createBlock({ type: 'spacer', height: 8 }),
            createBlock({ type: 'headline', text: 'Product A', align: 'center', fontSize: 14, bold: true }),
            createBlock({ type: 'text', text: '$29.99', align: 'center', fontSize: 12, bold: true }),
            createBlock({ type: 'button', text: 'Buy', url: 'https://example.com', align: 'center' }),
          ],
          [
            createBlock({ type: 'image', url: '/email-images/product-3.jpg', alt: 'Product B', align: 'center', imageWidth: '100%' }),
            createBlock({ type: 'spacer', height: 8 }),
            createBlock({ type: 'headline', text: 'Product B', align: 'center', fontSize: 14, bold: true }),
            createBlock({ type: 'text', text: '$39.99', align: 'center', fontSize: 12, bold: true }),
            createBlock({ type: 'button', text: 'Buy', url: 'https://example.com', align: 'center' }),
          ],
          [
            createBlock({ type: 'image', url: '/email-images/product-5.jpg', alt: 'Product C', align: 'center', imageWidth: '100%' }),
            createBlock({ type: 'spacer', height: 8 }),
            createBlock({ type: 'headline', text: 'Product C', align: 'center', fontSize: 14, bold: true }),
            createBlock({ type: 'text', text: '$49.99', align: 'center', fontSize: 12, bold: true }),
            createBlock({ type: 'button', text: 'Buy', url: 'https://example.com', align: 'center' }),
          ],
        ],
      }),
      createBlock({ type: 'spacer', height: 16 }),
      createBlock({ type: 'footer_block', companyName: '{{company_name}}' }),
    ],
    style_options: {
      show_header_logo: false,
      show_social_icons: false,
      show_footer_address: false,
      wrapper_bg: '#fef3c7',
      header_bg: '#fef3c7',
      body_bg: '#ffffff',
      footer_bg: '#fef3c7',
      heading_color: '#92400e',
      body_color: '#b45309',
      heading_size: 'md',
      link_color: '#d97706',
      section_padding: 'normal',
      card_radius: 6,
      show_border: false,
      border_color: '#fbbf24',
    },
  },
}

const promotionalVariation4: VariationConfig = {
  index: 4,
  name: 'Premium / Editorial',
  tagline: 'Luxury product display',
  defaultContent: {
    subject: 'Exclusive luxury collection',
    preheader: 'Premium selection available',
    footer_text: '{{company_name}} · Luxury',
    blocks: [
      createBlock({ type: 'image', url: '/email-images/product-6.jpg', alt: 'Luxury', align: 'center', imageWidth: '100%' }),
      createBlock({ type: 'spacer', height: 32 }),
      createBlock({ type: 'headline', text: 'LUXURY COLLECTION', align: 'center', fontSize: 16, bold: true, textColor: '#fbbf24' }),
      createBlock({ type: 'spacer', height: 12 }),
      createBlock({ type: 'headline', text: 'Premium Selection', align: 'center', fontSize: 36, bold: true, textColor: '#ffffff' }),
      createBlock({ type: 'spacer', height: 12 }),
      createBlock({ type: 'text', text: 'Handcrafted, limited edition pieces', align: 'center', textColor: '#d1d5db' }),
      createBlock({ type: 'spacer', height: 28 }),
      createBlock({ type: 'button', text: 'Browse Collection', url: 'https://example.com', align: 'center', bgColor: '#fbbf24', textColor: '#000000' }),
      createBlock({ type: 'spacer', height: 40 }),
      createBlock({ type: 'footer_block', companyName: '{{company_name}}' }),
    ],
    style_options: {
      show_header_logo: false,
      show_social_icons: true,
      show_footer_address: false,
      wrapper_bg: '#1a1a1a',
      header_bg: '#242424',
      body_bg: '#2d2d2d',
      footer_bg: '#1a1a1a',
      heading_color: '#ffffff',
      body_color: '#d1d5db',
      heading_size: 'lg',
      link_color: '#fbbf24',
      section_padding: 'relaxed',
      card_radius: 12,
      show_border: true,
      border_color: '#3f3f46',
    },
  },
}

const PROMOTIONAL_TEMPLATE: GalleryTemplate = {
  id: 'promotional',
  label: 'Promotional',
  description: 'Product showcase and sales',
  previewImage: '/email-images/product-1.jpg',
  variations: [promotionalVariation1, promotionalVariation2, promotionalVariation3, promotionalVariation4],
}

// ── OFFER TEMPLATE ────────────────────────────────────────────────────────────

const offerVariation1: VariationConfig = {
  index: 1,
  name: 'Clean / Minimal',
  tagline: 'Subtle discount offer',
  defaultContent: {
    subject: 'Special offer just for you',
    preheader: 'Limited time',
    footer_text: '{{company_name}}',
    blocks: [
      createBlock({ type: 'logo', logoUrl: '{{brand.logo}}', align: 'center', height: 40 }),
      createBlock({ type: 'spacer', height: 32 }),
      createBlock({ type: 'headline', text: 'We have a special offer', align: 'center', fontSize: 28, bold: true }),
      createBlock({ type: 'spacer', height: 12 }),
      createBlock({ type: 'text', text: 'Just for you', align: 'center', fontSize: 16 }),
      createBlock({ type: 'spacer', height: 24 }),
      createBlock({ type: 'image', url: '/email-images/offer-hero.jpg', alt: 'Offer', align: 'center', imageWidth: '100%' }),
      createBlock({ type: 'spacer', height: 24 }),
      createBlock({ type: 'button', text: 'Claim Offer', url: 'https://example.com', align: 'center' }),
      createBlock({ type: 'spacer', height: 24 }),
      createBlock({ type: 'footer_block', companyName: '{{company_name}}' }),
    ],
    style_options: {
      show_header_logo: true,
      show_social_icons: true,
      show_footer_address: false,
      wrapper_bg: '#f9fafb',
      header_bg: '#ffffff',
      body_bg: '#ffffff',
      footer_bg: '#f3f4f6',
      heading_color: '#000000',
      body_color: '#4b5563',
      heading_size: 'md',
      link_color: '#16a34a',
      section_padding: 'normal',
      card_radius: 8,
      show_border: false,
      border_color: '#e5e7eb',
    },
  },
}

const offerVariation2: VariationConfig = {
  index: 2,
  name: 'Bold / Promotional',
  tagline: 'Urgent discount banner',
  defaultContent: {
    subject: 'HURRY: Limited time offer',
    preheader: 'Expires soon',
    footer_text: '{{company_name}}',
    blocks: [
      createBlock({ type: 'headline', text: '⏰ FLASH SALE', align: 'center', fontSize: 44, bold: true, textColor: '#ffffff' }),
      createBlock({ type: 'spacer', height: 12 }),
      createBlock({ type: 'headline', text: '24 HOURS ONLY', align: 'center', fontSize: 32, bold: true, textColor: '#fbbf24' }),
      createBlock({ type: 'spacer', height: 20 }),
      createBlock({ type: 'image', url: '/email-images/product-1.jpg', alt: 'Sale', align: 'center', imageWidth: '100%' }),
      createBlock({ type: 'spacer', height: 20 }),
      createBlock({ type: 'button', text: 'Shop Now', url: 'https://example.com', align: 'center', bgColor: '#fbbf24', textColor: '#000000' }),
      createBlock({ type: 'spacer', height: 24 }),
      createBlock({ type: 'footer_block', companyName: '{{company_name}}' }),
    ],
    style_options: {
      show_header_logo: false,
      show_social_icons: false,
      show_footer_address: false,
      wrapper_bg: '#dc2626',
      header_bg: '#b91c1c',
      body_bg: '#ef4444',
      footer_bg: '#dc2626',
      heading_color: '#ffffff',
      body_color: '#fee2e2',
      heading_size: 'lg',
      link_color: '#fbbf24',
      section_padding: 'normal',
      card_radius: 0,
      show_border: false,
      border_color: '#fca5a5',
    },
  },
}

const offerVariation3: VariationConfig = {
  index: 3,
  name: 'Conversion Focused',
  tagline: 'Tiered discount options',
  defaultContent: {
    subject: 'Choose your discount level',
    preheader: 'Three options to pick from',
    footer_text: '{{company_name}}',
    blocks: [
      createBlock({ type: 'headline', text: 'Pick Your Discount', align: 'center', fontSize: 24, bold: true }),
      createBlock({ type: 'spacer', height: 20 }),
      createBlock({
        type: 'columns',
        ratio: '1:1:1',
        columns: [
          [
            createBlock({ type: 'headline', text: '10% Off', align: 'center', fontSize: 20, bold: true, textColor: '#ffffff' }),
            createBlock({ type: 'text', text: 'Any order', align: 'center', textColor: '#ffffff' }),
            createBlock({ type: 'button', text: 'Use Now', url: 'https://example.com', align: 'center' }),
          ],
          [
            createBlock({ type: 'headline', text: '25% Off', align: 'center', fontSize: 20, bold: true, textColor: '#ffffff' }),
            createBlock({ type: 'text', text: '$50+', align: 'center', textColor: '#ffffff' }),
            createBlock({ type: 'button', text: 'Use Now', url: 'https://example.com', align: 'center' }),
          ],
          [
            createBlock({ type: 'headline', text: '40% Off', align: 'center', fontSize: 20, bold: true, textColor: '#ffffff' }),
            createBlock({ type: 'text', text: '$100+', align: 'center', textColor: '#ffffff' }),
            createBlock({ type: 'button', text: 'Use Now', url: 'https://example.com', align: 'center' }),
          ],
        ],
      }),
      createBlock({ type: 'spacer', height: 24 }),
      createBlock({ type: 'footer_block', companyName: '{{company_name}}' }),
    ],
    style_options: {
      show_header_logo: false,
      show_social_icons: false,
      show_footer_address: false,
      wrapper_bg: '#059669',
      header_bg: '#047857',
      body_bg: '#10b981',
      footer_bg: '#059669',
      heading_color: '#ffffff',
      body_color: '#d1fae5',
      heading_size: 'lg',
      link_color: '#ffffff',
      section_padding: 'normal',
      card_radius: 4,
      show_border: false,
      border_color: '#6ee7b7',
    },
  },
}

const offerVariation4: VariationConfig = {
  index: 4,
  name: 'Premium / Editorial',
  tagline: 'VIP exclusive offer',
  defaultContent: {
    subject: 'VIP: Exclusive offer inside',
    preheader: 'For our most valued members',
    footer_text: '{{company_name}} · VIP',
    blocks: [
      createBlock({ type: 'headline', text: 'VIP EXCLUSIVE', align: 'center', fontSize: 14, bold: true, textColor: '#fbbf24' }),
      createBlock({ type: 'spacer', height: 12 }),
      createBlock({ type: 'image', url: '/email-images/offer-hero.jpg', alt: 'VIP', align: 'center', imageWidth: '100%' }),
      createBlock({ type: 'spacer', height: 28 }),
      createBlock({ type: 'headline', text: 'Members Only Deal', align: 'center', fontSize: 32, bold: true, textColor: '#ffffff' }),
      createBlock({ type: 'spacer', height: 12 }),
      createBlock({ type: 'text', text: 'Get 60% off on selected premium items', align: 'center', textColor: '#d1d5db', fontSize: 16 }),
      createBlock({ type: 'spacer', height: 28 }),
      createBlock({ type: 'button', text: 'Redeem VIP Offer', url: 'https://example.com', align: 'center', bgColor: '#fbbf24', textColor: '#000000' }),
      createBlock({ type: 'spacer', height: 40 }),
      createBlock({ type: 'footer_block', companyName: '{{company_name}}' }),
    ],
    style_options: {
      show_header_logo: false,
      show_social_icons: true,
      show_footer_address: false,
      wrapper_bg: '#0f172a',
      header_bg: '#1e293b',
      body_bg: '#1e293b',
      footer_bg: '#0f172a',
      heading_color: '#ffffff',
      body_color: '#cbd5e1',
      heading_size: 'lg',
      link_color: '#fbbf24',
      section_padding: 'relaxed',
      card_radius: 12,
      show_border: true,
      border_color: '#334155',
    },
  },
}

const OFFER_TEMPLATE: GalleryTemplate = {
  id: 'offer',
  label: 'Offer',
  description: 'Deal and discount focus',
  previewImage: '/email-images/offer-hero.jpg',
  variations: [offerVariation1, offerVariation2, offerVariation3, offerVariation4],
}

// ── MINIMALIST TEMPLATE ───────────────────────────────────────────────────────

const minimalistVariation1: VariationConfig = {
  index: 1,
  name: 'Clean / Minimal',
  tagline: 'Typography-focused design',
  defaultContent: {
    subject: 'A thought to share',
    preheader: 'Read our insight',
    footer_text: '{{company_name}}',
    blocks: [
      createBlock({ type: 'spacer', height: 40 }),
      createBlock({ type: 'headline', text: 'A Thought', align: 'center', fontSize: 24, bold: true }),
      createBlock({ type: 'spacer', height: 20 }),
      createBlock({ type: 'text', text: 'Sometimes the simplest messages carry the most weight. Here\'s something worth considering.', align: 'center', fontSize: 14 }),
      createBlock({ type: 'spacer', height: 24 }),
      createBlock({ type: 'button', text: 'Read More', url: 'https://example.com', align: 'center' }),
      createBlock({ type: 'spacer', height: 40 }),
      createBlock({ type: 'footer_block', companyName: '{{company_name}}' }),
    ],
    style_options: {
      show_header_logo: false,
      show_social_icons: false,
      show_footer_address: false,
      wrapper_bg: '#ffffff',
      header_bg: '#ffffff',
      body_bg: '#ffffff',
      footer_bg: '#f3f4f6',
      heading_color: '#000000',
      body_color: '#4b5563',
      heading_size: 'md',
      link_color: '#0066cc',
      section_padding: 'relaxed',
      card_radius: 0,
      show_border: false,
      border_color: '#e5e7eb',
    },
  },
}

const minimalistVariation2: VariationConfig = {
  index: 2,
  name: 'Bold / Promotional',
  tagline: 'Statement-driven message',
  defaultContent: {
    subject: 'A bold statement',
    preheader: 'We have something to say',
    footer_text: '{{company_name}}',
    blocks: [
      createBlock({ type: 'spacer', height: 60 }),
      createBlock({ type: 'headline', text: 'THINK DIFFERENT', align: 'center', fontSize: 48, bold: true, textColor: '#ffffff' }),
      createBlock({ type: 'spacer', height: 32 }),
      createBlock({ type: 'text', text: 'Innovation starts with a different perspective.', align: 'center', textColor: '#e0e0e0', fontSize: 16 }),
      createBlock({ type: 'spacer', height: 32 }),
      createBlock({ type: 'button', text: 'Discover', url: 'https://example.com', align: 'center', bgColor: '#ffffff', textColor: '#000000' }),
      createBlock({ type: 'spacer', height: 60 }),
      createBlock({ type: 'footer_block', companyName: '{{company_name}}' }),
    ],
    style_options: {
      show_header_logo: false,
      show_social_icons: false,
      show_footer_address: false,
      wrapper_bg: '#000000',
      header_bg: '#000000',
      body_bg: '#000000',
      footer_bg: '#1a1a1a',
      heading_color: '#ffffff',
      body_color: '#d1d5db',
      heading_size: 'lg',
      link_color: '#ffffff',
      section_padding: 'relaxed',
      card_radius: 0,
      show_border: false,
      border_color: '#333333',
    },
  },
}

const minimalistVariation3: VariationConfig = {
  index: 3,
  name: 'Conversion Focused',
  tagline: 'Minimalist with action',
  defaultContent: {
    subject: 'A simple offer',
    preheader: 'No fluff, just value',
    footer_text: '{{company_name}}',
    blocks: [
      createBlock({ type: 'spacer', height: 20 }),
      createBlock({ type: 'headline', text: 'No Fluff', align: 'center', fontSize: 20, bold: true }),
      createBlock({ type: 'spacer', height: 12 }),
      createBlock({ type: 'text', text: 'Just what matters. Pure value.', align: 'center', fontSize: 14 }),
      createBlock({ type: 'spacer', height: 20 }),
      createBlock({ type: 'button', text: 'Get Started', url: 'https://example.com', align: 'center' }),
      createBlock({ type: 'spacer', height: 20 }),
      createBlock({ type: 'footer_block', companyName: '{{company_name}}' }),
    ],
    style_options: {
      show_header_logo: false,
      show_social_icons: false,
      show_footer_address: false,
      wrapper_bg: '#eff6ff',
      header_bg: '#eff6ff',
      body_bg: '#eff6ff',
      footer_bg: '#eff6ff',
      heading_color: '#1e40af',
      body_color: '#1e40af',
      heading_size: 'sm',
      link_color: '#2563eb',
      section_padding: 'compact',
      card_radius: 0,
      show_border: false,
      border_color: '#93c5fd',
    },
  },
}

const minimalistVariation4: VariationConfig = {
  index: 4,
  name: 'Premium / Editorial',
  tagline: 'Elegant minimal statement',
  defaultContent: {
    subject: 'An elegant thought',
    preheader: 'Curated for you',
    footer_text: '{{company_name}} · Curated',
    blocks: [
      createBlock({ type: 'spacer', height: 50 }),
      createBlock({ type: 'headline', text: 'Elegance', align: 'center', fontSize: 32, bold: true, textColor: '#ffffff' }),
      createBlock({ type: 'spacer', height: 12 }),
      createBlock({ type: 'text', text: 'In simplicity', align: 'center', textColor: '#d1d5db', fontSize: 18 }),
      createBlock({ type: 'spacer', height: 28 }),
      createBlock({ type: 'button', text: 'Explore', url: 'https://example.com', align: 'center', bgColor: '#c084fc', textColor: '#000000' }),
      createBlock({ type: 'spacer', height: 50 }),
      createBlock({ type: 'footer_block', companyName: '{{company_name}}' }),
    ],
    style_options: {
      show_header_logo: false,
      show_social_icons: true,
      show_footer_address: false,
      wrapper_bg: '#3f0f5c',
      header_bg: '#3f0f5c',
      body_bg: '#3f0f5c',
      footer_bg: '#2d0841',
      heading_color: '#ffffff',
      body_color: '#e9d5ff',
      heading_size: 'lg',
      link_color: '#d8b4fe',
      section_padding: 'relaxed',
      card_radius: 8,
      show_border: true,
      border_color: '#6b21a8',
    },
  },
}

const MINIMALIST_TEMPLATE: GalleryTemplate = {
  id: 'minimalist',
  label: 'Minimalist',
  description: 'Typography-led, distraction-free design',
  previewImage: null,
  variations: [minimalistVariation1, minimalistVariation2, minimalistVariation3, minimalistVariation4],
}

// ── CUSTOM TEMPLATE ───────────────────────────────────────────────────────────

const customVariation1: VariationConfig = {
  index: 1,
  name: 'Clean / Minimal',
  tagline: 'Blank canvas with logo',
  defaultContent: {
    subject: 'Subject line goes here',
    preheader: 'Preview text here',
    footer_text: '{{company_name}}',
    blocks: [
      createBlock({ type: 'logo', logoUrl: '{{brand.logo}}', align: 'center', height: 40 }),
      createBlock({ type: 'spacer', height: 32 }),
      createBlock({ type: 'headline', text: 'Your headline here', align: 'center', fontSize: 24 }),
      createBlock({ type: 'spacer', height: 12 }),
      createBlock({ type: 'text', text: 'Add your content here', align: 'center' }),
      createBlock({ type: 'spacer', height: 20 }),
      createBlock({ type: 'button', text: 'Call to action', url: 'https://example.com', align: 'center' }),
      createBlock({ type: 'spacer', height: 24 }),
      createBlock({ type: 'footer_block', companyName: '{{company_name}}' }),
    ],
    style_options: {
      show_header_logo: true,
      show_social_icons: true,
      show_footer_address: false,
      wrapper_bg: '#f9fafb',
      header_bg: '#ffffff',
      body_bg: '#ffffff',
      footer_bg: '#f3f4f6',
      heading_color: '#000000',
      body_color: '#4b5563',
      heading_size: 'md',
      link_color: '#0066cc',
      section_padding: 'normal',
      card_radius: 8,
      show_border: false,
      border_color: '#e5e7eb',
    },
  },
}

const customVariation2: VariationConfig = {
  index: 2,
  name: 'Bold / Promotional',
  tagline: 'High-impact blank canvas',
  defaultContent: {
    subject: 'Your subject here',
    preheader: 'Your preview',
    footer_text: '{{company_name}}',
    blocks: [
      createBlock({ type: 'headline', text: 'YOUR HEADLINE', align: 'center', fontSize: 40, bold: true, textColor: '#ffffff' }),
      createBlock({ type: 'spacer', height: 20 }),
      createBlock({ type: 'text', text: 'Your message goes here', align: 'center', textColor: '#e0e0e0' }),
      createBlock({ type: 'spacer', height: 24 }),
      createBlock({ type: 'button', text: 'Call to action', url: 'https://example.com', align: 'center', bgColor: '#ffffff', textColor: '#000000' }),
      createBlock({ type: 'spacer', height: 24 }),
      createBlock({ type: 'footer_block', companyName: '{{company_name}}' }),
    ],
    style_options: {
      show_header_logo: false,
      show_social_icons: false,
      show_footer_address: false,
      wrapper_bg: '#1a1a1a',
      header_bg: '#1a1a1a',
      body_bg: '#2d2d2d',
      footer_bg: '#1a1a1a',
      heading_color: '#ffffff',
      body_color: '#d1d5db',
      heading_size: 'lg',
      link_color: '#ffffff',
      section_padding: 'normal',
      card_radius: 0,
      show_border: false,
      border_color: '#444444',
    },
  },
}

const customVariation3: VariationConfig = {
  index: 3,
  name: 'Conversion Focused',
  tagline: 'Product-ready template',
  defaultContent: {
    subject: 'Check this out',
    preheader: 'Two column layout',
    footer_text: '{{company_name}}',
    blocks: [
      createBlock({ type: 'headline', text: 'Featured Items', align: 'center', fontSize: 20, bold: true }),
      createBlock({ type: 'spacer', height: 16 }),
      createBlock({
        type: 'columns',
        ratio: '1:1',
        columns: [
          [
            createBlock({ type: 'headline', text: 'Item 1', align: 'center', fontSize: 14, bold: true }),
            createBlock({ type: 'text', text: 'Description', align: 'center', fontSize: 12 }),
            createBlock({ type: 'button', text: 'Learn more', url: 'https://example.com', align: 'center' }),
          ],
          [
            createBlock({ type: 'headline', text: 'Item 2', align: 'center', fontSize: 14, bold: true }),
            createBlock({ type: 'text', text: 'Description', align: 'center', fontSize: 12 }),
            createBlock({ type: 'button', text: 'Learn more', url: 'https://example.com', align: 'center' }),
          ],
        ],
      }),
      createBlock({ type: 'spacer', height: 16 }),
      createBlock({ type: 'footer_block', companyName: '{{company_name}}' }),
    ],
    style_options: {
      show_header_logo: false,
      show_social_icons: false,
      show_footer_address: false,
      wrapper_bg: '#f0f9ff',
      header_bg: '#f0f9ff',
      body_bg: '#ffffff',
      footer_bg: '#f0f9ff',
      heading_color: '#0c4a6e',
      body_color: '#164e63',
      heading_size: 'md',
      link_color: '#0369a1',
      section_padding: 'normal',
      card_radius: 6,
      show_border: false,
      border_color: '#06b6d4',
    },
  },
}

const customVariation4: VariationConfig = {
  index: 4,
  name: 'Premium / Editorial',
  tagline: 'Sophisticated blank template',
  defaultContent: {
    subject: 'Premium message',
    preheader: 'Crafted for you',
    footer_text: '{{company_name}} · Premium',
    blocks: [
      createBlock({ type: 'headline', text: 'PREMIUM', align: 'center', fontSize: 14, bold: true, textColor: '#a78bfa' }),
      createBlock({ type: 'spacer', height: 12 }),
      createBlock({ type: 'headline', text: 'Your Message', align: 'center', fontSize: 32, bold: true, textColor: '#ffffff' }),
      createBlock({ type: 'spacer', height: 12 }),
      createBlock({ type: 'text', text: 'Crafted elegantly', align: 'center', textColor: '#d1d5db' }),
      createBlock({ type: 'spacer', height: 28 }),
      createBlock({ type: 'button', text: 'Take Action', url: 'https://example.com', align: 'center', bgColor: '#a78bfa', textColor: '#000000' }),
      createBlock({ type: 'spacer', height: 40 }),
      createBlock({ type: 'footer_block', companyName: '{{company_name}}' }),
    ],
    style_options: {
      show_header_logo: false,
      show_social_icons: true,
      show_footer_address: false,
      wrapper_bg: '#2e1065',
      header_bg: '#3b0764',
      body_bg: '#4c1d95',
      footer_bg: '#2e1065',
      heading_color: '#ffffff',
      body_color: '#e9d5ff',
      heading_size: 'lg',
      link_color: '#c4b5fd',
      section_padding: 'relaxed',
      card_radius: 12,
      show_border: true,
      border_color: '#6b21a8',
    },
  },
}

const CUSTOM_TEMPLATE: GalleryTemplate = {
  id: 'custom',
  label: 'Custom',
  description: 'Blank canvas to build your own design',
  previewImage: null,
  variations: [customVariation1, customVariation2, customVariation3, customVariation4],
}

// ── Export all templates ──────────────────────────────────────────────────────

export const GALLERY_TEMPLATES: Record<TemplateStyle, GalleryTemplate> = {
  basic: BASIC_TEMPLATE,
  newsletter: NEWSLETTER_TEMPLATE,
  announcement: ANNOUNCEMENT_TEMPLATE,
  promotional: PROMOTIONAL_TEMPLATE,
  offer: OFFER_TEMPLATE,
  minimalist: MINIMALIST_TEMPLATE,
  custom: CUSTOM_TEMPLATE,
}
