'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Sparkles, Download, Trash2, Heart, Loader, X, Copy, Edit, ChevronLeft, ChevronRight, ChevronDown, ImagePlay } from 'lucide-react'

const QUALITY_PRESETS = [
  { id: 'fast', label: 'Fast' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'quality', label: 'Quality' },
]


const RESOLUTIONS = [
  { id: '720', label: '720p', multiplier: 0.5, description: 'HD' },
  { id: '1080', label: '1080p', multiplier: 1.0, description: 'Full HD' },
  { id: '2k', label: '2K', multiplier: 2.0, description: '2K' },
  { id: '4k', label: '4K', multiplier: 4.0, description: '4K Ultra' },
]

const STYLES = [
  'Photorealistic',
  'Cinematic',
  'Anime',
  'Illustration',
  'Oil Painting',
  'Abstract',
  'Watercolor',
  '3D',
  'Digital Painting',
  'Sketch',
  'Comic Book',
  'Game Art',
  'Pixel Art',
  'Low Poly',
  'Isometric',
  'Cartoon',
  'Storybook',
  'Gothic',
  'Cyberpunk',
  'Steampunk',
  'Art Deco',
  'Retro',
  'Vintage',
  'Renaissance',
  'Baroque',
  'Impressionist',
  'Surreal',
  'Minimalist',
  'Street Art',
  'Graffiti',
  'Marble Sculpture',
  'Paper Cut',
  'Mosaic',
  'Stained Glass',
  'Neon',
  'Holographic',
  'Glamour',
  'Fashion',
  'Anatomical',
  'Blueprint',
  'Technical Drawing',
]

const LIGHTING_OPTIONS = [
  { id: 'daylight', label: 'Daylight' },
  { id: 'sunset', label: 'Sunset' },
  { id: 'dramatic', label: 'Dramatic' },
  { id: 'studio', label: 'Studio' },
  { id: 'neon', label: 'Neon' },
  { id: 'soft', label: 'Soft' },
]

const ASPECT_RATIOS = ['16:9', '9:16', '3:4', '1:1', '21:9', '4:3', '2:3']

const aspectRatioLabels: Record<string, string> = {
  '16:9': '16:9',
  '9:16': '9:16',
  '3:4': '3:4',
  '1:1': '1:1',
  '21:9': '21:9',
  '4:3': '4:3',
  '2:3': '2:3',
}

const SHOT_TYPES = [
  { id: 'none', label: 'None', phrase: '' },
  { id: 'headshot', label: 'Headshot', phrase: 'headshot, tight framing on face' },
  { id: 'closeup', label: 'Close-up', phrase: 'close-up shot, detailed' },
  { id: 'bust', label: 'Bust Shot', phrase: 'bust shot, shoulders and head' },
  { id: 'waist', label: 'Waist Shot', phrase: 'waist up shot, torso visible' },
  { id: 'full_body', label: 'Full Body', phrase: 'full body shot, entire person visible' },
  { id: 'wide_shot', label: 'Wide Shot', phrase: 'wide shot, lots of background' },
  { id: 'environmental', label: 'Environmental', phrase: 'environmental portrait, subject in setting' },
]

const FEMALE_BODY_TYPES = [
  { id: 'none', label: 'None', phrase: '' },
  { id: 'busty', label: 'Busty', phrase: 'woman, body type: full-figured upper body, wide chest, ample proportions in upper torso, well-developed frame, larger-than-average upper body volume, full-bosomed figure, pronounced upper body wideness' },
  { id: 'curvy', label: 'Curvy', phrase: 'woman, body type: extremely curvy, voluptuous curves, pronounced waist-to-hip curves, full-figured curvy shape, hour-glass-like curvature, very rounded feminine silhouette, substantial body curves' },
  { id: 'hourglass', label: 'Hourglass', phrase: 'woman, body type: hourglass shape, narrow defined waist, full curves top and bottom, balanced proportions with pronounced curves, classic hourglass silhouette, narrow middle wide upper and lower body' },
  { id: 'pear', label: 'Pear Shape', phrase: 'woman, body type: pear-shaped, narrow upper body, wider lower body and hips, larger lower half than upper half, concentrated lower body volume, hip-dominant body shape' },
  { id: 'chubby', label: 'Chubby', phrase: 'woman, body type: heavier-set figure, rounder body proportions, fuller rounded shape throughout, substantial body weight, softly padded frame, generously proportioned build' },
  { id: 'plussize', label: 'Plus-Size', phrase: 'woman, body type: plus-size, larger overall frame, voluminous body proportions, size 18-20 frame, substantial body mass throughout, generous curvatures, larger all-over dimensions' },
  { id: 'size16', label: 'Size 16', phrase: 'woman, body type: size 16, larger frame proportions, rounder body shape, fuller width throughout, substantial body dimensions' },
  { id: 'mature', label: 'Mature', phrase: 'woman in her 50s, mature adult appearance, facial lines and wrinkles visible, graying or partially gray hair, softer body with mature proportions, middle-aged woman look, experienced appearance, mother age range' },
  { id: 'older', label: 'Older Woman', phrase: 'woman in her 60s to 70s, extensive facial wrinkles and deep lines throughout face, age spots on skin, white gray or silver hair, older adult body type, mature proportions, softer body composition, visible signs of aging, older woman appearance, grandparent age range' },
  { id: 'young', label: 'Young Woman', phrase: 'woman, age 20s, youthful appearance, smooth skin, young facial features, fresh-looking young woman, youthful beauty and vitality' },
  { id: 'athletic', label: 'Athletic', phrase: 'woman, body type: athletic, toned muscular body, fit athletic shape, defined muscles, lean athletic build, strong athletic physique' },
  { id: 'muscular', label: 'Muscular', phrase: 'woman, body type: very muscular, highly defined muscles, pronounced muscle development, strong muscular physique, heavily muscled frame, powerful muscular build' },
  { id: 'fit', label: 'Fit', phrase: 'woman, body type: fit and toned, lean fit body, visible muscle tone, healthy fit physique, lean defined body' },
  { id: 'bigbutt', label: 'Big Butt', phrase: 'woman, body type: prominent lower body curves, large rounded lower body, fuller hip and rear area, emphasized lower body proportions' },
  { id: 'thickthighs', label: 'Thick Thighs', phrase: 'woman, body type: thick legs and thighs, large leg proportions, fuller thigh size, substantial leg volume, thick lower leg shape' },
  { id: 'softbelly', label: 'Soft Belly', phrase: 'woman, body type: softer midsection, rounded belly area, weight in middle body, fuller abdominal area, soft middle section' },
  { id: 'tallwoman', label: 'Tall', phrase: 'woman, height: very tall, 180cm plus, long legs relative to body, tall proportions, tall stature appearance, elongated body proportions' },
  { id: 'petite', label: 'Petite', phrase: 'woman, height: petite and short, 152-158cm, short compact body, shorter stature, petite frame, small delicate proportions' },
]

