import type { Actor, Background, Voice } from './types'

export const BUILTIN_ACTORS: Actor[] = [
  // Business
  { id: 'biz-woman', name: 'Business Woman', image: '👩‍💼', category: 'business', description: 'Professional business woman', type: 'builtin' },
  { id: 'biz-man', name: 'Business Man', image: '👨‍💼', category: 'business', description: 'Professional business man', type: 'builtin' },
  { id: 'ceo', name: 'Corporate Executive', image: '🧑‍💼', category: 'business', description: 'Executive presence', type: 'builtin' },

  // Professional Services
  { id: 'doctor', name: 'Doctor', image: '👨‍⚕️', category: 'professional', description: 'Medical professional', type: 'builtin' },
  { id: 'real-estate', name: 'Real Estate Agent', image: '🏠', category: 'professional', description: 'Property specialist', type: 'builtin' },
  { id: 'lawyer', name: 'Lawyer', image: '⚖️', category: 'professional', description: 'Legal expert', type: 'builtin' },
  { id: 'solar', name: 'Solar Consultant', image: '☀️', category: 'professional', description: 'Energy consultant', type: 'builtin' },

  // Service Industry
  { id: 'restaurant', name: 'Restaurant Owner', image: '👨‍🍳', category: 'service', description: 'Hospitality expert', type: 'builtin' },
  { id: 'tradie', name: 'Tradie', image: '🔧', category: 'service', description: 'Trade professional', type: 'builtin' },

  // Media
  { id: 'influencer', name: 'Influencer', image: '🌟', category: 'media', description: 'Social media personality', type: 'builtin' },
  { id: 'presenter', name: 'Presenter', image: '🎙️', category: 'media', description: 'Professional presenter', type: 'builtin' },
  { id: 'news-anchor', name: 'News Anchor', image: '📺', category: 'media', description: 'Broadcast professional', type: 'builtin' },
]

// Will be populated from user uploads
export const UGC_ACTORS: Actor[] = []

// Combined list for use in composer
export const ACTORS = [...BUILTIN_ACTORS, ...UGC_ACTORS]

export const BACKGROUNDS: Background[] = [
  // Corporate
  { id: 'office', name: 'Corporate Office', image: '🏢', type: 'builtin' },
  { id: 'boardroom', name: 'Modern Boardroom', image: '🪑', type: 'builtin' },

  // Real Estate
  { id: 'luxury-home', name: 'Luxury Home', image: '🏠', type: 'builtin' },
  { id: 'skyline', name: 'Sydney Skyline', image: '🌃', type: 'builtin' },

  // Service
  { id: 'clinic', name: 'Medical Clinic', image: '🏥', type: 'builtin' },
  { id: 'restaurant', name: 'Restaurant Interior', image: '🍽️', type: 'builtin' },
  { id: 'cafe', name: 'Cafe Environment', image: '☕', type: 'builtin' },

  // Industrial
  { id: 'construction', name: 'Construction Site', image: '🏗️', type: 'builtin' },
  { id: 'warehouse', name: 'Warehouse', image: '📦', type: 'builtin' },

  // Studio
  { id: 'studio', name: 'Studio Background', image: '📸', type: 'builtin' },
  { id: 'green-screen', name: 'Green Screen', image: '🟢', type: 'builtin' },
]

export const VOICES: Voice[] = [
  // ElevenLabs
  { id: 'elevenlabs-1', name: 'Alex', provider: 'elevenlabs', language: 'English', accent: 'American', gender: 'Male', ageRange: '30-40' },
  { id: 'elevenlabs-2', name: 'Sarah', provider: 'elevenlabs', language: 'English', accent: 'British', gender: 'Female', ageRange: '25-35' },

  // OpenAI
  { id: 'openai-1', name: 'Alloy', provider: 'openai', language: 'English', accent: 'American', gender: 'Male', ageRange: '25-35' },
  { id: 'openai-2', name: 'Ember', provider: 'openai', language: 'English', accent: 'American', gender: 'Female', ageRange: '30-40' },

  // Cartesia
  { id: 'cartesia-1', name: 'Sonic', provider: 'cartesia', language: 'English', accent: 'Australian', gender: 'Male', ageRange: '35-45' },
  { id: 'cartesia-2', name: 'Nova', provider: 'cartesia', language: 'English', accent: 'Australian', gender: 'Female', ageRange: '28-38' },

  // HeyGen
  { id: 'heygen-1', name: 'James', provider: 'heygen', language: 'English', accent: 'British', gender: 'Male', ageRange: '40-50' },
  { id: 'heygen-2', name: 'Emma', provider: 'heygen', language: 'English', accent: 'British', gender: 'Female', ageRange: '30-40' },

  // Appalix
  { id: 'appalix-1', name: 'Marcus', provider: 'appalix', language: 'English', accent: 'Australian', gender: 'Male', ageRange: '35-45' },
  { id: 'appalix-2', name: 'Grace', provider: 'appalix', language: 'English', accent: 'Australian', gender: 'Female', ageRange: '28-38' },
]

export const EMOTIONS = [
  'Professional',
  'Friendly',
  'Confident',
  'Excited',
  'Serious',
  'Luxury',
  'Persuasive',
  'Conversational',
  'Motivational',
  'Authoritative',
]

export const ASPECT_RATIOS = [
  { value: '9:16', label: 'TikTok / Reels', icon: '📱' },
  { value: '16:9', label: 'YouTube', icon: '🖥️' },
  { value: '1:1', label: 'Social Posts', icon: '⬜' },
  { value: '4:5', label: 'Facebook / Instagram', icon: '📸' },
]

export const OUTPUT_QUALITIES = [
  { value: 'standard', label: 'Standard', description: '720p' },
  { value: 'hd', label: 'HD', description: '1080p' },
  { value: 'full_hd', label: 'Full HD', description: '1440p' },
  { value: '4k', label: '4K', description: '2160p' },
]

export const CAMERA_STYLES = [
  { value: 'static', label: 'Static', description: 'No movement' },
  { value: 'zoom_in', label: 'Zoom In', description: 'Slow zoom in' },
  { value: 'zoom_out', label: 'Zoom Out', description: 'Slow zoom out' },
  { value: 'dynamic', label: 'Dynamic', description: 'Dynamic movement' },
  { value: 'pan', label: 'Pan', description: 'Virtual pan' },
  { value: 'cinematic', label: 'Cinematic', description: 'Cinematic movement' },
]
