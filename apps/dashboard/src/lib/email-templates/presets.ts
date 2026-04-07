/**
 * Email template preset registry.
 * Each preset defines layout intent, tone fit, and placeholder defaults.
 * No HTML here — rendering is in html-renderer.ts.
 */

export type TemplateStyle =
  | 'basic'
  | 'minimalist'
  | 'promotional'
  | 'offer'
  | 'newsletter'
  | 'announcement'
  | 'custom'

export interface TemplatePreset {
  id:          TemplateStyle
  label:       string
  description: string
  // Brand tones this preset works best with
  best_for:    string[]
  // Placeholder defaults shown in the content form
  defaults: {
    subject:     string
    headline:    string
    preheader:   string
    body_text:   string
    cta_text:    string
    footer_text: string
  }
}

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id:          'basic',
    label:       'Basic',
    description: 'Classic 1-column layout with logo, CTA, social icons and full footer.',
    best_for:    ['professional', 'conversational', 'direct'],
    defaults: {
      subject:     'A message from {{company_name}}',
      headline:    "It's time to connect",
      preheader:   "Here's what we'd like to share with you.",
      body_text:   "Thank you for being part of our community. We're excited to share something with you today.\n\nFeel free to reach out if you have any questions.",
      cta_text:    'Get Started',
      footer_text: '{{company_name}} · All rights reserved.',
    },
  },
  {
    id:          'minimalist',
    label:       'Minimalist',
    description: 'Clean, typography-led layout. Lets the message breathe.',
    best_for:    ['professional', 'premium', 'direct'],
    defaults: {
      subject:     'A quick note from {{company_name}}',
      headline:    'Keep it simple.',
      preheader:   'Less is more — read on.',
      body_text:   'We believe great communication starts with clarity. Here\'s what you need to know.',
      cta_text:    'Learn More',
      footer_text: '{{company_name}} · Unsubscribe',
    },
  },
  {
    id:          'promotional',
    label:       'Promotional',
    description: 'Brand-forward layout with logo hero and strong CTA.',
    best_for:    ['friendly', 'playful', 'bold'],
    defaults: {
      subject:     'Something exciting from {{company_name}}',
      headline:    "We've got something for you",
      preheader:   "You won't want to miss this.",
      body_text:   'We\'ve been working on something special and we\'re excited to share it with you.',
      cta_text:    'Check It Out',
      footer_text: '{{company_name}} · Unsubscribe',
    },
  },
  {
    id:          'offer',
    label:       'Offer',
    description: 'Discount or limited-time deal with bold CTA.',
    best_for:    ['assertive', 'playful', 'direct'],
    defaults: {
      subject:     'Limited time: exclusive offer inside',
      headline:    'Your exclusive offer',
      preheader:   'Act now — this offer expires soon.',
      body_text:   'For a limited time, we\'re offering something exclusive to our valued contacts. Don\'t let this pass.',
      cta_text:    'Claim Offer',
      footer_text: '{{company_name}} · Unsubscribe · This offer expires in 48 hours.',
    },
  },
  {
    id:          'newsletter',
    label:       'Newsletter',
    description: 'Multi-section digest with header image and structured body.',
    best_for:    ['conversational', 'storytelling', 'friendly'],
    defaults: {
      subject:     '{{company_name}} Newsletter — {{month}}',
      headline:    "What's new this month",
      preheader:   'Your monthly update is here.',
      body_text:   'Here\'s a roundup of everything that happened this month — updates, insights, and what\'s coming next.',
      cta_text:    'Read More',
      footer_text: '{{company_name}} · Unsubscribe · You\'re receiving this because you subscribed.',
    },
  },
  {
    id:          'announcement',
    label:       'Announcement',
    description: 'Single bold announcement: launch, event, or milestone.',
    best_for:    ['authoritative', 'professional', 'bold'],
    defaults: {
      subject:     'Introducing {{headline}}',
      headline:    'Big news.',
      preheader:   "We're making it official.",
      body_text:   'We\'re thrilled to announce something we\'ve been working toward. Here\'s everything you need to know.',
      cta_text:    'Find Out More',
      footer_text: '{{company_name}} · Unsubscribe',
    },
  },
  {
    id:          'custom',
    label:       'Custom',
    description: 'Blank canvas with brand styling applied. Write your own.',
    best_for:    [],
    defaults: {
      subject:     '',
      headline:    '',
      preheader:   '',
      body_text:   '',
      cta_text:    '',
      footer_text: '{{company_name}} · Unsubscribe',
    },
  },
]

export function getPreset(id: TemplateStyle): TemplatePreset {
  return TEMPLATE_PRESETS.find(p => p.id === id) ?? TEMPLATE_PRESETS[0]
}