const MALE_BODY_TYPES = [
  { id: 'none', label: 'None', phrase: '' },
  { id: 'muscular-male', label: 'Muscular', phrase: 'man, body type: very muscular, highly defined muscles, prominent muscle development, strong muscular physique, heavily muscled frame, powerful muscular build' },
  { id: 'athletic-male', label: 'Athletic', phrase: 'man, body type: athletic, toned muscular body, fit athletic shape, defined muscles, lean athletic build, strong athletic physique' },
  { id: 'fit-male', label: 'Fit', phrase: 'man, body type: fit and toned, lean fit body, visible muscle tone, healthy fit physique, lean defined body' },
  { id: 'lean', label: 'Lean', phrase: 'man, body type: lean and slim, thin slender frame, low body fat, lean physique, slim build' },
  { id: 'bulky', label: 'Bulky', phrase: 'man, body type: bulky and muscular, large muscular frame, substantial muscle mass, bulky powerful build, wide frame' },
  { id: 'chubby-male', label: 'Chubby', phrase: 'man, body type: heavier-set, rounder body shape, fuller proportions, softer physique, heavier build throughout' },
  { id: 'stocky', label: 'Stocky', phrase: 'man, body type: stocky and compact, solid sturdy build, shorter wider frame, compact proportions, solid stocky appearance' },
  { id: 'average-male', label: 'Average Build', phrase: 'man, body type: average build, normal proportions, typical body shape, everyday build, standard male proportions' },
  { id: 'tall-man', label: 'Tall', phrase: 'man, height: very tall, 180cm plus, long legs relative to body, tall stature, tall proportions appearance, elongated body frame' },
  { id: 'short-man', label: 'Short', phrase: 'man, height: short and compact, 160-170cm, shorter stature, compact body, petite male frame' },
  { id: 'mature-male', label: 'Mature', phrase: 'man in his 40s to 50s, mature adult appearance, facial lines and wrinkles visible, graying or salt-pepper hair, middle-aged man look, softer body with mature proportions, father age range' },
  { id: 'older-man', label: 'Older Man', phrase: 'man in his 60s to 70s, extensive facial wrinkles and deep lines throughout face, age spots on skin, white gray or silver hair, older adult body type, mature proportions, softer body composition, visible signs of aging, older man appearance, grandfather age range' },
  { id: 'young-man', label: 'Young Man', phrase: 'man, age 20s, youthful appearance, smooth skin, young facial features, fresh-looking young man, youthful beauty' },
]

const ETHNICITIES = [
  { id: 'none', label: 'Any Ethnicity', phrase: '' },
  { id: 'caucasian', label: 'Caucasian / European', phrase: 'Caucasian woman with fair, pale skin' },
  { id: 'scandinavian', label: 'Scandinavian', phrase: 'Scandinavian woman with fair skin, blonde hair' },
  { id: 'irish', label: 'Irish / Celtic', phrase: 'Irish woman with pale skin, red or auburn hair' },
  { id: 'french', label: 'French', phrase: 'French woman with elegant European features' },
  { id: 'italian', label: 'Italian', phrase: 'Italian woman with olive skin and Mediterranean features' },
  { id: 'spanish', label: 'Spanish', phrase: 'Spanish woman with olive skin and warm features' },
  { id: 'greek', label: 'Greek', phrase: 'Greek woman with Mediterranean features and olive skin' },
  { id: 'eastern_european', label: 'Eastern European', phrase: 'Eastern European woman with high cheekbones and strong features' },
  { id: 'slavic', label: 'Slavic / Russian', phrase: 'Slavic woman with fair skin and striking features' },
  { id: 'african', label: 'African', phrase: 'African woman with rich dark skin and natural beauty' },
  { id: 'jamaican', label: 'Caribbean / Jamaican', phrase: 'Caribbean woman with warm brown skin and natural beauty' },
  { id: 'afroamerican', label: 'Afro-American', phrase: 'Afro-American woman with rich dark skin and natural hair' },
  { id: 'latina', label: 'Latina / Hispanic', phrase: 'Latina woman with warm, sun-kissed skin and natural curves' },
  { id: 'mexican', label: 'Mexican', phrase: 'Mexican woman with warm brown skin and beautiful features' },
  { id: 'brazilian', label: 'Brazilian', phrase: 'Brazilian woman with tan skin and exotic beauty' },
  { id: 'colombian', label: 'Colombian', phrase: 'Colombian woman with warm caramel skin and curves' },
  { id: 'asian', label: 'East Asian', phrase: 'East Asian woman with delicate features and natural beauty' },
  { id: 'chinese', label: 'Chinese', phrase: 'Chinese woman with elegant Asian features' },
  { id: 'japanese', label: 'Japanese', phrase: 'Japanese woman with fair skin and delicate features' },
  { id: 'korean', label: 'Korean', phrase: 'Korean woman with fair skin and modern beauty standards' },
  { id: 'vietnamese', label: 'Vietnamese', phrase: 'Vietnamese woman with warm skin tone and delicate features' },
  { id: 'thai', label: 'Thai', phrase: 'Thai woman with warm tan skin and exotic features' },
  { id: 'philippine', label: 'Filipino / Philippine', phrase: 'Filipino woman with warm brown skin and beautiful features' },
  { id: 'indonesian', label: 'Indonesian', phrase: 'Indonesian woman with warm tan skin and exotic beauty' },
  { id: 'indian', label: 'Indian', phrase: 'Indian woman with warm brown skin and striking features' },
  { id: 'pakistani', label: 'Pakistani', phrase: 'Pakistani woman with olive to brown skin and beautiful features' },
  { id: 'bangladeshi', label: 'Bangladeshi', phrase: 'Bangladeshi woman with warm brown skin and delicate features' },
  { id: 'srilankn', label: 'Sri Lankan', phrase: 'Sri Lankan woman with warm brown skin and exotic beauty' },
  { id: 'middleeast', label: 'Middle Eastern', phrase: 'Middle Eastern woman with olive skin and striking features' },
  { id: 'arab', label: 'Arab', phrase: 'Arab woman with olive skin and dark expressive eyes' },
  { id: 'persian', label: 'Persian / Iranian', phrase: 'Persian woman with olive skin and elegant features' },
  { id: 'turkish', label: 'Turkish', phrase: 'Turkish woman with olive skin and Mediterranean beauty' },
  { id: 'lebanese', label: 'Lebanese', phrase: 'Lebanese woman with warm skin and Mediterranean features' },
  { id: 'jewish', label: 'Jewish / Israeli', phrase: 'Jewish woman with diverse features and dark eyes' },
  { id: 'russian', label: 'Russian / Ukrainian', phrase: 'Russian woman with fair skin and striking Slavic features' },
  { id: 'mixed', label: 'Mixed Race', phrase: 'mixed race woman with diverse, beautiful features' },
]

const HAIR_TYPES = [
  { id: 'none', label: 'Any Hair', phrase: '' },
  // Length
  { id: 'longhair', label: 'Long Hair', phrase: 'woman with long, flowing hair' },
  { id: 'mediumhair', label: 'Medium Hair', phrase: 'woman with shoulder-length hair' },
  { id: 'shorthair', label: 'Short Hair', phrase: 'woman with stylish short hair' },
  // Texture
  { id: 'straighthair', label: 'Straight Hair', phrase: 'woman with long straight hair' },
  { id: 'curlyhair', label: 'Curly Hair', phrase: 'woman with thick, curly hair' },
  { id: 'wavyhair', label: 'Wavy Hair', phrase: 'woman with long wavy hair' },
  { id: 'frizzy', label: 'Frizzy Hair', phrase: 'woman with voluminous, frizzy natural hair' },
  // Color
  { id: 'blonde', label: 'Blonde Hair', phrase: 'woman with blonde hair' },
  { id: 'brunette', label: 'Brunette Hair', phrase: 'woman with brunette, dark brown hair' },
  { id: 'blackhair', label: 'Black Hair', phrase: 'woman with long black hair' },
  { id: 'redhair', label: 'Red Hair', phrase: 'woman with beautiful red hair' },
  { id: 'brownhair', label: 'Brown Hair', phrase: 'woman with rich brown hair' },
  // Style
  { id: 'braids', label: 'Braids', phrase: 'woman with braided hair' },
  { id: 'afro', label: 'Afro', phrase: 'woman with a full, natural afro' },
  { id: 'cornrows', label: 'Cornrows', phrase: 'woman with cornrow braids' },
  { id: 'updohair', label: 'Updo', phrase: 'woman with her hair in an elegant updo' },
  { id: 'buns', label: 'Buns', phrase: 'woman with her hair in buns' },
  // Accessories
  { id: 'tattoos', label: 'Tattoos', phrase: 'woman with visible tattoos and body art' },
  { id: 'pierced', label: 'Piercings', phrase: 'woman with multiple piercings' },
  { id: 'makeup', label: 'Bold Makeup', phrase: 'woman with bold, glamorous makeup' },
]

