/**
 * Email template gallery definitions.
 * Each template category has 4 professional variations with pre-built block structures.
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

// ──────────────────────────────────────────────────────────────────────────────
// BASIC TEMPLATE
// ──────────────────────────────────────────────────────────────────────────────

const basicVariation1: VariationConfig = {
  index: 1,
  name: 'Clean / Minimal',
  tagline: 'Light, airy, professional spacing',
  defaultContent: {
    subject: 'A message from {{company_name}}',
    preheader: "Here's what we'd like to share with you.",
    footer_text: '{{company_name}} · All rights reserved.',
    blocks: [
      createBlock({
        type: 'logo',
        logoUrl: '{{brand.logo}}',
        align: 'center',
        height: 40,
      }),
      createBlock({
        type: 'image',
        url: '/email-images/basic-hero.jpg',
        alt: 'Message header image',
        align: 'center',
        imageWidth: '100%',
      }),
      createBlock({
        type: 'headline',
        text: "It's time to connect",
        align: 'center',
        textColor: '',
      }),
      createBlock({
        type: 'text',
        text: "Thank you for being part of our community. We're excited to share something with you today.\n\nFeel free to reach out if you have any questions.",
        align: 'center',
      }),
      createBlock({
        type: 'button',
        text: 'Get Started',
        url: 'https://example.com',
        align: 'center',
      }),
      createBlock({
        type: 'spacer',
        height: 20,
      }),
      createBlock({
        type: 'footer_block',
        companyName: '{{company_name}}',
      }),
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
      section_padding: 'normal',
      card_radius: 8,
      show_border: false,
      border_color: '#e5e7eb',
    },
  },
}

const basicVariation2: VariationConfig = {
  index: 2,
  name: 'Bold / Promotional',
  tagline: 'High-impact, brand-forward design',
  defaultContent: {
    subject: 'A message from {{company_name}}',
    preheader: "Here's what we'd like to share with you.",
    footer_text: '{{company_name}} · All rights reserved.',
    blocks: [
      createBlock({
        type: 'headline',
        text: "It's time to connect",
        align: 'center',
        fontSize: 40,
        bold: true,
        textColor: '#ffffff',
      }),
      createBlock({
        type: 'text',
        text: "Thank you for being part of our community. We're excited to share something with you today.",
        align: 'center',
        textColor: '#ffffff',
      }),
      createBlock({
        type: 'button',
        text: 'Get Started',
        url: 'https://example.com',
        align: 'center',
        bgColor: '#ffffff',
        textColor: '#000000',
      }),
      createBlock({
        type: 'spacer',
        height: 40,
      }),
      createBlock({
        type: 'footer_block',
        companyName: '{{company_name}}',
      }),
    ],
    style_options: {
      show_header_logo: false,
      show_social_icons: false,
      show_footer_address: false,
      wrapper_bg: '#000000',
      header_bg: '#000000',
      body_bg: '#1a1a1a',
      footer_bg: '#000000',
      heading_color: '#ffffff',
      body_color: '#e0e0e0',
      heading_size: 'lg',
      link_color: '#ffffff',
      section_padding: 'relaxed',
      card_radius: 0,
      show_border: false,
      border_color: '#333333',
    },
  },
}

const basicVariation3: VariationConfig = {
  index: 3,
  name: 'Conversion Focused',
  tagline: 'Compact, action-driven layout',
  defaultContent: {
    subject: 'A message from {{company_name}}',
    preheader: "Here's what we'd like to share with you.",
    footer_text: '{{company_name}}',
    blocks: [
      createBlock({
        type: 'logo',
        logoUrl: '{{brand.logo}}',
        align: 'left',
        height: 32,
      }),
      createBlock({
        type: 'spacer',
        height: 12,
      }),
      createBlock({
        type: 'headline',
        text: "It's time to connect",
        align: 'left',
        fontSize: 22,
        bold: true,
      }),
      createBlock({
        type: 'text',
        text: "We've got something valuable for you. Take a quick action and see the difference.",
        align: 'left',
      }),
      createBlock({
        type: 'button',
        text: 'Claim Access',
        url: 'https://example.com',
        align: 'left',
      }),
    ],
    style_options: {
      show_header_logo: true,
      show_social_icons: false,
      show_footer_address: false,
      wrapper_bg: '#f0f9ff',
      header_bg: '#f0f9ff',
      body_bg: '#f0f9ff',
      footer_bg: '#f0f9ff',
      heading_color: '#0c4a6e',
      body_color: '#0c4a6e',
      heading_size: 'sm',
      link_color: '#0369a1',
      section_padding: 'compact',
      card_radius: 0,
      show_border: true,
      border_color: '#0369a1',
    },
  },
}

const basicVariation4: VariationConfig = {
  index: 4,
  name: 'Premium / Editorial',
  tagline: 'Dark, sophisticated aesthetic',
  defaultContent: {
    subject: 'A message from {{company_name}}',
    preheader: "Here's what we'd like to share with you.",
    footer_text: '{{company_name}} · Crafted with care',
    blocks: [
      createBlock({
        type: 'logo',
        logoUrl: '{{brand.logo}}',
        align: 'center',
        height: 45,
      }),
      createBlock({
        type: 'image',
        url: '/email-images/basic-hero.jpg',
        alt: 'Hero',
        align: 'center',
        imageWidth: '100%',
      }),
      createBlock({
        type: 'headline',
        text: "It's time to connect",
        align: 'center',
        textColor: '#ffffff',
        fontSize: 32,
        bold: true,
      }),
      createBlock({
        type: 'text',
        text: "Thank you for being part of our community. We're excited to share something with you today.",
        align: 'center',
        textColor: '#e5e7eb',
      }),
      createBlock({
        type: 'button',
        text: 'Get Started',
        url: 'https://example.com',
        align: 'center',
      }),
      createBlock({
        type: 'footer_block',
        companyName: '{{company_name}}',
      }),
    ],
    style_options: {
      show_header_logo: true,
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
      card_radius: 16,
      show_border: true,
      border_color: '#374151',
    },
  },
}

// ──────────────────────────────────────────────────────────────────────────────
// NEWSLETTER TEMPLATE
// ──────────────────────────────────────────────────────────────────────────────

const newsletterVariation1: VariationConfig = {
  index: 1,
  name: 'Clean / Minimal',
  tagline: 'Professional digest layout',
  defaultContent: {
    subject: '{{company_name}} Newsletter — {{month}}',
    preheader: 'Your monthly update is here.',
    footer_text: '{{company_name}} · Unsubscribe',
    blocks: [
      createBlock({
        type: 'logo',
        logoUrl: '{{brand.logo}}',
        align: 'center',
        height: 40,
      }),
      createBlock({
        type: 'image',
        url: '/email-images/newsletter-hero.jpg',
        alt: 'Newsletter header',
        align: 'center',
        imageWidth: '100%',
      }),
      createBlock({
        type: 'headline',
        text: "What's new this month",
        align: 'center',
      }),
      createBlock({
        type: 'text',
        text: "Here's a roundup of everything that happened this month — updates, insights, and what's coming next.",
        align: 'center',
      }),
      createBlock({
        type: 'divider',
      }),
      createBlock({
        type: 'columns',
        ratio: '1:1:1',
        columns: [
          [
            createBlock({
              type: 'headline',
              text: 'Article One',
              fontSize: 18,
            }),
            createBlock({
              type: 'text',
              text: 'A brief summary of the first article or update goes here.',
            }),
          ],
          [
            createBlock({
              type: 'headline',
              text: 'Article Two',
              fontSize: 18,
            }),
            createBlock({
              type: 'text',
              text: 'Key takeaways from the second piece of content.',
            }),
          ],
          [
            createBlock({
              type: 'headline',
              text: 'Article Three',
              fontSize: 18,
            }),
            createBlock({
              type: 'text',
              text: "The highlights from this month's third feature.",
            }),
          ],
        ],
      }),
      createBlock({
        type: 'button',
        text: 'Read More',
        url: 'https://example.com',
        align: 'center',
      }),
      createBlock({
        type: 'footer_block',
        companyName: '{{company_name}}',
      }),
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
  tagline: 'Eye-catching, vibrant digest',
  defaultContent: {
    subject: '{{company_name}} Newsletter — {{month}}',
    preheader: 'Your monthly update is here.',
    footer_text: '{{company_name}} · Unsubscribe',
    blocks: [
      createBlock({
        type: 'logo',
        logoUrl: '{{brand.logo}}',
        align: 'center',
        height: 45,
      }),
      createBlock({
        type: 'image',
        url: '/email-images/newsletter-hero.jpg',
        alt: 'Newsletter hero',
        align: 'center',
        imageWidth: '100%',
      }),
      createBlock({
        type: 'headline',
        text: "What's new this month",
        align: 'center',
        fontSize: 32,
        bold: true,
      }),
      createBlock({
        type: 'columns',
        ratio: '1:1:1',
        columns: [
          [
            createBlock({
              type: 'headline',
              text: 'Article One',
              fontSize: 20,
              bold: true,
            }),
            createBlock({
              type: 'text',
              text: 'A brief summary of the first article or update goes here.',
            }),
            createBlock({
              type: 'button',
              text: 'Read →',
              url: 'https://example.com',
              align: 'center',
              fontSize: 14,
            }),
          ],
          [
            createBlock({
              type: 'headline',
              text: 'Article Two',
              fontSize: 20,
              bold: true,
            }),
            createBlock({
              type: 'text',
              text: 'Key takeaways from the second piece of content.',
            }),
            createBlock({
              type: 'button',
              text: 'Read →',
              url: 'https://example.com',
              align: 'center',
              fontSize: 14,
            }),
          ],
          [
            createBlock({
              type: 'headline',
              text: 'Article Three',
              fontSize: 20,
              bold: true,
            }),
            createBlock({
              type: 'text',
              text: "The highlights from this month's third feature.",
            }),
            createBlock({
              type: 'button',
              text: 'Read →',
              url: 'https://example.com',
              align: 'center',
              fontSize: 14,
            }),
          ],
        ],
      }),
      createBlock({
        type: 'footer_block',
        companyName: '{{company_name}}',
      }),
    ],
    style_options: {
      show_header_logo: true,
      show_social_icons: true,
      show_footer_address: false,
      wrapper_bg: '#ffffff',
      header_bg: '',
      body_bg: '#ffffff',
      footer_bg: '#f3f4f6',
      heading_color: '',
      body_color: '#1f2937',
      heading_size: 'lg',
      link_color: '',
      section_padding: 'normal',
      card_radius: 12,
      show_border: false,
      border_color: '#e5e7eb',
    },
  },
}

const newsletterVariation3: VariationConfig = {
  index: 3,
  name: 'Conversion Focused',
  tagline: 'Compact, scannable digest',
  defaultContent: {
    subject: '{{company_name}} Newsletter — {{month}}',
    preheader: 'Your monthly update is here.',
    footer_text: '{{company_name}}',
    blocks: [
      createBlock({
        type: 'logo',
        logoUrl: '{{brand.logo}}',
        align: 'left',
        height: 35,
      }),
      createBlock({
        type: 'image',
        url: '/email-images/newsletter-hero.jpg',
        alt: 'Newsletter',
        align: 'center',
        imageWidth: '100%',
      }),
      createBlock({
        type: 'headline',
        text: "What's new this month",
        align: 'left',
        fontSize: 26,
      }),
      createBlock({
        type: 'columns',
        ratio: '1:1:1',
        columns: [
          [
            createBlock({
              type: 'text',
              text: 'Article One\nQuick summary here.',
            }),
          ],
          [
            createBlock({
              type: 'text',
              text: 'Article Two\nKey points summarized.',
            }),
          ],
          [
            createBlock({
              type: 'text',
              text: 'Article Three\nTop takeaways listed.',
            }),
          ],
        ],
      }),
      createBlock({
        type: 'button',
        text: 'View All →',
        url: 'https://example.com',
        align: 'center',
      }),
      createBlock({
        type: 'footer_block',
        companyName: '{{company_name}}',
      }),
    ],
    style_options: {
      show_header_logo: true,
      show_social_icons: false,
      show_footer_address: false,
      wrapper_bg: '#ffffff',
      header_bg: '#ffffff',
      body_bg: '#ffffff',
      footer_bg: '#f9fafb',
      heading_color: '#000000',
      body_color: '#374151',
      heading_size: 'md',
      link_color: '#0066cc',
      section_padding: 'compact',
      card_radius: 4,
      show_border: false,
      border_color: '#e5e7eb',
    },
  },
}

const newsletterVariation4: VariationConfig = {
  index: 4,
  name: 'Premium / Editorial',
  tagline: 'Sophisticated digest design',
  defaultContent: {
    subject: '{{company_name}} Newsletter — {{month}}',
    preheader: 'Your monthly update is here.',
    footer_text: '{{company_name}} · Curated for you',
    blocks: [
      createBlock({
        type: 'logo',
        logoUrl: '{{brand.logo}}',
        align: 'center',
        height: 45,
      }),
      createBlock({
        type: 'image',
        url: '/email-images/newsletter-hero.jpg',
        alt: 'Newsletter',
        align: 'center',
        imageWidth: '100%',
      }),
      createBlock({
        type: 'headline',
        text: "What's new this month",
        align: 'center',
        textColor: '#ffffff',
        fontSize: 32,
        bold: true,
      }),
      createBlock({
        type: 'columns',
        ratio: '1:1:1',
        columns: [
          [
            createBlock({
              type: 'headline',
              text: 'Featured Story',
              fontSize: 18,
              textColor: '#ffffff',
            }),
            createBlock({
              type: 'text',
              text: "In-depth coverage of this month's featured topic.",
              textColor: '#e5e7eb',
            }),
          ],
          [
            createBlock({
              type: 'headline',
              text: 'Industry Update',
              fontSize: 18,
              textColor: '#ffffff',
            }),
            createBlock({
              type: 'text',
              text: 'What changed in the industry this month.',
              textColor: '#e5e7eb',
            }),
          ],
          [
            createBlock({
              type: 'headline',
              text: 'Coming Soon',
              fontSize: 18,
              textColor: '#ffffff',
            }),
            createBlock({
              type: 'text',
              text: "Sneak peek at next month's content.",              textColor: '#e5e7eb',
            }),
          ],
        ],
      }),
      createBlock({
        type: 'footer_block',
        companyName: '{{company_name}}',
      }),
    ],
    style_options: {
      show_header_logo: true,
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
      card_radius: 16,
      show_border: true,
      border_color: '#374151',
    },
  },
}

// ──────────────────────────────────────────────────────────────────────────────
// ANNOUNCEMENT TEMPLATE
// ──────────────────────────────────────────────────────────────────────────────

const announcementVariation1: VariationConfig = {
  index: 1,
  name: 'Clean / Minimal',
  tagline: 'Simple, clear announcement',
  defaultContent: {
    subject: 'Important announcement from {{company_name}}',
    preheader: "You won't want to miss this.",
    footer_text: '{{company_name}} · All rights reserved.',
    blocks: [
      createBlock({
        type: 'logo',
        logoUrl: '{{brand.logo}}',
        align: 'center',
        height: 40,
      }),
      createBlock({
        type: 'image',
        url: '/email-images/announcement-hero.jpg',
        alt: 'Announcement banner',
        align: 'center',
        imageWidth: '100%',
      }),
      createBlock({
        type: 'headline',
        text: 'We have an announcement',
        align: 'center',
        fontSize: 32,
      }),
      createBlock({
        type: 'text',
        text: "Something important has changed. Here's what you need to know and how it affects you.",        align: 'center',
      }),
      createBlock({
        type: 'button',
        text: 'Learn More',
        url: 'https://example.com',
        align: 'center',
      }),
      createBlock({
        type: 'footer_block',
        companyName: '{{company_name}}',
      }),
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
      heading_size: 'lg',
      link_color: '#0066cc',
      section_padding: 'normal',
      card_radius: 8,
      show_border: false,
      border_color: '#e5e7eb',
    },
  },
}

const announcementVariation2: VariationConfig = {
  index: 2,
  name: 'Bold / Promotional',
  tagline: 'Eye-catching announcement',
  defaultContent: {
    subject: 'Important announcement from {{company_name}}',
    preheader: "You won't want to miss this.",
    footer_text: '{{company_name}} · All rights reserved.',
    blocks: [
      createBlock({
        type: 'logo',
        logoUrl: '{{brand.logo}}',
        align: 'center',
        height: 50,
      }),
      createBlock({
        type: 'image',
        url: '/email-images/announcement-hero.jpg',
        alt: 'Announcement',
        align: 'center',
        imageWidth: '100%',
      }),
      createBlock({
        type: 'headline',
        text: 'We have an announcement',
        align: 'center',
        fontSize: 36,
        bold: true,
      }),
      createBlock({
        type: 'text',
        text: 'Something important has changed and we wanted you to be among the first to know.',
        align: 'center',
      }),
      createBlock({
        type: 'button',
        text: 'See What Changed',
        url: 'https://example.com',
        align: 'center',
        bgColor: '',
      }),
      createBlock({
        type: 'footer_block',
        companyName: '{{company_name}}',
      }),
    ],
    style_options: {
      show_header_logo: true,
      show_social_icons: false,
      show_footer_address: false,
      wrapper_bg: '#ffffff',
      header_bg: '',
      body_bg: '#ffffff',
      footer_bg: '#f3f4f6',
      heading_color: '',
      body_color: '#1f2937',
      heading_size: 'lg',
      link_color: '',
      section_padding: 'relaxed',
      card_radius: 12,
      show_border: false,
      border_color: '#e5e7eb',
    },
  },
}

const announcementVariation3: VariationConfig = {
  index: 3,
  name: 'Conversion Focused',
  tagline: 'Direct, action-focused announcement',
  defaultContent: {
    subject: 'Important announcement from {{company_name}}',
    preheader: "You won't want to miss this.",
    footer_text: '{{company_name}}',
    blocks: [
      createBlock({
        type: 'logo',
        logoUrl: '{{brand.logo}}',
        align: 'left',
        height: 35,
      }),
      createBlock({
        type: 'image',
        url: '/email-images/announcement-hero.jpg',
        alt: 'Announcement',
        align: 'center',
        imageWidth: '100%',
      }),
      createBlock({
        type: 'headline',
        text: 'We have an announcement',
        align: 'left',
        fontSize: 28,
      }),
      createBlock({
        type: 'text',
        text: "Important change coming your way. Here's what happens next and what you should do.",        align: 'left',
      }),
      createBlock({
        type: 'button',
        text: 'Get The Details →',
        url: 'https://example.com',
        align: 'left',
      }),
      createBlock({
        type: 'footer_block',
        companyName: '{{company_name}}',
      }),
    ],
    style_options: {
      show_header_logo: true,
      show_social_icons: false,
      show_footer_address: false,
      wrapper_bg: '#ffffff',
      header_bg: '#ffffff',
      body_bg: '#ffffff',
      footer_bg: '#f9fafb',
      heading_color: '#000000',
      body_color: '#374151',
      heading_size: 'md',
      link_color: '#0066cc',
      section_padding: 'compact',
      card_radius: 4,
      show_border: false,
      border_color: '#e5e7eb',
    },
  },
}

const announcementVariation4: VariationConfig = {
  index: 4,
  name: 'Premium / Editorial',
  tagline: 'Elegant, sophisticated announcement',
  defaultContent: {
    subject: 'Important announcement from {{company_name}}',
    preheader: "You won't want to miss this.",
    footer_text: '{{company_name}} · Important notice',
    blocks: [
      createBlock({
        type: 'logo',
        logoUrl: '{{brand.logo}}',
        align: 'center',
        height: 45,
      }),
      createBlock({
        type: 'image',
        url: '/email-images/announcement-hero.jpg',
        alt: 'Announcement',
        align: 'center',
        imageWidth: '100%',
      }),
      createBlock({
        type: 'headline',
        text: 'We have an announcement',
        align: 'center',
        textColor: '#ffffff',
        fontSize: 36,
        bold: true,
      }),
      createBlock({
        type: 'text',
        text: "An important change is coming. We're committed to making the transition smooth for you.",        align: 'center',
        textColor: '#e5e7eb',
      }),
      createBlock({
        type: 'button',
        text: 'Learn More',
        url: 'https://example.com',
        align: 'center',
      }),
      createBlock({
        type: 'footer_block',
        companyName: '{{company_name}}',
      }),
    ],
    style_options: {
      show_header_logo: true,
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
      card_radius: 16,
      show_border: true,
      border_color: '#374151',
    },
  },
}

// ──────────────────────────────────────────────────────────────────────────────
// PROMOTIONAL TEMPLATE
// ──────────────────────────────────────────────────────────────────────────────

const promotionalVariation1: VariationConfig = {
  index: 1,
  name: 'Clean / Minimal',
  tagline: 'Professional product showcase',
  defaultContent: {
    subject: 'Something exciting from {{company_name}}',
    preheader: "You won't want to miss this.",
    footer_text: '{{company_name}} · All rights reserved.',
    blocks: [
      createBlock({
        type: 'logo',
        logoUrl: '{{brand.logo}}',
        align: 'center',
        height: 40,
      }),
      createBlock({
        type: 'image',
        url: '/email-images/product-1.jpg',
        alt: 'Featured product',
        align: 'center',
        imageWidth: '100%',
      }),
      createBlock({
        type: 'headline',
        text: "We've got something for you",
        align: 'center',
      }),
      createBlock({
        type: 'text',
        text: "We've been working on something special and we're excited to share it with you. Here's why you'll love it.",
        align: 'center',
      }),
      createBlock({
        type: 'button',
        text: 'Check It Out',
        url: 'https://example.com',
        align: 'center',
      }),
      createBlock({
        type: 'footer_block',
        companyName: '{{company_name}}',
      }),
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
  tagline: 'High-impact brand showcase',
  defaultContent: {
    subject: 'Something exciting from {{company_name}}',
    preheader: "You won't want to miss this.",
    footer_text: '{{company_name}} · All rights reserved.',
    blocks: [
      createBlock({
        type: 'logo',
        logoUrl: '{{brand.logo}}',
        align: 'center',
        height: 50,
      }),
      createBlock({
        type: 'image',
        url: '/email-images/product-4.jpg',
        alt: 'Featured product',
        align: 'center',
        imageWidth: '100%',
      }),
      createBlock({
        type: 'headline',
        text: "We've got something for you",
        align: 'center',
        fontSize: 34,
        bold: true,
      }),
      createBlock({
        type: 'text',
        text: "Something special is here. We're excited to share it with you and see what you think.",
        align: 'center',
      }),
      createBlock({
        type: 'button',
        text: 'Explore Now',
        url: 'https://example.com',
        align: 'center',
        bgColor: '',
      }),
      createBlock({
        type: 'footer_block',
        companyName: '{{company_name}}',
      }),
    ],
    style_options: {
      show_header_logo: true,
      show_social_icons: true,
      show_footer_address: false,
      wrapper_bg: '#ffffff',
      header_bg: '',
      body_bg: '#ffffff',
      footer_bg: '#f3f4f6',
      heading_color: '',
      body_color: '#1f2937',
      heading_size: 'lg',
      link_color: '',
      section_padding: 'normal',
      card_radius: 12,
      show_border: false,
      border_color: '#e5e7eb',
    },
  },
}

const promotionalVariation3: VariationConfig = {
  index: 3,
  name: 'Conversion Focused',
  tagline: 'Direct, action-oriented promotion',
  defaultContent: {
    subject: 'Something exciting from {{company_name}}',
    preheader: "You won't want to miss this.",
    footer_text: '{{company_name}}',
    blocks: [
      createBlock({
        type: 'logo',
        logoUrl: '{{brand.logo}}',
        align: 'left',
        height: 35,
      }),
      createBlock({
        type: 'image',
        url: '/email-images/product-1.jpg',
        alt: 'Product',
        align: 'center',
        imageWidth: '100%',
      }),
      createBlock({
        type: 'headline',
        text: "We've got something for you",
        align: 'left',
        fontSize: 28,
      }),
      createBlock({
        type: 'text',
        text: "Here's what makes it special. Ready to try it?",        align: 'left',
      }),
      createBlock({
        type: 'button',
        text: 'See What Changed →',
        url: 'https://example.com',
        align: 'left',
      }),
      createBlock({
        type: 'footer_block',
        companyName: '{{company_name}}',
      }),
    ],
    style_options: {
      show_header_logo: true,
      show_social_icons: false,
      show_footer_address: false,
      wrapper_bg: '#ffffff',
      header_bg: '#ffffff',
      body_bg: '#ffffff',
      footer_bg: '#f9fafb',
      heading_color: '#000000',
      body_color: '#374151',
      heading_size: 'md',
      link_color: '#0066cc',
      section_padding: 'compact',
      card_radius: 4,
      show_border: false,
      border_color: '#e5e7eb',
    },
  },
}

const promotionalVariation4: VariationConfig = {
  index: 4,
  name: 'Premium / Editorial',
  tagline: 'Sophisticated product showcase',
  defaultContent: {
    subject: 'Something exciting from {{company_name}}',
    preheader: "You won't want to miss this.",
    footer_text: '{{company_name}} · Exclusively for you',
    blocks: [
      createBlock({
        type: 'logo',
        logoUrl: '{{brand.logo}}',
        align: 'center',
        height: 45,
      }),
      createBlock({
        type: 'image',
        url: '/email-images/product-4.jpg',
        alt: 'Premium product',
        align: 'center',
        imageWidth: '100%',
      }),
      createBlock({
        type: 'headline',
        text: "We've got something for you",
        align: 'center',
        textColor: '#ffffff',
        fontSize: 32,
        bold: true,
      }),
      createBlock({
        type: 'text',
        text: 'Crafted with precision. Designed for you. Ready when you are.',
        align: 'center',
        textColor: '#e5e7eb',
      }),
      createBlock({
        type: 'button',
        text: 'Discover It',
        url: 'https://example.com',
        align: 'center',
      }),
      createBlock({
        type: 'footer_block',
        companyName: '{{company_name}}',
      }),
    ],
    style_options: {
      show_header_logo: true,
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
      card_radius: 16,
      show_border: true,
      border_color: '#374151',
    },
  },
}

// ──────────────────────────────────────────────────────────────────────────────
// OFFER TEMPLATE
// ──────────────────────────────────────────────────────────────────────────────

const offerVariation1: VariationConfig = {
  index: 1,
  name: 'Clean / Minimal',
  tagline: 'Simple, clear offer presentation',
  defaultContent: {
    subject: 'Limited time: exclusive offer inside',
    preheader: 'Act now — this offer expires soon.',
    footer_text: '{{company_name}} · Unsubscribe',
    blocks: [
      createBlock({
        type: 'logo',
        logoUrl: '{{brand.logo}}',
        align: 'center',
        height: 40,
      }),
      createBlock({
        type: 'image',
        url: '/email-images/offer-hero.jpg',
        alt: 'Special offer',
        align: 'center',
        imageWidth: '100%',
      }),
      createBlock({
        type: 'headline',
        text: 'Your exclusive offer',
        align: 'center',
        fontSize: 32,
      }),
      createBlock({
        type: 'text',
        text: "For a limited time, we're offering something exclusive to our valued members. Don't let this pass.",        align: 'center',
      }),
      createBlock({
        type: 'button',
        text: 'Claim Offer',
        url: 'https://example.com',
        align: 'center',
      }),
      createBlock({
        type: 'text',
        text: 'Offer expires in 48 hours.',
        align: 'center',
        fontSize: 12,
        textColor: '#6b7280',
      }),
      createBlock({
        type: 'footer_block',
        companyName: '{{company_name}}',
      }),
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
      heading_size: 'lg',
      link_color: '#0066cc',
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
  tagline: 'High-impact deal promotion',
  defaultContent: {
    subject: 'Limited time: exclusive offer inside',
    preheader: 'Act now — this offer expires soon.',
    footer_text: '{{company_name}} · Unsubscribe',
    blocks: [
      createBlock({
        type: 'logo',
        logoUrl: '{{brand.logo}}',
        align: 'center',
        height: 50,
      }),
      createBlock({
        type: 'image',
        url: '/email-images/offer-hero.jpg',
        alt: 'Special offer',
        align: 'center',
        imageWidth: '100%',
      }),
      createBlock({
        type: 'headline',
        text: 'Your exclusive offer',
        align: 'center',
        fontSize: 40,
        bold: true,
      }),
      createBlock({
        type: 'text',
        text: 'Limited time only. Act now to claim your exclusive discount.',
        align: 'center',
      }),
      createBlock({
        type: 'button',
        text: 'Claim Your Deal',
        url: 'https://example.com',
        align: 'center',
        bgColor: '',
      }),
      createBlock({
        type: 'text',
        text: 'Expires in 48 hours',
        align: 'center',
        fontSize: 14,
        bold: true,
      }),
      createBlock({
        type: 'footer_block',
        companyName: '{{company_name}}',
      }),
    ],
    style_options: {
      show_header_logo: true,
      show_social_icons: false,
      show_footer_address: false,
      wrapper_bg: '#ffffff',
      header_bg: '',
      body_bg: '#ffffff',
      footer_bg: '#f3f4f6',
      heading_color: '',
      body_color: '#1f2937',
      heading_size: 'lg',
      link_color: '',
      section_padding: 'relaxed',
      card_radius: 12,
      show_border: false,
      border_color: '#e5e7eb',
    },
  },
}

const offerVariation3: VariationConfig = {
  index: 3,
  name: 'Conversion Focused',
  tagline: 'Urgent, action-driven offer',
  defaultContent: {
    subject: 'Limited time: exclusive offer inside',
    preheader: 'Act now — this offer expires soon.',
    footer_text: '{{company_name}}',
    blocks: [
      createBlock({
        type: 'logo',
        logoUrl: '{{brand.logo}}',
        align: 'left',
        height: 35,
      }),
      createBlock({
        type: 'image',
        url: '/email-images/offer-hero.jpg',
        alt: 'Offer',
        align: 'center',
        imageWidth: '100%',
      }),
      createBlock({
        type: 'headline',
        text: 'Your exclusive offer',
        align: 'left',
        fontSize: 28,
      }),
      createBlock({
        type: 'text',
        text: 'Limited time. Expires in 48 hours. Claim your offer now.',
        align: 'left',
      }),
      createBlock({
        type: 'button',
        text: 'Get My Discount →',
        url: 'https://example.com',
        align: 'left',
      }),
      createBlock({
        type: 'footer_block',
        companyName: '{{company_name}}',
      }),
    ],
    style_options: {
      show_header_logo: true,
      show_social_icons: false,
      show_footer_address: false,
      wrapper_bg: '#ffffff',
      header_bg: '#ffffff',
      body_bg: '#ffffff',
      footer_bg: '#f9fafb',
      heading_color: '#000000',
      body_color: '#374151',
      heading_size: 'md',
      link_color: '#0066cc',
      section_padding: 'compact',
      card_radius: 4,
      show_border: false,
      border_color: '#e5e7eb',
    },
  },
}

const offerVariation4: VariationConfig = {
  index: 4,
  name: 'Premium / Editorial',
  tagline: 'Elegant deal presentation',
  defaultContent: {
    subject: 'Limited time: exclusive offer inside',
    preheader: 'Act now — this offer expires soon.',
    footer_text: '{{company_name}} · Exclusive offer',
    blocks: [
      createBlock({
        type: 'logo',
        logoUrl: '{{brand.logo}}',
        align: 'center',
        height: 45,
      }),
      createBlock({
        type: 'image',
        url: '/email-images/offer-hero.jpg',
        alt: 'Exclusive offer',
        align: 'center',
        imageWidth: '100%',
      }),
      createBlock({
        type: 'headline',
        text: 'Your exclusive offer',
        align: 'center',
        textColor: '#ffffff',
        fontSize: 36,
        bold: true,
      }),
      createBlock({
        type: 'text',
        text: 'For our most valued members. Limited availability. Expires in 48 hours.',
        align: 'center',
        textColor: '#e5e7eb',
      }),
      createBlock({
        type: 'button',
        text: 'Claim This Offer',
        url: 'https://example.com',
        align: 'center',
      }),
      createBlock({
        type: 'footer_block',
        companyName: '{{company_name}}',
      }),
    ],
    style_options: {
      show_header_logo: true,
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
      card_radius: 16,
      show_border: true,
      border_color: '#374151',
    },
  },
}

// ──────────────────────────────────────────────────────────────────────────────
// MINIMALIST TEMPLATE
// ──────────────────────────────────────────────────────────────────────────────

const minimalistVariation1: VariationConfig = {
  index: 1,
  name: 'Clean / Minimal',
  tagline: 'Typography-led, spacious design',
  defaultContent: {
    subject: 'A quick note from {{company_name}}',
    preheader: 'Less is more — read on.',
    footer_text: '{{company_name}} · Unsubscribe',
    blocks: [
      createBlock({
        type: 'logo',
        logoUrl: '{{brand.logo}}',
        align: 'center',
        height: 40,
      }),
      createBlock({
        type: 'spacer',
        height: 30,
      }),
      createBlock({
        type: 'headline',
        text: 'Keep it simple.',
        align: 'center',
        fontSize: 32,
      }),
      createBlock({
        type: 'spacer',
        height: 20,
      }),
      createBlock({
        type: 'text',
        text: "We believe great communication starts with clarity. Here's what you need to know.",        align: 'center',
      }),
      createBlock({
        type: 'spacer',
        height: 30,
      }),
      createBlock({
        type: 'button',
        text: 'Learn More',
        url: 'https://example.com',
        align: 'center',
      }),
      createBlock({
        type: 'spacer',
        height: 40,
      }),
      createBlock({
        type: 'footer_block',
        companyName: '{{company_name}}',
      }),
    ],
    style_options: {
      show_header_logo: true,
      show_social_icons: true,
      show_footer_address: false,
      wrapper_bg: '#f9fafb',
      header_bg: '#ffffff',
      body_bg: '#ffffff',
      footer_bg: '#ffffff',
      heading_color: '#000000',
      body_color: '#4b5563',
      heading_size: 'lg',
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
  tagline: 'Strong typography, premium feel',
  defaultContent: {
    subject: 'A quick note from {{company_name}}',
    preheader: 'Less is more — read on.',
    footer_text: '{{company_name}} · Unsubscribe',
    blocks: [
      createBlock({
        type: 'logo',
        logoUrl: '{{brand.logo}}',
        align: 'center',
        height: 45,
      }),
      createBlock({
        type: 'spacer',
        height: 40,
      }),
      createBlock({
        type: 'headline',
        text: 'Keep it simple.',
        align: 'center',
        fontSize: 36,
        bold: true,
      }),
      createBlock({
        type: 'spacer',
        height: 24,
      }),
      createBlock({
        type: 'text',
        text: "We believe great communication starts with clarity. Here's what you need to know.",        align: 'center',
      }),
      createBlock({
        type: 'spacer',
        height: 32,
      }),
      createBlock({
        type: 'button',
        text: 'Explore',
        url: 'https://example.com',
        align: 'center',
        bgColor: '',
      }),
      createBlock({
        type: 'spacer',
        height: 50,
      }),
      createBlock({
        type: 'footer_block',
        companyName: '{{company_name}}',
      }),
    ],
    style_options: {
      show_header_logo: true,
      show_social_icons: false,
      show_footer_address: false,
      wrapper_bg: '#ffffff',
      header_bg: '#ffffff',
      body_bg: '#ffffff',
      footer_bg: '#ffffff',
      heading_color: '',
      body_color: '#1f2937',
      heading_size: 'lg',
      link_color: '',
      section_padding: 'relaxed',
      card_radius: 0,
      show_border: false,
      border_color: '#e5e7eb',
    },
  },
}

const minimalistVariation3: VariationConfig = {
  index: 3,
  name: 'Conversion Focused',
  tagline: 'Direct, scannable layout',
  defaultContent: {
    subject: 'A quick note from {{company_name}}',
    preheader: 'Less is more — read on.',
    footer_text: '{{company_name}}',
    blocks: [
      createBlock({
        type: 'logo',
        logoUrl: '{{brand.logo}}',
        align: 'center',
        height: 35,
      }),
      createBlock({
        type: 'spacer',
        height: 20,
      }),
      createBlock({
        type: 'headline',
        text: 'Keep it simple.',
        align: 'center',
        fontSize: 28,
      }),
      createBlock({
        type: 'spacer',
        height: 16,
      }),
      createBlock({
        type: 'text',
        text: "We believe great communication starts with clarity. Here's what you need to know.",        align: 'center',
      }),
      createBlock({
        type: 'spacer',
        height: 24,
      }),
      createBlock({
        type: 'button',
        text: 'Get Started →',
        url: 'https://example.com',
        align: 'center',
      }),
      createBlock({
        type: 'spacer',
        height: 30,
      }),
      createBlock({
        type: 'footer_block',
        companyName: '{{company_name}}',
      }),
    ],
    style_options: {
      show_header_logo: true,
      show_social_icons: false,
      show_footer_address: false,
      wrapper_bg: '#ffffff',
      header_bg: '#ffffff',
      body_bg: '#ffffff',
      footer_bg: '#ffffff',
      heading_color: '#000000',
      body_color: '#374151',
      heading_size: 'md',
      link_color: '#0066cc',
      section_padding: 'normal',
      card_radius: 0,
      show_border: false,
      border_color: '#e5e7eb',
    },
  },
}

const minimalistVariation4: VariationConfig = {
  index: 4,
  name: 'Premium / Editorial',
  tagline: 'Sophisticated, elegant layout',
  defaultContent: {
    subject: 'A quick note from {{company_name}}',
    preheader: 'Less is more — read on.',
    footer_text: '{{company_name}}',
    blocks: [
      createBlock({
        type: 'logo',
        logoUrl: '{{brand.logo}}',
        align: 'center',
        height: 45,
      }),
      createBlock({
        type: 'spacer',
        height: 50,
      }),
      createBlock({
        type: 'headline',
        text: 'Keep it simple.',
        align: 'center',
        textColor: '#ffffff',
        fontSize: 36,
        bold: true,
      }),
      createBlock({
        type: 'spacer',
        height: 32,
      }),
      createBlock({
        type: 'text',
        text: "We believe great communication starts with clarity. Here's what you need to know.",        align: 'center',
        textColor: '#e5e7eb',
      }),
      createBlock({
        type: 'spacer',
        height: 40,
      }),
      createBlock({
        type: 'button',
        text: 'Read More',
        url: 'https://example.com',
        align: 'center',
      }),
      createBlock({
        type: 'spacer',
        height: 60,
      }),
      createBlock({
        type: 'footer_block',
        companyName: '{{company_name}}',
      }),
    ],
    style_options: {
      show_header_logo: true,
      show_social_icons: true,
      show_footer_address: false,
      wrapper_bg: '#111827',
      header_bg: '#111827',
      body_bg: '#111827',
      footer_bg: '#111827',
      heading_color: '#ffffff',
      body_color: '#d1d5db',
      heading_size: 'lg',
      link_color: '#60a5fa',
      section_padding: 'relaxed',
      card_radius: 0,
      show_border: false,
      border_color: '#374151',
    },
  },
}

// ──────────────────────────────────────────────────────────────────────────────
// CUSTOM TEMPLATE
// ──────────────────────────────────────────────────────────────────────────────

const customVariation1: VariationConfig = {
  index: 1,
  name: 'Clean / Minimal',
  tagline: 'Start with clean slate',
  defaultContent: {
    subject: 'Your email subject line',
    preheader: 'Your email preview text',
    footer_text: '{{company_name}}',
    blocks: [
      createBlock({
        type: 'logo',
        logoUrl: '{{brand.logo}}',
        align: 'center',
        height: 40,
      }),
      createBlock({
        type: 'spacer',
        height: 30,
      }),
      createBlock({
        type: 'headline',
        text: 'Your main headline goes here',
        align: 'center',
      }),
      createBlock({
        type: 'spacer',
        height: 20,
      }),
      createBlock({
        type: 'text',
        text: 'Add your content here. This is where your message goes.',
        align: 'center',
      }),
      createBlock({
        type: 'spacer',
        height: 30,
      }),
      createBlock({
        type: 'button',
        text: 'Call To Action',
        url: 'https://example.com',
        align: 'center',
      }),
      createBlock({
        type: 'spacer',
        height: 30,
      }),
      createBlock({
        type: 'footer_block',
        companyName: '{{company_name}}',
      }),
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
  tagline: 'Start with bold branding',
  defaultContent: {
    subject: 'Your email subject line',
    preheader: 'Your email preview text',
    footer_text: '{{company_name}}',
    blocks: [
      createBlock({
        type: 'logo',
        logoUrl: '{{brand.logo}}',
        align: 'center',
        height: 45,
      }),
      createBlock({
        type: 'spacer',
        height: 40,
      }),
      createBlock({
        type: 'headline',
        text: 'Your main headline goes here',
        align: 'center',
        fontSize: 34,
        bold: true,
      }),
      createBlock({
        type: 'spacer',
        height: 24,
      }),
      createBlock({
        type: 'text',
        text: 'Add your content here. Make it count.',
        align: 'center',
      }),
      createBlock({
        type: 'spacer',
        height: 32,
      }),
      createBlock({
        type: 'button',
        text: 'Call To Action',
        url: 'https://example.com',
        align: 'center',
        bgColor: '',
      }),
      createBlock({
        type: 'spacer',
        height: 40,
      }),
      createBlock({
        type: 'footer_block',
        companyName: '{{company_name}}',
      }),
    ],
    style_options: {
      show_header_logo: true,
      show_social_icons: true,
      show_footer_address: false,
      wrapper_bg: '#ffffff',
      header_bg: '',
      body_bg: '#ffffff',
      footer_bg: '#f3f4f6',
      heading_color: '',
      body_color: '#1f2937',
      heading_size: 'lg',
      link_color: '',
      section_padding: 'normal',
      card_radius: 12,
      show_border: false,
      border_color: '#e5e7eb',
    },
  },
}

const customVariation3: VariationConfig = {
  index: 3,
  name: 'Conversion Focused',
  tagline: 'Start with action-focused layout',
  defaultContent: {
    subject: 'Your email subject line',
    preheader: 'Your email preview text',
    footer_text: '{{company_name}}',
    blocks: [
      createBlock({
        type: 'logo',
        logoUrl: '{{brand.logo}}',
        align: 'left',
        height: 35,
      }),
      createBlock({
        type: 'spacer',
        height: 20,
      }),
      createBlock({
        type: 'headline',
        text: 'Your main headline',
        align: 'left',
        fontSize: 28,
      }),
      createBlock({
        type: 'spacer',
        height: 16,
      }),
      createBlock({
        type: 'text',
        text: 'Add your content here.',
        align: 'left',
      }),
      createBlock({
        type: 'spacer',
        height: 24,
      }),
      createBlock({
        type: 'button',
        text: 'Call To Action →',
        url: 'https://example.com',
        align: 'left',
      }),
      createBlock({
        type: 'spacer',
        height: 30,
      }),
      createBlock({
        type: 'footer_block',
        companyName: '{{company_name}}',
      }),
    ],
    style_options: {
      show_header_logo: true,
      show_social_icons: false,
      show_footer_address: false,
      wrapper_bg: '#ffffff',
      header_bg: '#ffffff',
      body_bg: '#ffffff',
      footer_bg: '#f9fafb',
      heading_color: '#000000',
      body_color: '#374151',
      heading_size: 'md',
      link_color: '#0066cc',
      section_padding: 'compact',
      card_radius: 4,
      show_border: false,
      border_color: '#e5e7eb',
    },
  },
}

const customVariation4: VariationConfig = {
  index: 4,
  name: 'Premium / Editorial',
  tagline: 'Start with premium styling',
  defaultContent: {
    subject: 'Your email subject line',
    preheader: 'Your email preview text',
    footer_text: '{{company_name}}',
    blocks: [
      createBlock({
        type: 'logo',
        logoUrl: '{{brand.logo}}',
        align: 'center',
        height: 45,
      }),
      createBlock({
        type: 'spacer',
        height: 50,
      }),
      createBlock({
        type: 'headline',
        text: 'Your main headline goes here',
        align: 'center',
        textColor: '#ffffff',
        fontSize: 32,
        bold: true,
      }),
      createBlock({
        type: 'spacer',
        height: 32,
      }),
      createBlock({
        type: 'text',
        text: 'Add your premium content here.',
        align: 'center',
        textColor: '#e5e7eb',
      }),
      createBlock({
        type: 'spacer',
        height: 40,
      }),
      createBlock({
        type: 'button',
        text: 'Call To Action',
        url: 'https://example.com',
        align: 'center',
      }),
      createBlock({
        type: 'spacer',
        height: 60,
      }),
      createBlock({
        type: 'footer_block',
        companyName: '{{company_name}}',
      }),
    ],
    style_options: {
      show_header_logo: true,
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
      card_radius: 16,
      show_border: true,
      border_color: '#374151',
    },
  },
}

// ──────────────────────────────────────────────────────────────────────────────
// GALLERY TEMPLATES REGISTRY
// ──────────────────────────────────────────────────────────────────────────────

export const GALLERY_TEMPLATES: Record<TemplateStyle, GalleryTemplate> = {
  basic: {
    id: 'basic',
    label: 'Basic',
    description: 'Classic single-column email with logo, hero image, headline, CTA and footer.',
    previewImage: '/email-images/basic-hero.jpg',
    variations: [basicVariation1, basicVariation2, basicVariation3, basicVariation4],
  },
  newsletter: {
    id: 'newsletter',
    label: 'Newsletter',
    description: 'Multi-section digest layout with header image and structured content sections.',
    previewImage: '/email-images/newsletter-hero.jpg',
    variations: [newsletterVariation1, newsletterVariation2, newsletterVariation3, newsletterVariation4],
  },
  announcement: {
    id: 'announcement',
    label: 'Announcement',
    description: 'Bold hero section with announcement headline and supporting visuals.',
    previewImage: '/email-images/announcement-hero.jpg',
    variations: [announcementVariation1, announcementVariation2, announcementVariation3, announcementVariation4],
  },
  promotional: {
    id: 'promotional',
    label: 'Promotional',
    description: 'Brand-forward layout with product showcase and strong call-to-action.',
    previewImage: '/email-images/product-1.jpg',
    variations: [promotionalVariation1, promotionalVariation2, promotionalVariation3, promotionalVariation4],
  },
  offer: {
    id: 'offer',
    label: 'Offer',
    description: 'Discount and deal template with urgency messaging and prominent CTA.',
    previewImage: '/email-images/offer-hero.jpg',
    variations: [offerVariation1, offerVariation2, offerVariation3, offerVariation4],
  },
  minimalist: {
    id: 'minimalist',
    label: 'Minimalist',
    description: 'Typography-led, clean layout with strong whitespace and minimal imagery.',
    previewImage: '/email-images/basic-hero.jpg',
    variations: [minimalistVariation1, minimalistVariation2, minimalistVariation3, minimalistVariation4],
  },
  custom: {
    id: 'custom',
    label: 'Custom',
    description: 'Blank canvas with your brand styling applied. Start from scratch.',
    previewImage: null,
    variations: [customVariation1, customVariation2, customVariation3, customVariation4],
  },
}
