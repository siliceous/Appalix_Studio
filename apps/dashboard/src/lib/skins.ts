export interface SkinPreview {
  headerBg: string
  chatBg:   string
  accent:   string
  userBubble: string
  botBubble:  string
  text:     string
}

export interface Skin {
  id:          string
  name:        string
  description: string
  preview:     SkinPreview
  /** CSS variable values applied to the widget shadow root */
  vars: {
    '--apx-header-bg':    string
    '--apx-header-text':  string
    '--apx-bg':           string
    '--apx-border':       string
    '--apx-user-bubble':  string
    '--apx-user-text':    string
    '--apx-bot-bubble':   string
    '--apx-bot-text':     string
    '--apx-input-bg':     string
    '--apx-input-border': string
    '--apx-input-text':   string
    '--apx-accent':       string
    '--apx-accent-text':  string
    '--apx-launcher-bg':  string
  }
}

export const SKINS: Skin[] = [
  {
    id:          'light',
    name:        'Light',
    description: 'Clean white — the classic default',
    preview: {
      headerBg:   '#f9fafb',
      chatBg:     '#ffffff',
      accent:     '#ec732e',
      userBubble: '#ec732e',
      botBubble:  '#f3f4f6',
      text:       '#111827',
    },
    vars: {
      '--apx-header-bg':    '#f9fafb',
      '--apx-header-text':  '#111827',
      '--apx-bg':           '#ffffff',
      '--apx-border':       '#e5e7eb',
      '--apx-user-bubble':  '#ec732e',
      '--apx-user-text':    '#ffffff',
      '--apx-bot-bubble':   '#f3f4f6',
      '--apx-bot-text':     '#111827',
      '--apx-input-bg':     '#f9fafb',
      '--apx-input-border': '#d1d5db',
      '--apx-input-text':   '#111827',
      '--apx-accent':       '#ec732e',
      '--apx-accent-text':  '#ffffff',
      '--apx-launcher-bg':  '#ec732e',
    },
  },
  {
    id:          'dark',
    name:        'Dark',
    description: 'Sleek dark theme with orange accents',
    preview: {
      headerBg:   '#1a1a1a',
      chatBg:     '#242424',
      accent:     '#ec732e',
      userBubble: '#ec732e',
      botBubble:  '#2e2e2e',
      text:       '#f3f4f6',
    },
    vars: {
      '--apx-header-bg':    '#1a1a1a',
      '--apx-header-text':  '#f3f4f6',
      '--apx-bg':           '#242424',
      '--apx-border':       '#3a3a3a',
      '--apx-user-bubble':  '#ec732e',
      '--apx-user-text':    '#ffffff',
      '--apx-bot-bubble':   '#2e2e2e',
      '--apx-bot-text':     '#e5e7eb',
      '--apx-input-bg':     '#1a1a1a',
      '--apx-input-border': '#3a3a3a',
      '--apx-input-text':   '#f3f4f6',
      '--apx-accent':       '#ec732e',
      '--apx-accent-text':  '#ffffff',
      '--apx-launcher-bg':  '#ec732e',
    },
  },
  {
    id:          'forest',
    name:        'Forest',
    description: 'Deep greens — calm and natural',
    preview: {
      headerBg:   '#1c3426',
      chatBg:     '#f0faf5',
      accent:     '#61c2ad',
      userBubble: '#2d6a4f',
      botBubble:  '#e8f5ee',
      text:       '#1c3426',
    },
    vars: {
      '--apx-header-bg':    '#1c3426',
      '--apx-header-text':  '#d1fae5',
      '--apx-bg':           '#f0faf5',
      '--apx-border':       '#a7f3d0',
      '--apx-user-bubble':  '#2d6a4f',
      '--apx-user-text':    '#ffffff',
      '--apx-bot-bubble':   '#e8f5ee',
      '--apx-bot-text':     '#1c3426',
      '--apx-input-bg':     '#ffffff',
      '--apx-input-border': '#a7f3d0',
      '--apx-input-text':   '#1c3426',
      '--apx-accent':       '#2d6a4f',
      '--apx-accent-text':  '#ffffff',
      '--apx-launcher-bg':  '#1c3426',
    },
  },
  {
    id:          'desert',
    name:        'Desert',
    description: 'Warm sandy tones — earthy and welcoming',
    preview: {
      headerBg:   '#6b3a2a',
      chatBg:     '#fdf3e3',
      accent:     '#d4722a',
      userBubble: '#d4722a',
      botBubble:  '#fae8cc',
      text:       '#4a2010',
    },
    vars: {
      '--apx-header-bg':    '#6b3a2a',
      '--apx-header-text':  '#fef3c7',
      '--apx-bg':           '#fdf3e3',
      '--apx-border':       '#f5d0a9',
      '--apx-user-bubble':  '#d4722a',
      '--apx-user-text':    '#ffffff',
      '--apx-bot-bubble':   '#fae8cc',
      '--apx-bot-text':     '#4a2010',
      '--apx-input-bg':     '#fffbf0',
      '--apx-input-border': '#f5d0a9',
      '--apx-input-text':   '#4a2010',
      '--apx-accent':       '#d4722a',
      '--apx-accent-text':  '#ffffff',
      '--apx-launcher-bg':  '#6b3a2a',
    },
  },
  {
    id:          'ocean',
    name:        'Ocean',
    description: 'Deep navy with bright teal — professional and trustworthy',
    preview: {
      headerBg:   '#0a2d4a',
      chatBg:     '#f0f7ff',
      accent:     '#00c8e6',
      userBubble: '#0077b6',
      botBubble:  '#deeeff',
      text:       '#0a2d4a',
    },
    vars: {
      '--apx-header-bg':    '#0a2d4a',
      '--apx-header-text':  '#bae6fd',
      '--apx-bg':           '#f0f7ff',
      '--apx-border':       '#bae6fd',
      '--apx-user-bubble':  '#0077b6',
      '--apx-user-text':    '#ffffff',
      '--apx-bot-bubble':   '#deeeff',
      '--apx-bot-text':     '#0a2d4a',
      '--apx-input-bg':     '#ffffff',
      '--apx-input-border': '#bae6fd',
      '--apx-input-text':   '#0a2d4a',
      '--apx-accent':       '#0077b6',
      '--apx-accent-text':  '#ffffff',
      '--apx-launcher-bg':  '#0a2d4a',
    },
  },
  {
    id:          'midnight',
    name:        'Midnight',
    description: 'Deep purple with violet glow — bold and modern',
    preview: {
      headerBg:   '#1a0a2e',
      chatBg:     '#0d0819',
      accent:     '#a855f7',
      userBubble: '#7c3aed',
      botBubble:  '#1e103a',
      text:       '#e9d5ff',
    },
    vars: {
      '--apx-header-bg':    '#1a0a2e',
      '--apx-header-text':  '#e9d5ff',
      '--apx-bg':           '#0d0819',
      '--apx-border':       '#3b1a6b',
      '--apx-user-bubble':  '#7c3aed',
      '--apx-user-text':    '#ffffff',
      '--apx-bot-bubble':   '#1e103a',
      '--apx-bot-text':     '#c4b5fd',
      '--apx-input-bg':     '#1a0a2e',
      '--apx-input-border': '#3b1a6b',
      '--apx-input-text':   '#e9d5ff',
      '--apx-accent':       '#a855f7',
      '--apx-accent-text':  '#ffffff',
      '--apx-launcher-bg':  '#7c3aed',
    },
  },
  {
    id:          'rose',
    name:        'Rose',
    description: 'Soft pinks — warm and inviting',
    preview: {
      headerBg:   '#be185d',
      chatBg:     '#fff0f5',
      accent:     '#e11d48',
      userBubble: '#e11d48',
      botBubble:  '#fce4ed',
      text:       '#4a0520',
    },
    vars: {
      '--apx-header-bg':    '#be185d',
      '--apx-header-text':  '#fce4ed',
      '--apx-bg':           '#fff0f5',
      '--apx-border':       '#fbcfe8',
      '--apx-user-bubble':  '#e11d48',
      '--apx-user-text':    '#ffffff',
      '--apx-bot-bubble':   '#fce4ed',
      '--apx-bot-text':     '#4a0520',
      '--apx-input-bg':     '#ffffff',
      '--apx-input-border': '#fbcfe8',
      '--apx-input-text':   '#4a0520',
      '--apx-accent':       '#e11d48',
      '--apx-accent-text':  '#ffffff',
      '--apx-launcher-bg':  '#be185d',
    },
  },
  {
    id:          'minimal',
    name:        'Minimal',
    description: 'Pure white with subtle grays — ultra-clean',
    preview: {
      headerBg:   '#ffffff',
      chatBg:     '#ffffff',
      accent:     '#333333',
      userBubble: '#333333',
      botBubble:  '#f5f5f5',
      text:       '#111111',
    },
    vars: {
      '--apx-header-bg':    '#ffffff',
      '--apx-header-text':  '#111111',
      '--apx-bg':           '#ffffff',
      '--apx-border':       '#e5e5e5',
      '--apx-user-bubble':  '#333333',
      '--apx-user-text':    '#ffffff',
      '--apx-bot-bubble':   '#f5f5f5',
      '--apx-bot-text':     '#111111',
      '--apx-input-bg':     '#fafafa',
      '--apx-input-border': '#e5e5e5',
      '--apx-input-text':   '#111111',
      '--apx-accent':       '#333333',
      '--apx-accent-text':  '#ffffff',
      '--apx-launcher-bg':  '#333333',
    },
  },
]

/** Flat lookup map */
export const SKIN_MAP: Record<string, Skin> = Object.fromEntries(SKINS.map((s) => [s.id, s]))