const LENSES = [
  { id: 'none', label: 'None', phrase: '' },
  { id: '50mm', label: '50mm', phrase: '50mm lens' },
  { id: '85mm', label: '85mm', phrase: '85mm lens' },
  { id: '35mm', label: '35mm', phrase: '35mm lens' },
  { id: '24mm', label: '24mm', phrase: '24mm lens' },
  { id: '135mm', label: '135mm', phrase: '135mm lens' },
  { id: 'macro', label: 'Macro', phrase: 'macro lens' },
]

const APERTURES = [
  { id: 'none', label: 'None', phrase: '' },
  { id: 'f1.4', label: 'f/1.4', phrase: 'f/1.4 aperture, extremely shallow depth of field' },
  { id: 'f1.8', label: 'f/1.8', phrase: 'f/1.8 aperture, shallow depth of field' },
  { id: 'f2.8', label: 'f/2.8', phrase: 'f/2.8 aperture, creamy bokeh' },
  { id: 'f4', label: 'f/4', phrase: 'f/4 aperture, soft background' },
  { id: 'f5.6', label: 'f/5.6', phrase: 'f/5.6 aperture, balanced depth' },
  { id: 'f8', label: 'f/8', phrase: 'f/8 aperture, sharp throughout' },
  { id: 'f11', label: 'f/11', phrase: 'f/11 aperture, everything in focus' },
]

const SHUTTER_SPEEDS = [
  { id: 'none', label: 'None', phrase: '' },
  { id: '1/1000', label: '1/1000s', phrase: '1/1000 shutter speed, fast action freeze' },
  { id: '1/500', label: '1/500s', phrase: '1/500 shutter speed, crisp motion' },
  { id: '1/250', label: '1/250s', phrase: '1/250 shutter speed, sharp' },
  { id: '1/125', label: '1/125s', phrase: '1/125 shutter speed, standard portrait' },
  { id: '1/60', label: '1/60s', phrase: '1/60 shutter speed, normal speed' },
  { id: '1/30', label: '1/30s', phrase: '1/30 shutter speed, slow' },
]

const ISO_SETTINGS = [
  { id: 'none', label: 'None', phrase: '' },
  { id: 'iso100', label: 'ISO 100', phrase: 'ISO 100, clean image' },
  { id: 'iso200', label: 'ISO 200', phrase: 'ISO 200, clean and bright' },
  { id: 'iso400', label: 'ISO 400', phrase: 'ISO 400, good lighting' },
  { id: 'iso800', label: 'ISO 800', phrase: 'ISO 800, moderate lighting' },
  { id: 'iso1600', label: 'ISO 1600', phrase: 'ISO 1600, low light conditions' },
  { id: 'iso3200', label: 'ISO 3200', phrase: 'ISO 3200, very low light' },
]

interface GeneratedImage {
  id: string
  image: string
  prompt: string
  timestamp: number
  deletedAt?: number
}

export default function CreateImagePage() {
  const router = useRouter()

  // Generator settings
  const [model, setModel] = useState('nano-banana-pro')
  const [models, setModels] = useState<any[]>([])
  const [loadingModels, setLoadingModels] = useState(true)
  const [qualityPreset, setQualityPreset] = useState('balanced')
  const [resolution, setResolution] = useState('1080')
  const [temperature, setTemperature] = useState(1.0)
  const [style, setStyle] = useState('Photorealistic')
  const [lighting, setLighting] = useState<string[]>(['Daylight'])
  const [aspectRatio, setAspectRatio] = useState('9:16')
  const [quantity, setQuantity] = useState(1)
  const [gender, setGender] = useState<'female' | 'male'>('female')
  const [bodyTypes, setBodyTypes] = useState<string[]>([])
  const [ethnicity, setEthnicity] = useState('none')
  const [hairTypes, setHairTypes] = useState<string[]>([])
  const [shotType, setShotType] = useState('none')
  const [lens, setLens] = useState('none')
  const [aperture, setAperture] = useState('none')
  const [shutterSpeed, setShutterSpeed] = useState('none')
  const [iso, setIso] = useState('none')

  // State management
  const [prompt, setPrompt] = useState('')
  const [bodyTypeExpanded, setBodyTypeExpanded] = useState(true)
  const [hairTypeExpanded, setHairTypeExpanded] = useState(true)
  const [cameraExpanded, setCameraExpanded] = useState(true)
  const [originalPrompt, setOriginalPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [history, setHistory] = useState<GeneratedImage[]>([])
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [credits, setCredits] = useState(100)
  const [workspaceId, setWorkspaceId] = useState<string>('')
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null)
  const [fullscreenImageData, setFullscreenImageData] = useState<GeneratedImage | null>(null)
  const [fullscreenImageIndex, setFullscreenImageIndex] = useState(0)
  const [showTrash, setShowTrash] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [newProjectName, setNewProjectName] = useState('')
  const [isSavingProject, setIsSavingProject] = useState(false)
  const [imageToSave, setImageToSave] = useState<GeneratedImage | null>(null)
  const [storageError, setStorageError] = useState<string | null>(null)
  const [showStorageModal, setShowStorageModal] = useState(false)
  const [imageZoom, setImageZoom] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const imageContainerRef = useRef<HTMLDivElement>(null)

  // Load initial data
  useEffect(() => {
    const wId = typeof window !== 'undefined' ? localStorage.getItem('workspaceId') || '' : ''
    setWorkspaceId(wId)

    // Load existing images from localStorage
    if (typeof window !== 'undefined') {
      try {
        const savedHistory = localStorage.getItem('imageGenerationHistory')
        if (savedHistory) {
          const parsed = JSON.parse(savedHistory)
          if (Array.isArray(parsed)) {
            setHistory(parsed)
            console.log('[Load] Loaded', parsed.length, 'images from localStorage')
          }
        }
      } catch (error) {
        console.error('[Load] Error loading history from localStorage:', error)
      }
    }

    const fetchModels = async () => {
      try {
        const response = await fetch('/api/ai-studio/models/image')
        if (response.ok) {
          const data = await response.json()
          if (data.models && Array.isArray(data.models)) {
            setModels(data.models)
          } else {
            throw new Error('Invalid response')
          }
        } else {
          throw new Error('API error')
        }
      } catch (error) {
        setModels([
          { id: 'gemini-3.1-flash-image', name: 'Gemini 3.1 Flash Image' },
          { id: 'nano-banana-pro', name: 'Nano Banana Pro' },
          { id: 'nano-banana-2', name: 'Nano Banana 2' },
          { id: 'nano-banana', name: 'Nano Banana' },
          { id: 'sd3.5-large-turbo', name: 'Stable Diffusion 3.5 Turbo' },
          { id: 'sd3.5-large', name: 'Stable Diffusion 3.5 Large' },
          { id: 'sd3.5-medium', name: 'Stable Diffusion 3.5 Medium' },
        ])
      } finally {
        setLoadingModels(false)
      }
    }

    fetchModels()
  }, [])

  // Load projects after workspace ID is available
  useEffect(() => {
    if (!workspaceId) return

    const fetchProjects = async () => {
      try {
        const response = await fetch('/api/projects', {
          headers: {
            'x-workspace-id': workspaceId,
          },
        })
        if (!response.ok) throw new Error('Failed to fetch')
        const data = await response.json()
        setProjects(data.projects || [])
      } catch (error) {
        console.error('Failed to fetch projects:', error)
      }
    }

    fetchProjects()
  }, [workspaceId])


  // Auto-scroll library to top when new images are added
  useEffect(() => {
    const libraryContainer = document.querySelector('[data-library-container]') as HTMLElement
    if (libraryContainer) {
      // Scroll to top to show newest images
      libraryContainer.scrollTop = 0
    }
  }, [history])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle Escape for both modals
      if (e.key === 'Escape') {
        if (selectedImage) {
          setSelectedImage(null)
          return
        }
        if (fullscreenImage) {
          setFullscreenImage(null)
          setFullscreenImageData(null)
          return
        }
      }

      if (!fullscreenImage) return

      if (e.key === 'ArrowLeft') {
        if (fullscreenImageIndex > 0) {
          const newIdx = fullscreenImageIndex - 1
          setFullscreenImageIndex(newIdx)
          setFullscreenImageData(history[newIdx] || null)
          setFullscreenImage(history[newIdx]?.image || null)
        }
      } else if (e.key === 'ArrowRight') {
        if (fullscreenImageIndex < history.length - 1) {
          const newIdx = fullscreenImageIndex + 1
          setFullscreenImageIndex(newIdx)
          setFullscreenImageData(history[newIdx] || null)
          setFullscreenImage(history[newIdx]?.image || null)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [fullscreenImage, fullscreenImageIndex, history])

  const handleGenerate = async () => {
    if (!prompt.trim() || !workspaceId) {
      console.log('Missing prompt or workspace')
      return
    }

    // Expose state to window for debugging
    if (typeof window !== 'undefined') {
      (window as any).lastGenerationDebug = {
        prompt,
        model,
        workspaceId,
        quantity,
        timestamp: new Date().toISOString(),
      }
    }

    // Clear canvas and show loading state
    setIsGenerating(true)
    setSelectedImage(null)
    setOriginalPrompt('')
    setFullscreenImage(null)

    try {
      const response = await fetch('/api/ai-studio/generate/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': workspaceId,
        },
        body: JSON.stringify({
          prompt: getEnhancedPrompt(),
          model,
          qualityPreset,
          resolution,
          temperature,
          style,
          lighting: lighting.join(','),
          aspectRatio,
          quantity,
        }),
      })

      const data = await response.json()
      if (data.error) {
        console.error('Generation error:', data.error)
        // Check if it's a storage quota error
        if (data.error.includes('Storage limit reached') || response.status === 507) {
          setStorageError(data.error)
          setShowStorageModal(true)
        }
        setIsGenerating(false)
        return
      }

      const generationId = data.id
      console.log('Generation started:', generationId)

      // Poll for completion
      let isComplete = false
      let attempts = 0
      const maxAttempts = 120

      while (!isComplete && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        attempts++

        try {
          console.log(`[Polling] Attempt ${attempts}/${maxAttempts} for generation ${generationId}`)
          const statusResponse = await fetch(`/api/ai-studio/generations/${generationId}`, {
            headers: {
              'x-workspace-id': workspaceId,
            },
          })

          if (!statusResponse.ok) {
            console.error('[Polling] Status response not OK:', statusResponse.status)
            continue
          }

          const statusData = await statusResponse.json()
          console.log('[Polling] Status response:', {
            status: statusData.status,
            hasImageUrls: !!statusData.imageUrls,
            imageUrlsLength: statusData.imageUrls?.length || 0,
            outputUrl: statusData.outputUrl?.substring(0, 50),
          })

          if (statusData.status === 'completed') {
            console.log('[Polling] Completion detected. Full statusData:', JSON.stringify({
              status: statusData.status,
              hasImageUrls: !!statusData.imageUrls,
              imageUrlsCount: statusData.imageUrls?.length || 0,
              firstImageSize: statusData.imageUrls?.[0]?.length || 0,
            }))
            if (statusData.imageUrls && statusData.imageUrls.length > 0) {
              // Add all new images to history with aspect ratio
              const newImages = statusData.imageUrls.map((img: string, idx: number) => ({
                id: `${generationId}-${idx}`,
                image: img,
                prompt: getEnhancedPrompt(),
                timestamp: Date.now(),
                aspectRatio: aspectRatio, // Store the aspect ratio
              }))

              console.log('Adding images to history:', newImages.length, 'images')
              console.log('First image size:', newImages[0]?.image?.length || 0, 'bytes')

              setHistory(prev => {
                console.log('Previous history length:', prev.length)
                const updated = [...prev, ...newImages]
                console.log('Updated history length after append:', updated.length)
                console.log('Storing to localStorage...')

                // Immediately save to localStorage
                try {
                  // Save ALL images, not just last 10
                  const jsonStr = JSON.stringify(updated)
                  const sizeKB = (jsonStr.length / 1024).toFixed(2)

                  console.log('Attempting to save to localStorage...')
                  console.log('- Items to save:', updated.length)
                  console.log('- Size:', sizeKB, 'KB')
                  console.log('- URL length of first image:', updated[0]?.image?.length || 0)

                  localStorage.setItem('imageGenerationHistory', jsonStr)
                  console.log('✅ Successfully saved to localStorage')

                  // Verify it was saved
                  const verified = localStorage.getItem('imageGenerationHistory')
                  console.log('✅ Verified in localStorage:', verified?.length || 0, 'bytes')
                } catch (err) {
                  console.error('❌ localStorage save error:', err)
                  if (err instanceof Error && err.message.includes('QuotaExceededError')) {
                    console.error('localStorage is full! Try clearing old data or reducing history size')
                  }
                }

                return updated
              })

              // Display the last generated image in the main canvas
              const lastImage = newImages[newImages.length - 1]
              setFullscreenImage(lastImage.image)
              setFullscreenImageData(lastImage)
              setFullscreenImageIndex(history.length - 1)
              setOriginalPrompt(prompt)
              console.log('Images received and processed:', statusData.imageUrls.length)
            } else {
              console.warn('Completed but no imageUrls found. statusData:', statusData)
            }
            isComplete = true
          } else if (statusData.status === 'failed') {
            console.error('Generation failed')
            isComplete = true
          }
        } catch (pollError) {
          console.error('Poll error:', pollError)
        }
      }

      if (!isComplete) {
        console.log('Generation timeout')
      }
    } catch (error) {
      console.error('Generation failed:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDeleteImage = (imageId: string) => {
    // Soft delete: mark with deletedAt timestamp
    setHistory(prev =>
      prev.map(img =>
        img.id === imageId ? { ...img, deletedAt: Date.now() } : img
      )
    )
    if (selectedImage?.id === imageId) {
      setSelectedImage(null)
    }
    // Close fullscreen if open
    if (fullscreenImageData?.id === imageId) {
      setFullscreenImage(null)
      setFullscreenImageData(null)
    }
  }

  const handleRestoreImage = (imageId: string) => {
    // Remove deletedAt to restore
    setHistory(prev =>
      prev.map(img =>
        img.id === imageId ? { ...img, deletedAt: undefined } : img
      )
    )
  }

  const getResolutionMultiplier = (res: string) => {
    const resData = RESOLUTIONS.find(r => r.id === res)
    return resData?.multiplier || 1.0
  }

  const calculateCost = () => {
    const baseCredits = 10
    const resolutionMultiplier = getResolutionMultiplier(resolution)
    return Math.ceil(baseCredits * resolutionMultiplier * quantity)
  }

  const getEnhancedPrompt = () => {
    let enhanced = prompt
    const bodyTypesArray = gender === 'male' ? MALE_BODY_TYPES : FEMALE_BODY_TYPES
    const ethnicityData = ETHNICITIES.find(et => et.id === ethnicity)
    const shotTypeData = SHOT_TYPES.find(st => st.id === shotType)
    const lensData = LENSES.find(l => l.id === lens)
    const apertureData = APERTURES.find(a => a.id === aperture)
    const shutterSpeedData = SHUTTER_SPEEDS.find(s => s.id === shutterSpeed)
    const isoData = ISO_SETTINGS.find(i => i.id === iso)

    if (bodyTypes.length > 0) {
      const bodyPhrases = bodyTypes
        .map(id => bodyTypesArray.find(bt => bt.id === id))
        .filter(bt => bt && bt.phrase)
        .map(bt => bt!.phrase)
      if (bodyPhrases.length > 0) {
        enhanced = `${enhanced}, ${bodyPhrases.join(', ')}`
      }
    }
    if (ethnicityData && ethnicityData.phrase) {
      enhanced = `${enhanced}, ${ethnicityData.phrase}`
    }
    if (hairTypes.length > 0) {
      const hairPhrases = hairTypes
        .map(id => HAIR_TYPES.find(ht => ht.id === id))
        .filter(ht => ht && ht.phrase)
        .map(ht => ht!.phrase)
      if (hairPhrases.length > 0) {
        enhanced = `${enhanced}, ${hairPhrases.join(', ')}`
      }
    }
    if (shotTypeData && shotTypeData.phrase) {
      enhanced = `${enhanced}, ${shotTypeData.phrase}`
    }
    if (lensData && lensData.phrase) {
      enhanced = `${enhanced}, ${lensData.phrase}`
    }
    if (apertureData && apertureData.phrase) {
      enhanced = `${enhanced}, ${apertureData.phrase}`
    }
    if (shutterSpeedData && shutterSpeedData.phrase) {
      enhanced = `${enhanced}, ${shutterSpeedData.phrase}`
    }
    if (isoData && isoData.phrase) {
      enhanced = `${enhanced}, ${isoData.phrase}`
    }
    return enhanced
  }


  const handlePermanentlyDeleteImage = (imageId: string) => {
    // Permanently remove from history
    setHistory(prev => prev.filter(img => img.id !== imageId))
  }

  const handleDownloadImage = async (image: GeneratedImage | null) => {
    if (!image) return
    try {
      // If it's a data URL, download directly
      if (image.image.startsWith('data:')) {
        const link = document.createElement('a')
        link.href = image.image
        link.download = `appalix-image-${image.id}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        return
      }

      // For Supabase URLs, fetch and convert to blob
      const response = await fetch(image.image)
      if (!response.ok) throw new Error('Failed to fetch image')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `appalix-image-${image.id}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
      alert('Failed to download image')
    }
  }

  const handleSaveImage = (image: GeneratedImage) => {
    setImageToSave(image)
    setShowSaveDialog(true)
    setSelectedProjectId(projects.length > 0 ? projects[0].id : '')
  }

  const handleSaveToProject = async () => {
    if (!imageToSave || !workspaceId) return

    setIsSavingProject(true)
    try {
      let projectId = selectedProjectId
      let projectName = newProjectName

      // Create new project if needed
      if (newProjectName.trim()) {
        const createResponse = await fetch('/api/projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-workspace-id': workspaceId,
          },
          body: JSON.stringify({
            name: newProjectName,
            description: `Generated images collection`,
          }),
        })

        if (!createResponse.ok) throw new Error('Failed to create project')
        const newProject = await createResponse.json()
        projectId = newProject.id
        projectName = newProject.name

        // Add to projects list
        setProjects([...projects, newProject])
        setNewProjectName('')
      }

      // Save image to project as a document/file
      if (projectId) {
        const saveResponse = await fetch(`/api/projects/${projectId}/images`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-workspace-id': workspaceId,
          },
          body: JSON.stringify({
            imageId: imageToSave.id,
            image: imageToSave.image,
            prompt: imageToSave.prompt,
            timestamp: imageToSave.timestamp,
          }),
        })

        if (!saveResponse.ok) throw new Error('Failed to save image')

        // Show success feedback
        console.log('Image saved to project successfully')
        setShowSaveDialog(false)
        setImageToSave(null)
        setSelectedProjectId('')
      }
    } catch (error) {
      console.error('Failed to save image:', error)
      alert('Failed to save image to project. Please try again.')
    } finally {
      setIsSavingProject(false)
    }
  }

  const handleReusePrompt = (image: GeneratedImage) => {
    setPrompt(image.prompt)
    setSelectedImage(image)
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">

      {/* Main Layout */}
      <div className="flex-1 flex gap-3 px-3 py-0 pb-3 overflow-hidden">
        {/* Left Panel - Controls */}
        <div className="w-72 flex flex-col rounded-2xl shadow-lg bg-white overflow-hidden">
          <div className="bg-black text-white px-4 py-3 rounded-t-2xl h-12 flex items-center flex-shrink-0">
            <h2 className="text-sm font-semibold">Settings</h2>
          </div>
          {/* Settings Content Scrollable Area */}
          <div className="flex-1 min-h-0 overflow-y-scroll px-3 py-1 pr-2 pb-20 space-y-1 flex flex-col text-xs">
            {/* Model Selector */}
            <div>
              <label className="text-xs font-semibold text-black uppercase tracking-widest mb-2 block">
                Model
              </label>
              {loadingModels ? (
                <div className="px-2 py-2 rounded-lg border border-gray-300 bg-white text-gray-600 text-xs">
                  Loading...
                </div>
              ) : (
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-2 py-2 rounded-lg border border-gray-300 bg-white text-black text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Quality Preset */}
            <div>
              <label className="text-xs font-semibold text-black uppercase tracking-widest mb-2 block">
                Quality
              </label>
              <div className="grid grid-cols-3 gap-2">
                {QUALITY_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setQualityPreset(preset.id)}
                    className={`py-2 px-2 rounded-lg text-xs font-bold transition-all border shadow-md ${
                      qualityPreset === preset.id
                        ? 'bg-blue-600 text-white border-blue-700 shadow-lg'
                        : 'bg-white text-gray-700 border-gray-200 hover:shadow-lg'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Resolution */}
            <div>
              <label className="text-xs font-semibold text-black uppercase tracking-widest mb-2 block">
                Resolution
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {RESOLUTIONS.map((res) => (
                  <button
                    key={res.id}
                    onClick={() => setResolution(res.id)}
                    className={`py-2 px-1 rounded-lg text-xs font-semibold transition-all border shadow-md ${
                      resolution === res.id
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:shadow-lg'
                    }`}
                    title={res.description}
                  >
                    {res.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Creativity */}
            <div>
              <label className="text-xs font-semibold text-black uppercase tracking-widest mb-2 block">
                Creativity: <span className="text-blue-600">{temperature.toFixed(1)}</span>
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-300 rounded-lg accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-1.5">
                <span>Consistent</span>
                <span>Creative</span>
              </div>
            </div>

            {/* Style */}
            <div>
              <label className="text-xs font-semibold text-black uppercase tracking-widest mb-2 block">
                Style
              </label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-black text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-md"
              >
                {STYLES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Lighting */}
            <div>
              <label className="text-xs font-semibold text-black uppercase tracking-widest mb-2 block">
                Lighting
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {LIGHTING_OPTIONS.map((light) => (
                  <button
                    key={light.id}
                    onClick={() => {
                      setLighting(prev =>
                        prev.includes(light.label)
                          ? prev.filter(l => l !== light.label)
                          : [...prev, light.label]
                      )
                    }}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all border shadow-md ${
                      lighting.includes(light.label)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:shadow-lg'
                    }`}
                  >
                    {light.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Shot Type */}
            <div>
              <label className="text-xs font-semibold text-black uppercase tracking-widest mb-2 block">
                Shot Type
              </label>
              <select
                value={shotType}
                onChange={(e) => setShotType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SHOT_TYPES.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.label}
                  </option>
                ))}
              </select>
              {shotType !== 'none' && (
                <p className="text-xs text-gray-500 mt-1 italic">
                  {SHOT_TYPES.find(st => st.id === shotType)?.phrase}
                </p>
              )}
            </div>

            {/* Size / Aspect Ratio */}
            <div>
              <label className="text-xs font-semibold text-black uppercase tracking-widest mb-2 block">
                Aspect Ratio
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {ASPECT_RATIOS.map((ar) => (
                  <button
                    key={ar}
                    onClick={() => setAspectRatio(ar)}
                    className={`py-1.5 px-1 rounded-lg text-xs font-bold transition-all border shadow-md ${
                      aspectRatio === ar
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:shadow-lg'
                    }`}
                    title={ar === '16:9' ? 'Landscape' : ar === '9:16' ? 'Portrait' : ar === '1:1' ? 'Square' : 'Portrait'}
                  >
                    {aspectRatioLabels[ar]}
                  </button>
                ))}
              </div>
            </div>

            {/* Gender */}
            <div>
              <label className="text-xs font-semibold text-black uppercase tracking-widest mb-2 block">
                Gender
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setGender('female')
                    setBodyTypes([])
                  }}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    gender === 'female'
                      ? 'bg-blue-600 text-white border border-blue-600'
                      : 'bg-white text-black border border-gray-300 hover:border-gray-400'
                  }`}
                >
                  Female
                </button>
                <button
                  onClick={() => {
                    setGender('male')
                    setBodyTypes([])
                  }}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    gender === 'male'
                      ? 'bg-blue-600 text-white border border-blue-600'
                      : 'bg-white text-black border border-gray-300 hover:border-gray-400'
                  }`}
                >
                  Male
                </button>
              </div>
            </div>

            {/* Body Type */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-black uppercase tracking-widest block">
                  Body Type
                </label>
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bodyTypeExpanded}
                    onChange={(e) => {
                      setBodyTypeExpanded(e.target.checked)
                      if (!e.target.checked) {
                        setBodyTypes([])
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-xs text-gray-600">Enable</span>
                </label>
              </div>
              {!bodyTypeExpanded && (
                <p className="text-xs text-gray-500 italic">💡 Tip: Enable body type to avoid default slim figures</p>
              )}
              <div className="space-y-3">
                  {/* Body Type - Multiple Selection */}
                  {bodyTypeExpanded && (
                  <div>
                    <label className="text-xs font-semibold text-black uppercase tracking-widest mb-2 block">Body Type (up to 2)</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(gender === 'male' ? MALE_BODY_TYPES : FEMALE_BODY_TYPES).filter(bt => bt.id !== 'none').map((bt) => (
                        <button
                          key={bt.id}
                          onClick={() => {
                            if (bodyTypes.includes(bt.id)) {
                              setBodyTypes(bodyTypes.filter(id => id !== bt.id))
                            } else if (bodyTypes.length < 2) {
                              setBodyTypes([...bodyTypes, bt.id])
                            }
                          }}
                          disabled={!bodyTypes.includes(bt.id) && bodyTypes.length >= 2}
                          className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all border ${
                            bodyTypes.includes(bt.id)
                              ? 'bg-blue-600 text-white border-blue-700 shadow-md'
                              : bodyTypes.length >= 2
                              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                              : 'bg-white text-gray-700 border-gray-200 hover:shadow-md'
                          }`}
                        >
                          {bt.label}
                        </button>
                      ))}
                    </div>
                    {bodyTypes.length > 0 && (
                      <p className="text-xs text-gray-500 mt-2 italic">
                        {bodyTypes
                          .map(id => (gender === 'male' ? MALE_BODY_TYPES : FEMALE_BODY_TYPES).find(bt => bt.id === id)?.phrase)
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    )}
                  </div>
                  )}

                  {/* Ethnicity */}
                  <div>
                    <label className="text-xs font-semibold text-black uppercase tracking-widest mb-1 block">Ethnicity</label>
                    <select
                      value={ethnicity}
                      onChange={(e) => setEthnicity(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {ETHNICITIES.map((et) => (
                        <option key={et.id} value={et.id}>
                          {et.label}
                        </option>
                      ))}
                    </select>
                    {ethnicity !== 'none' && (
                      <p className="text-xs text-gray-500 mt-1 italic">
                        {ETHNICITIES.find(et => et.id === ethnicity)?.phrase}
                      </p>
                    )}
                  </div>

                  {/* Hair Type - Multiple Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-black uppercase tracking-widest block">Hair Type (up to 2)</label>
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hairTypeExpanded}
                          onChange={(e) => {
                            setHairTypeExpanded(e.target.checked)
                            if (!e.target.checked) {
                              setHairTypes([])
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-xs text-gray-600">Enable</span>
                      </label>
                    </div>
                    {!hairTypeExpanded && (
                      <p className="text-xs text-gray-500 italic">💡 Tip: Enable to specify hair type</p>
                    )}
                    {hairTypeExpanded && (
                    <>
                    <div className="grid grid-cols-2 gap-2">
                      {HAIR_TYPES.filter(ht => ht.id !== 'none').map((ht) => (
                        <button
                          key={ht.id}
                          onClick={() => {
                            if (hairTypes.includes(ht.id)) {
                              setHairTypes(hairTypes.filter(id => id !== ht.id))
                            } else if (hairTypes.length < 2) {
                              setHairTypes([...hairTypes, ht.id])
                            }
                          }}
                          disabled={!hairTypes.includes(ht.id) && hairTypes.length >= 2}
                          className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all border ${
                            hairTypes.includes(ht.id)
                              ? 'bg-blue-600 text-white border-blue-700 shadow-md'
                              : hairTypes.length >= 2
                              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                              : 'bg-white text-gray-700 border-gray-200 hover:shadow-md'
                          }`}
                        >
                          {ht.label}
                        </button>
                      ))}
                    </div>
                    {hairTypes.length > 0 && (
                      <p className="text-xs text-gray-500 mt-2 italic">
                        {hairTypes
                          .map(id => HAIR_TYPES.find(ht => ht.id === id)?.phrase)
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    )}
                    </>
                    )}
                  </div>
              </div>
            </div>

            {/* Camera Settings */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-black uppercase tracking-widest block">
                Camera Settings
              </label>
              {/* Lens */}
              <div>
                <label className="text-xs font-semibold text-black mb-1 block">Lens</label>
                <select
                  value={lens}
                  onChange={(e) => setLens(e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {LENSES.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Aperture */}
              <div>
                <label className="text-xs font-semibold text-black mb-1 block">Aperture</label>
                <select
                  value={aperture}
                  onChange={(e) => setAperture(e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {APERTURES.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Shutter Speed */}
              <div>
                <label className="text-xs font-semibold text-black mb-1 block">Shutter Speed</label>
                <select
                  value={shutterSpeed}
                  onChange={(e) => setShutterSpeed(e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {SHUTTER_SPEEDS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* ISO */}
              <div>
                <label className="text-xs font-semibold text-black mb-1 block">ISO</label>
                <select
                  value={iso}
                  onChange={(e) => setIso(e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ISO_SETTINGS.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Center Panel - Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden rounded-2xl shadow-lg bg-white">
          <div className="bg-black text-white px-4 py-3 rounded-t-2xl h-12 flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1 px-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-white" />
              <span className="text-xs font-medium text-white">Back</span>
            </button>
            <h2 className="text-sm font-semibold flex-1 text-center">Create Image</h2>
            <div className="text-xs font-semibold text-white">
              {credits} Credits
            </div>
          </div>
          <div className="flex-1 flex flex-col gap-4 overflow-hidden p-4">
          {/* Canvas Preview */}
          <div
            className="flex-1 bg-gray-50 rounded-lg p-8 flex items-center justify-center overflow-hidden cursor-pointer hover:shadow-lg transition-shadow relative group"
            onClick={() => {
              if (selectedImage) {
                setFullscreenImageData(selectedImage)
                setFullscreenImage(selectedImage.image)
              }
            }}
            data-canvas
          >
            {isGenerating ? (
              <div className="text-center">
                <Loader className="w-16 h-16 mx-auto mb-4 animate-spin text-blue-600" />
                <p className="text-sm text-gray-600">Generating image...</p>
              </div>
            ) : selectedImage ? (
              <img
                src={selectedImage.image}
                alt="Generated"
                className="max-w-full max-h-full w-auto h-auto object-contain cursor-pointer rounded-lg shadow-lg"
                onClick={() => {
                  setFullscreenImage(selectedImage.image)
                  setFullscreenImageData(selectedImage)
                  const idx = history.findIndex(img => img.id === selectedImage.id)
                  setFullscreenImageIndex(Math.max(0, idx))
                }}
              />
            ) : (
              <div className="text-center">
                <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-30 text-gray-400" />
                <p className="text-sm text-gray-500">{aspectRatioLabels[aspectRatio]}</p>
              </div>
            )}
          </div>

          {/* Prompt Bar */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 flex flex-col gap-2">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what you want to create..."
              rows={6}
              maxLength={2000}
              className="w-full px-4 py-3 text-black placeholder-gray-500 bg-white border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <div className="flex justify-between items-center gap-2">
              <div className="flex gap-2 flex-1">
                {/* Action buttons - appear when image is selected */}
                {selectedImage && (
                  <>
                    <button
                      onClick={() => handleDownloadImage(selectedImage)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors flex items-center gap-2"
                      title="Download image"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                    <button
                      onClick={() => handleSaveImage(selectedImage)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded transition-colors flex items-center gap-2"
                      title="Save to project"
                    >
                      <Heart className="w-4 h-4" />
                      Save
                    </button>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{prompt.length}/2000</span>
                <button
                  title="Add reference image"
                  className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center"
                >
                  <span className="text-lg">+</span>
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || isGenerating || credits < calculateCost()}
                  className="px-4 py-2 bg-black text-white text-sm font-medium rounded hover:bg-gray-800 disabled:bg-gray-400 transition-colors whitespace-nowrap"
                >
                  {isGenerating ? 'Generating...' : `${selectedImage && prompt === originalPrompt ? 'Regenerate' : 'Generate'}`}
                </button>
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Right Panel - History */}
        <div className="w-64 flex flex-col rounded-2xl shadow-lg bg-white overflow-hidden">
          <div className="px-4 py-3 bg-black text-white rounded-t-2xl h-12 flex items-center justify-between">
            <div className="flex items-center justify-between w-full">
              <h2 className="text-sm font-semibold">Generated Images</h2>
              <button
                onClick={() => setShowTrash(!showTrash)}
                className="text-xs text-white hover:text-gray-200 font-medium"
              >
                {showTrash ? '← Back' : 'Trash'}
              </button>
            </div>
          </div>
          <div className="px-4 py-3 bg-white border-b border-gray-200 space-y-2">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-2 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select folder...</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-600">
              {showTrash
                ? `${history.filter(img => img.deletedAt).length} deleted`
                : `${history.filter(img => !img.deletedAt).length} image${history.filter(img => !img.deletedAt).length !== 1 ? 's' : ''}`}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 grid grid-cols-1 gap-2 auto-rows-max" data-library-container>
            {showTrash ? (
              // Trash view
              history.filter(img => img.deletedAt).length === 0 ? (
                <div key="empty-trash" className="flex items-center justify-center h-32 text-gray-500 text-sm">
                  Trash is empty
                </div>
              ) : (
                [...history].reverse().map((image, idx) => (
                  !image.deletedAt ? null : (
                    <div
                      key={`image-${image.id || image.timestamp}-${idx}`}
                      className="group relative bg-gray-100 rounded-lg overflow-hidden aspect-square cursor-pointer transition-all opacity-60 hover:opacity-100 col-span-1"
                    >
                      <img
                        src={image.image}
                        alt="Deleted"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                        <button
                          className="p-2 bg-white rounded-full hover:bg-gray-200 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRestoreImage(image.id)
                            setShowTrash(false)
                          }}
                          title="Restore"
                        >
                          <X className="w-4 h-4 text-gray-700" />
                        </button>
                        <button
                          className="p-2 bg-red-500 hover:bg-red-600 rounded-full text-white transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                            handlePermanentlyDeleteImage(image.id)
                          }}
                          title="Permanently Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                ))
              )
            ) : (
              // Active images view
              history.filter(img => !img.deletedAt).length === 0 ? (
                <div key="empty" className="flex items-center justify-center h-32 text-gray-500 text-sm">
                  No images yet
                </div>
              ) : (
                [...history].filter(img => !img.deletedAt).reverse().map((image, idx) => (
                  <div
                    key={`image-${image.id || image.timestamp}-${idx}`}
                    className={`group relative bg-gray-100 rounded-lg overflow-hidden aspect-square cursor-pointer transition-all col-span-1 ${
                      selectedImage?.id === image.id ? 'ring-2 ring-blue-500 ring-offset-1' : ''
                    }`}
                    onClick={() => {
                      setSelectedImage(image)
                      setSelectedImageIndex(idx)
                    }}
                  >
                    <img
                      src={image.image}
                      alt="Generated"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                      <button
                        className="p-2 bg-white rounded-full hover:bg-gray-200 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDownloadImage(image)
                        }}
                        title="Download"
                      >
                        <Download className="w-4 h-4 text-gray-700" />
                      </button>
                      <button
                        className="p-2 bg-white rounded-full hover:bg-gray-200 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSaveImage(image)
                        }}
                        title="Save"
                      >
                        <Heart className="w-4 h-4 text-gray-700" />
                      </button>
                      <button
                        className="p-2 bg-white rounded-full hover:bg-gray-200 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteImage(image.id)
                        }}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-gray-700" />
                      </button>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Modal with Actions */}
      {fullscreenImage && fullscreenImageData && (
        <div className="fixed inset-0 bg-black/90 z-[9999] flex" onClick={() => { setFullscreenImage(null); setFullscreenImageData(null); setImageZoom(1) }}>
          <div className="flex-1 flex items-center justify-center overflow-hidden p-4 relative" ref={imageContainerRef} onWheel={(e) => { e.preventDefault(); setImageZoom(Math.max(0.5, Math.min(5, imageZoom - e.deltaY * 0.001))) }} onClick={(e) => e.stopPropagation()}>
            <div
              className="overflow-auto"
              style={{ userSelect: 'none', cursor: isDragging ? 'grabbing' : 'grab', width: '100%', height: '100%' }}
              onMouseDown={(e) => {
                setIsDragging(true)
                setDragStart({ x: e.clientX, y: e.clientY })
              }}
              onMouseMove={(e) => {
                if (isDragging) {
                  const deltaX = e.clientX - dragStart.x
                  const deltaY = e.clientY - dragStart.y
                  const container = e.currentTarget
                  container.scrollLeft -= deltaX
                  container.scrollTop -= deltaY
                  setDragStart({ x: e.clientX, y: e.clientY })
                }
              }}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '100%', minHeight: '100%' }}>
                <img src={fullscreenImage} alt="Fullscreen" style={{ width: `${imageZoom * 100}%`, height: 'auto', flexShrink: 0 }} className="object-contain pointer-events-none" />
              </div>
            </div>
            {fullscreenImageIndex > 0 && <button onClick={(e) => { e.stopPropagation(); const newIdx = fullscreenImageIndex - 1; setFullscreenImageIndex(newIdx); setFullscreenImageData(history[newIdx] || null); setFullscreenImage(history[newIdx]?.image || null); setImageZoom(1) }} className="absolute left-4 top-1/2 transform -translate-y-1/2 p-3 bg-white/20 hover:bg-white/30 rounded-full shadow-lg transition-all z-10"><ChevronLeft className="w-8 h-8 text-white" /></button>}
            {fullscreenImageIndex < history.length - 1 && <button onClick={(e) => { e.stopPropagation(); const newIdx = fullscreenImageIndex + 1; setFullscreenImageIndex(newIdx); setFullscreenImageData(history[newIdx] || null); setFullscreenImage(history[newIdx]?.image || null); setImageZoom(1) }} className="absolute right-4 top-1/2 transform -translate-y-1/2 p-3 bg-white/20 hover:bg-white/30 rounded-full shadow-lg transition-all z-10"><ChevronRight className="w-8 h-8 text-white" /></button>}
          </div>

          <div className="w-96 bg-black/95 border-l border-gray-700 p-6 flex flex-col gap-4 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between flex-shrink-0">
              <div className="text-sm text-white font-medium">{fullscreenImageIndex + 1} of {history.length}</div>
              <button onClick={() => { setFullscreenImage(null); setFullscreenImageData(null); setImageZoom(1) }} className="p-2 hover:bg-gray-700 rounded-lg transition-colors"><X className="w-5 h-5 text-white" /></button>
            </div>

            <div className="text-xs text-white bg-gray-900 rounded-lg p-2 border border-gray-700 flex-shrink-0">Scroll image to zoom (50% - 500%) | Current: {Math.round(imageZoom * 100)}%</div>

            <div className="flex flex-col gap-2 flex-1 min-h-0">
              <p className="text-xs text-white uppercase font-semibold flex-shrink-0">Prompt</p>
              <p className="text-white text-sm break-words bg-gray-900 rounded-lg p-3 border border-gray-700 overflow-y-auto flex-1">{fullscreenImageData?.prompt && fullscreenImageData.prompt.trim().length > 0 ? fullscreenImageData.prompt : '(No prompt saved for this image)'}</p>
            </div>

            <div className="flex flex-col gap-2 pt-4 border-t border-gray-700 flex-shrink-0">
              <button onClick={(e) => { e.stopPropagation(); handleDownloadImage(fullscreenImageData) }} className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"><Download className="w-4 h-4" /> Download</button>
              <button onClick={(e) => { e.stopPropagation(); handleSaveImage(fullscreenImageData) }} className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"><ImagePlay className="w-4 h-4" /> Save to Project</button>
              <button onClick={(e) => { e.stopPropagation(); handleDeleteImage(fullscreenImageData.id); setFullscreenImage(null); setFullscreenImageData(null); setImageZoom(1) }} className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"><Trash2 className="w-4 h-4" /> Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Save to Project Dialog */}
      {showSaveDialog && imageToSave && (
        <div
          className="fixed inset-0 z-[9998] bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowSaveDialog(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Save to Project</h2>

            <div className="space-y-4">
              {/* Option 1: Create New Project */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  📁 Create New Project
                </label>
                <input
                  type="text"
                  placeholder="Enter project name..."
                  value={newProjectName}
                  onChange={(e) => {
                    setNewProjectName(e.target.value)
                    setSelectedProjectId('')
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Create a new folder to organize your images</p>
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-600 font-medium">or</span>
                </div>
              </div>

              {/* Option 2: Choose Existing Project */}
              {projects.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    📂 Choose Existing Project
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => {
                      setSelectedProjectId(e.target.value)
                      setNewProjectName('')
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a project...</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
                  disabled={isSavingProject}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveToProject}
                  disabled={isSavingProject || (!selectedProjectId && !newProjectName.trim())}
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSavingProject && <Loader className="w-4 h-4 animate-spin" />}
                  {isSavingProject ? 'Saving...' : 'Save Image'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Storage Quota Exceeded Modal */}
      {showStorageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 p-8">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-bold text-center text-gray-900">Storage Limit Reached</h3>
            <p className="mt-3 text-sm text-gray-600 text-center">
              {storageError || 'You have reached your storage limit. Upgrade your plan or purchase extra storage to continue.'}
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={() => router.push('/dashboard/settings/billing')}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
              >
                Upgrade Plan or Add Storage
              </button>
              <button
                onClick={() => setShowStorageModal(false)}
                className="w-full px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Overlay Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="bg-gray-900 rounded-lg overflow-hidden max-w-4xl max-h-[90vh] flex flex-col shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-white font-semibold">Generated Image</h3>
              <button
                onClick={() => setSelectedImage(null)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                title="Close (Esc)"
              >
                <X className="w-6 h-6 text-gray-300 hover:text-white" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex items-center justify-center p-6 bg-black/50 relative">
              <img
                src={selectedImage.image}
                alt="Generated"
                className="max-w-full max-h-full object-contain rounded"
              />

              {/* Navigation Arrows */}
              {history.filter(img => !img.deletedAt).length > 1 && (
                <>
                  <button
                    onClick={() => {
                      const activeImages = [...history].filter(img => !img.deletedAt).reverse()
                      const newIndex = selectedImageIndex === 0 ? activeImages.length - 1 : selectedImageIndex - 1
                      setSelectedImage(activeImages[newIndex])
                      setSelectedImageIndex(newIndex)
                    }}
                    className="absolute left-2 p-2 bg-white/20 hover:bg-white/40 rounded-full transition-colors"
                    title="Newer images"
                  >
                    <ChevronLeft className="w-6 h-6 text-white" />
                  </button>

                  <button
                    onClick={() => {
                      const activeImages = [...history].filter(img => !img.deletedAt).reverse()
                      const newIndex = (selectedImageIndex + 1) % activeImages.length
                      setSelectedImage(activeImages[newIndex])
                      setSelectedImageIndex(newIndex)
                    }}
                    className="absolute right-2 p-2 bg-white/20 hover:bg-white/40 rounded-full transition-colors"
                    title="Older images"
                  >
                    <ChevronRight className="w-6 h-6 text-white" />
                  </button>
                </>
              )}
            </div>

            <div className="p-4 border-t border-gray-700 bg-gray-900">
              <div className="mb-4">
                <p className="text-sm text-gray-400 mb-2">Prompt:</p>
                <p className="text-sm text-white bg-gray-800 p-3 rounded line-clamp-3">
                  {selectedImage.prompt}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedImage.prompt)
                    alert('Prompt copied!')
                  }}
                  className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" /> Copy Prompt
                </button>
                <button
                  onClick={() => {
                    const link = document.createElement('a')
                    link.href = selectedImage.image
                    link.download = `image-${selectedImage.id || selectedImage.timestamp}.jpg`
                    link.click()
                  }}
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" /> Download
                </button>
                <button
                  onClick={() => {
                    handleDeleteImage(selectedImage.id)
                    setSelectedImage(null)
                  }}
                  className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
