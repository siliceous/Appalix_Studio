'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Trash2, Search, Loader2, X, ChevronLeft, ChevronRight, Plus, Eye, Save, Sparkles, Heart } from 'lucide-react'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'

import { SageToolbar } from '@/components/dashboard/sage-toolbar'

interface GeneratedImage {
  id: string
  image: string
  prompt: string
  timestamp: number
  deletedAt?: number
  aspectRatio?: string
  projectId?: string
  projectName?: string
  model?: string
  parsedMetadata?: {
    gender?: string
    age?: string
    type?: string
    situation?: string[]
    accessories?: string[]
    emotions?: string[]
    skinTone?: string
  }
}

interface Project {
  id: string
  name: string
}

const SKIN_TONES = [
  { name: 'Light', color: '#FDBCB4' },
  { name: 'Fair', color: '#E8B4A8' },
  { name: 'Medium', color: '#D7A89C' },
  { name: 'Tan', color: '#C68E84' },
  { name: 'Brown', color: '#8B5A3C' },
  { name: 'Deep', color: '#3E2723' },
]

const GENDERS = ['Female', 'Male', 'Neutral']
const AGES = ['Senior', 'Adult', 'Young Adult', 'Kid']
const TYPES = ['Newly Added', 'HD', 'Exclusive For Pro', 'Free Speech', 'Real']
const SITUATIONS = [
  'AI Avatar', 'Airport', 'Arc Left', 'Arc Right', 'ASMR', 'Balcony',
  'Bathroom', 'Beach', 'Boat', 'Bullet Time', 'Car', 'Christmas', 'Coffee Shop',
  'Cooking', 'Crane Down', 'Crane Overhead', 'Crane Up', 'Dolly Left', 'Dolly Right',
  'Dolly Zoom In', 'Dolly Zoom Out', 'Drink', 'Dutch Tilt Reveal', 'Family', 'Firefighter',
  'Formal', 'Gaming', 'Glam Push', 'Green Screen', 'GRWM', 'Gym', 'Hannukah', 'Historical',
  'Home', 'Hook', 'Hyperlapse Simulation', 'Interview', 'Jib Down', 'Jib Up', 'Kitchen',
  'Mall', 'Medical', 'Movement', 'Multi-Frame', 'Nature', 'News Anchor', 'Night', 'Office',
  'Orbit 360', 'Outside', 'Pan Left Slow', 'Pan Right Slow', 'Plane', 'Podcast', 'Pointing',
  'Pool', 'Pregnant', 'Pull Out', 'Push In', 'Rack Focus Sim', 'Reverse', 'Sitting', 'Skit',
  'Snow', 'Store', 'Streaming', 'Street', 'Studio', 'Super Dolly In', 'Super Dolly Out',
  'Talk', 'Walking', 'Whip Pan', 'Yo-Yo Zoom', 'Yoga', 'Zoom In Rapid', 'Zoom In Slow',
  'Zoom Out Rapid', 'Zoom Out Slow',
]
const ACCESSORIES = [
  'Bags', 'Bathrobe', 'Book', 'Candle', 'Cards', 'Dishes', 'Drink', 'Dumbbells', 'Food',
  'Fridge', 'Fruit', 'Glasses', 'Guitar', 'Hat', 'Headphone', 'Hijab', 'Jar', 'Jewels',
  'Knit', 'Laptop', 'Mic', 'Mirror', 'Mug', 'Pet', 'Phone', 'Piano', 'Plant', 'Present',
  'Scarf', 'Shoes', 'Suit', 'Tools', 'Trash Can', 'Tree',
]
const EMOTIONS = ['Calm', 'Enthusiastic', 'Excited', 'Frustrated', 'Happy', 'Sad', 'Serious', 'Smiling']

function parseImageMetadata(prompt: string) {
  const metadata: GeneratedImage['parsedMetadata'] = {
    situation: [],
    accessories: [],
    emotions: [],
  }

  const promptLower = prompt.toLowerCase()

  // Parse Gender
  if (promptLower.includes('woman') || promptLower.includes('female') || promptLower.includes('girl')) {
    metadata.gender = 'Female'
  } else if (promptLower.includes('man') || promptLower.includes('male') || promptLower.includes('boy')) {
    metadata.gender = 'Male'
  } else if (promptLower.includes('neutral') || promptLower.includes('non-binary')) {
    metadata.gender = 'Neutral'
  }

  // Parse Age
  if (promptLower.includes('senior') || promptLower.includes('elderly') || promptLower.includes('old')) {
    metadata.age = 'Senior'
  } else if (promptLower.includes('adult')) {
    metadata.age = 'Adult'
  } else if (promptLower.includes('young adult') || promptLower.includes('youth')) {
    metadata.age = 'Young Adult'
  } else if (promptLower.includes('kid') || promptLower.includes('child') || promptLower.includes('boy') || promptLower.includes('girl')) {
    metadata.age = 'Kid'
  }

  // Parse Situations
  SITUATIONS.forEach(situation => {
    if (promptLower.includes(situation.toLowerCase())) {
      metadata.situation?.push(situation)
    }
  })

  // Parse Accessories
  ACCESSORIES.forEach(accessory => {
    if (promptLower.includes(accessory.toLowerCase())) {
      metadata.accessories?.push(accessory)
    }
  })

  // Parse Emotions
  EMOTIONS.forEach(emotion => {
    if (promptLower.includes(emotion.toLowerCase())) {
      metadata.emotions?.push(emotion)
    }
  })

  // Parse Skin Tone
  const skinToneMatches = SKIN_TONES.filter(tone => promptLower.includes(tone.name.toLowerCase()))
  if (skinToneMatches.length > 0) {
    metadata.skinTone = skinToneMatches[0].name
  }

  return metadata
}

export default function TalkingActors() {
  console.log('[TalkingActors] Component mounted')
  const router = useRouter()
  const imageContainerRef = useRef<HTMLDivElement>(null)
  const [images, setImages] = useState<GeneratedImage[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [workspaceId, setWorkspaceId] = useState('')
  const [fullscreenImage, setFullscreenImage] = useState<GeneratedImage | null>(null)
  const [fullscreenImageIndex, setFullscreenImageIndex] = useState(0)
  const [showCreateProjectDialog, setShowCreateProjectDialog] = useState(false)
  const [createProjectName, setCreateProjectName] = useState('')
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [selectedMediaType, setSelectedMediaType] = useState<string | null>(null)
  const [selectedGender, setSelectedGender] = useState<string | null>(null)
  const [selectedDateRange, setSelectedDateRange] = useState<string | null>(null)
  const [credits, setCredits] = useState(0)
  const [imageZoom, setImageZoom] = useState(0.5)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [imageToSave, setImageToSave] = useState<GeneratedImage | null>(null)
  const [selectedFolderId, setSelectedFolderId] = useState<string>('')
  const [folders, setFolders] = useState<any[]>([])
  const [newFolderName, setNewFolderName] = useState('')
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)

  // Actor creation filters
  const [selectedGenders, setSelectedGenders] = useState<string[]>([])
  const [selectedAges, setSelectedAges] = useState<string[]>([])
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedSituations, setSelectedSituations] = useState<string[]>([])
  const [selectedAccessories, setSelectedAccessories] = useState<string[]>([])
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([])
  const [selectedSkinTone, setSelectedSkinTone] = useState<string>('')
  const [actorName, setActorName] = useState('')
  const [showTrash, setShowTrash] = useState(false)
  const [presetActors, setPresetActors] = useState<any[]>([])
  const [showPresets, setShowPresets] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [selectedImageForPreset, setSelectedImageForPreset] = useState<GeneratedImage | null>(null)
  const [selectedActorIds, setSelectedActorIds] = useState<Set<string>>(new Set())
  const [isSavingBulk, setIsSavingBulk] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [presetImageIds, setPresetImageIds] = useState<Set<string>>(new Set())
  const [isMainWorkspace, setIsMainWorkspace] = useState(false)

  useEffect(() => {
    const wId = typeof window !== 'undefined' ? localStorage.getItem('workspaceId') || '' : ''
    setWorkspaceId(wId)

    const fetchImages = async () => {
      try {
        setLoading(true)
        setLoading(false)
      } catch (error) {
        console.error('Error loading images:', error)
        setLoading(false)
      }
    }

    fetchImages()

    const fetchCredits = async () => {
      try {
        const response = await fetch('/api/wallet/balance', { headers: { 'x-workspace-id': wId } })
        if (response.ok) {
          const data = await response.json()
          setCredits(data.credits || 0)
        }
      } catch (error) {
        console.error('Error loading credits:', error)
      }
    }
    if (wId) fetchCredits()
  }, [])

  useEffect(() => {
    if (!workspaceId) return
    console.log("[TalkingActors] Initializing - loading saved images and checking for imports...")

    // TEMP: Clear all localStorage for this workspace (reset)
    localStorage.removeItem(`talkingActorsImages-${workspaceId}`);
    sessionStorage.removeItem("selectedActorImages");

    // Step 1: Load persisted images from localStorage
    let savedImages: GeneratedImage[] = []
    const saved = localStorage.getItem(`talkingActorsImages-${workspaceId}`)
    if (saved) {
      try {
        savedImages = JSON.parse(saved)
        console.log("[TalkingActors] ✓ Loaded", savedImages.length, "images from localStorage")
      } catch (e) {
        console.error("[TalkingActors] Error loading saved images:", e)
      }
    }

    // Step 2: Check for imported images from sessionStorage
    const selectedActors = sessionStorage.getItem("selectedActorImages")
    if (selectedActors) {
      try {
        const importedImages = JSON.parse(selectedActors)
        console.log("[TalkingActors] ✓ Found", importedImages.length, "selected actor images to import")

        // Parse metadata for each imported image
        const parsedImages = importedImages.map((img: GeneratedImage) => ({
          ...img,
          parsedMetadata: parseImageMetadata(img.prompt)
        }))

        // Filter out duplicates by image URL (most reliable dedup key)
        const existingUrls = new Set(savedImages.map(img => img.image))
        const uniqueNewImages = parsedImages.filter((img: GeneratedImage) => {
          return !existingUrls.has(img.image)
        })
        console.log("[TalkingActors] Adding", uniqueNewImages.length, "new unique images")
        console.log("[TalkingActors] New image URLs:", uniqueNewImages.map((img: GeneratedImage) => img.image))

        // Merge imported + saved (new images on top)
        const merged = [...uniqueNewImages, ...savedImages]

        // Persist to localStorage
        localStorage.setItem(`talkingActorsImages-${workspaceId}`, JSON.stringify(merged))
        console.log("[TalkingActors] ✓ Saved", merged.length, "total images to localStorage")

        // Also save new imported images to Supabase so they appear on all workspaces
        if (typeof window !== 'undefined' && uniqueNewImages.length > 0) {
          (async () => {
            try {
              const supabase = createSupabaseClient()
              const { data: { session } } = await supabase.auth.getSession()
              const authHeader = session?.access_token ? `Bearer ${session.access_token}` : undefined

              for (const img of uniqueNewImages) {
                try {
                  const actorName = img.prompt?.split(' ').slice(0, 5).join(' ') || 'Imported Actor'
                  await fetch('/api/talking-actors/save-actor', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'x-workspace-id': workspaceId,
                      ...(authHeader ? { 'Authorization': authHeader } : {})
                    },
                    body: JSON.stringify({
                      workspaceId,
                      name: actorName,
                      imageUrl: img.image,
                      description: img.prompt,
                      aspectRatio: img.aspectRatio || '1:1',
                    }),
                  })
                  console.log('[TalkingActors] Saved to Supabase:', actorName)
                } catch (e) {
                  console.error('[TalkingActors] Error saving to Supabase:', e)
                }
              }
            } catch (e) {
              console.error('[TalkingActors] Error syncing to Supabase:', e)
            }
          })()
        }

        // Update state with merged data (this is the only setImages call)
        setImages(merged)

        sessionStorage.removeItem("selectedActorImages")
        console.log("[TalkingActors] ✓ Import complete -", uniqueNewImages.length, "images imported")
      } catch (e) {
        console.error("[TalkingActors] ✗ Error importing actor images:", e)
        // If import fails, just load saved images
        setImages(savedImages)
      }
    } else {
      // No imports, just load saved images
      setImages(savedImages)
    }
  }, [workspaceId])


  useEffect(() => {
    console.log('[TalkingActors] checkIsMainWorkspace useEffect fired, workspaceId:', workspaceId)
    if (!workspaceId) {
      console.log('[TalkingActors] workspaceId is empty, skipping')
      return
    }
    const checkIsMainWorkspace = async () => {
      try {
        const supabase = createSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
        const userEmail = user?.email || ''
        console.log('[TalkingActors] Current user email:', userEmail)
        
        const isMain = userEmail === 'info@gorank.com.au' || userEmail === 'sales@appalix.ai'
        console.log('[TalkingActors] isMainWorkspace:', isMain)
        setIsMainWorkspace(isMain)
      } catch (error) {
        console.error('[TalkingActors] Error checking workspace:', error)
      }
    }
    checkIsMainWorkspace()
  }, [workspaceId])

  useEffect(() => {
    if (!workspaceId) return
    const fetchProjects = async () => {
      try {
        const supabase = createSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        let authHeader: string | undefined
        authHeader = session?.access_token ? `Bearer ${session.access_token}` : undefined

        const response = await fetch('/api/projects', { headers: { 'x-workspace-id': workspaceId, ...(authHeader ? { 'Authorization': authHeader } : {}) } })
        if (response.ok) {
          const data = await response.json()
          setProjects(data.projects || [])
        }
      } catch (error) {
        console.error('Error loading projects:', error)
      }
    }
    fetchProjects()
  }, [workspaceId])

  useEffect(() => {
    if (!workspaceId) return
    const fetchSavedActors = async () => {
      try {
        console.log('[TalkingActors] Fetching saved actors from database...')

        let workspaceRes: Response | undefined
        let presetsRes: Response | undefined
        const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost'

        if (!isProduction) {
          // Get auth token from Supabase session
          const supabase = createSupabaseClient();
          const {
            data: { session },
          } = await supabase.auth.getSession();
          const authHeader = session?.access_token
            ? `Bearer ${session.access_token}`
            : undefined;

          const requestHeaders: HeadersInit = authHeader
            ? {
                Authorization: authHeader,
              }
            : {};

          // Fetch both workspace-specific and preset actors on localhost
          [workspaceRes, presetsRes] = await Promise.all([
            fetch(`/api/talking-actors/workspace/${workspaceId}`, {
              headers: { 'x-workspace-id': workspaceId, ...requestHeaders },
            }),
            fetch(`/api/talking-actors/presets`, {
              headers: { 'x-workspace-id': workspaceId, ...requestHeaders },
            }),
          ]);
        } else {
          console.log('[TalkingActors] Running on production, using localStorage only')
        }

        let allDbActors: any[] = []
        let presetIds = new Set<string>()
        const seenIds = new Set<string>()

        // Get workspace-specific actors (only on localhost)
        if (workspaceRes?.ok) {
          const data = await workspaceRes.json()
          console.log('[TalkingActors] Loaded', data.actors?.length || 0, 'workspace actors', data)
          data.actors?.forEach((actor: any) => {
            if (!seenIds.has(actor.id)) {
              seenIds.add(actor.id)
              allDbActors.push(actor)
            }
          })
        } else if (workspaceRes) {
          const error = await workspaceRes.text()
          console.error('[TalkingActors] Workspace fetch failed:', workspaceRes.status, error)
        }

        // Get published preset actors (available to all - only on localhost)
        if (presetsRes?.ok) {
          const data = await presetsRes.json()
          console.log('[TalkingActors] Loaded', data.presets?.length || 0, 'preset actors')
          // Track which ones are presets and deduplicate
          data.presets?.forEach((preset: any) => {
            presetIds.add(preset.id)
            if (!seenIds.has(preset.id)) {
              seenIds.add(preset.id)
              allDbActors.push(preset)
            }
          })
        }

        if (allDbActors.length > 0) {
          // Convert database actors to GeneratedImage format for display
          const dbActors = allDbActors.map((actor: any) => ({
            id: actor.id,
            image: actor.image_url,
            prompt: actor.description || actor.name || '',
            model: 'saved-actor',
            timestamp: actor.created_at,
            aspectRatio: actor.aspect_ratio || '1:1'
          }))

          // Merge with localStorage images
          let savedImages: GeneratedImage[] = []
          const saved = localStorage.getItem(`talkingActorsImages-${workspaceId}`)
          if (saved) {
            try {
              savedImages = JSON.parse(saved)
            } catch (e) {
              console.error('[TalkingActors] Error parsing localStorage:', e)
            }
          }

          // Combine database actors + localStorage images (avoid duplicates by ID and URL)
          const existingIds = new Set(savedImages.map(img => img.id))
          const existingUrls = new Set(savedImages.map(img => img.image))
          const newDbActors = dbActors.filter((actor: any) => !existingIds.has(actor.id) && !existingUrls.has(actor.image))
          const combined = [...newDbActors, ...savedImages]

          setImages(combined)
          setPresetImageIds(presetIds)
        }
      } catch (error) {
        console.error('[TalkingActors] Error fetching saved actors:', error)
      }
    }
    fetchSavedActors()
  }, [workspaceId])

  useEffect(() => {
    if (!workspaceId) return
    const fetchFolders = async () => {
      try {
        const supabase = createSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        let authHeader: string | undefined
        authHeader = session?.access_token ? `Bearer ${session.access_token}` : undefined
        const response = await fetch('/api/ai-studio/actor-folders', { headers: { 'x-workspace-id': workspaceId, ...(authHeader ? { 'Authorization': authHeader } : {}) } })
        if (response.ok) {
          const data = await response.json()
          setFolders(data.folders || [])
        }
        // Silently ignore 404 - folders feature not yet implemented
      } catch (error) {
        // Silently ignore - folders API not available
      }
    }
    fetchFolders()
  }, [workspaceId])

  // Fetch preset actors
  useEffect(() => {
    const fetchPresets = async () => {
      try {
        console.log('[Presets] Fetching presets...')
        const response = await fetch('/api/talking-actors/presets')
        console.log('[Presets] Response status:', response.status)
        if (response.ok) {
          const data = await response.json()
          console.log('[Presets] Loaded:', data.presets?.length || 0, 'presets')
          setPresetActors(data.presets || [])
        } else {
          const error = await response.text()
          console.error('[Presets] Error response:', response.status, error)
        }
      } catch (error) {
        console.error('[Presets] Fetch error:', error)
      }
    }
    fetchPresets()
  }, [])

  const handlePublishAsPreset = async (imageId: string) => {
    console.log('[Publish] workspaceId:', workspaceId)
    if (workspaceId !== 'info@gorank.com.au') {
      alert('Only info@gorank.com.au workspace can publish presets')
      return
    }

    const image = images.find(img => img.id === imageId)
    if (!image) return

    setIsPublishing(true)
    try {
      console.log('[Publish] Publishing actor:', imageId)
      const response = await fetch('/api/talking-actors/publish-preset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': workspaceId,
        },
        body: JSON.stringify({
          actorId: imageId,
          workspaceId,
        }),
      })

      if (response.ok) {
        alert('✅ Actor published as preset!')
        setSelectedImageForPreset(null)
        // Refresh presets
        const presetsResponse = await fetch('/api/talking-actors/presets')
        if (presetsResponse.ok) {
          const data = await presetsResponse.json()
          setPresetActors(data.presets || [])
        }
      } else {
        const error = await response.json()
        alert('❌ ' + (error.error || 'Failed to publish'))
      }
    } catch (error) {
      console.error('Error publishing preset:', error)
      alert('Error publishing preset')
    } finally {
      setIsPublishing(false)
    }
  }

  const handleCopyPreset = async (presetId: string) => {
    try {
      const response = await fetch('/api/talking-actors/copy-preset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          presetActorId: presetId,
          workspaceId,
        }),
      })

      if (response.ok) {
        alert('✅ Preset actor copied to your workspace!')
        // Refresh images
        window.location.reload()
      } else {
        const error = await response.json()
        alert('❌ ' + (error.error || 'Failed to copy'))
      }
    } catch (error) {
      console.error('Error copying preset:', error)
      alert('Error copying preset')
    }
  }

  const handleSaveActorToDatabase = async (image: GeneratedImage) => {
    const actorName = prompt('Enter actor name:', image.prompt?.split(' ').slice(0, 3).join(' ') || 'Actor')
    if (!actorName) return

    try {
      console.log('[SaveActor] Saving actor to database:', actorName)
      const response = await fetch('/api/talking-actors/save-actor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': workspaceId,
        },
        body: JSON.stringify({
          workspaceId,
          name: actorName,
          imageUrl: image.image,
          description: image.prompt,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        alert('✅ Actor saved to database!')
        console.log('[SaveActor] Saved:', data.actor)
      } else {
        const error = await response.json()
        alert('❌ ' + (error.error || 'Failed to save'))
      }
    } catch (error) {
      console.error('Error saving actor:', error)
      alert('Error saving actor to database')
    }
  }

  const handleBulkSaveActors = async () => {
    const selectedImages = filteredImages.filter(img => selectedActorIds.has(img.id))

    if (selectedImages.length === 0) {
      alert('Please select at least one actor to save')
      return
    }

    setIsSavingBulk(true)
    let saved = 0

    try {
      for (const image of selectedImages) {
        const actorName = image.prompt?.split(' ').slice(0, 5).join(' ') || `Actor ${saved + 1}`
        const ratio = image.aspectRatio || '1:1'
        console.log(`[BulkSave] Image ${saved + 1}: aspectRatio=${ratio}, id=${image.id}`)

        const response = await fetch('/api/talking-actors/save-actor', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-workspace-id': workspaceId,
          },
          body: JSON.stringify({
            workspaceId,
            name: actorName,
            imageUrl: image.image,
            description: image.prompt,
            aspectRatio: ratio,
          }),
        })

        if (response.ok) {
          saved++
          console.log(`[BulkSave] Saved ${saved}/${selectedImages.length}`)
        }
      }

      alert(`✅ Successfully saved ${saved}/${selectedImages.length} actors to database`)
      setSelectedActorIds(new Set())
    } catch (error) {
      console.error('Error bulk saving actors:', error)
      alert(`❌ Error saving actors. Saved ${saved}/${selectedImages.length} before error`)
    } finally {
      setIsSavingBulk(false)
    }
  }

  const handlePublishAsPresets = async () => {
    // Only allow publishing non-preset actors
    const selectedImages = filteredImages.filter(img => selectedActorIds.has(img.id) && !presetImageIds.has(img.id))

    if (selectedImages.length === 0) {
      alert('Please select at least one non-preset actor to publish')
      return
    }

    setIsPublishing(true)
    let published = 0

    try {
      for (const image of selectedImages) {
        // First, ensure actor is saved to database
        const actorName = image.prompt?.split(' ').slice(0, 5).join(' ') || `Actor ${published + 1}`

        // Save to database if not already saved (check if has database ID)
        let actorId = image.id
        if (image.model !== 'saved-actor') {
          console.log('[PublishPreset] Saving new actor:', actorName)
          const saveRes = await fetch('/api/talking-actors/save-actor', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-workspace-id': workspaceId,
            },
            body: JSON.stringify({
              workspaceId,
              name: actorName,
              imageUrl: image.image,
              description: image.prompt,
              aspectRatio: image.aspectRatio || '1:1',
            }),
          })

          if (saveRes.ok) {
            const saveData = await saveRes.json()
            actorId = saveData.actor?.id
            console.log('[PublishPreset] Saved, got ID:', actorId)

            if (!actorId) {
              console.error('[PublishPreset] Save returned no actor ID')
              continue
            }
          } else {
            const error = await saveRes.json()
            console.error('[PublishPreset] Save failed:', error)
            continue
          }
        }

        // Now publish as preset
        console.log('[PublishPreset] Publishing actor:', { actorId, workspaceId })
        const response = await fetch('/api/talking-actors/publish-preset', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-workspace-id': workspaceId,
          },
          body: JSON.stringify({
            actorId: actorId,
            workspaceId: workspaceId,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          console.log('[PublishPreset] Success:', data)
          published++
        } else {
          const error = await response.json()
          console.error('[PublishPreset] Publish failed:', error)
        }
      }

      alert(`✅ Successfully published ${published}/${selectedImages.length} actors as presets`)
      setSelectedActorIds(new Set())
    } catch (error) {
      console.error('Error publishing presets:', error)
      alert(`❌ Error publishing presets. Published ${published}/${selectedImages.length} before error`)
    } finally {
      setIsPublishing(false)
    }
  }

  const toggleActorSelection = (imageId: string) => {
    // Don't allow selecting preset actors
    if (presetImageIds.has(imageId)) {
      return
    }
    const newSelected = new Set(selectedActorIds)
    if (newSelected.has(imageId)) {
      newSelected.delete(imageId)
    } else {
      newSelected.add(imageId)
    }
    setSelectedActorIds(newSelected)
  }

  const deletedImages = images.filter((img) => img.deletedAt).sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0))

  const filteredImages = images.filter((img) => {
    if (img.deletedAt) return false
    const promptLower = img.prompt.toLowerCase()
    const meta = img.parsedMetadata

    // Search query filter
    const matchesSearch = !searchQuery || promptLower.includes(searchQuery.toLowerCase())

    // Gender filter
    const matchesGender = selectedGenders.length === 0 ||
      selectedGenders.some(g => meta?.gender === g)

    // Age filter
    const matchesAge = selectedAges.length === 0 ||
      selectedAges.some(a => meta?.age === a)

    // Type filter
    const matchesType = selectedTypes.length === 0 ||
      selectedTypes.some(t => promptLower.includes(t.toLowerCase()))

    // Situation filter
    const matchesSituation = selectedSituations.length === 0 ||
      selectedSituations.some(s => meta?.situation?.includes(s))

    // Accessories filter
    const matchesAccessories = selectedAccessories.length === 0 ||
      selectedAccessories.some(a => meta?.accessories?.includes(a))

    // Emotions filter
    const matchesEmotions = selectedEmotions.length === 0 ||
      selectedEmotions.some(e => meta?.emotions?.includes(e))

    // Skin tone filter
    const matchesSkinTone = !selectedSkinTone || meta?.skinTone === selectedSkinTone

    // Date filter
    let matchesDate = true
    if (selectedDateRange) {
      const now = Date.now()
      const diffDays = (now - img.timestamp) / (1000 * 60 * 60 * 24)
      if (selectedDateRange === 'today') matchesDate = diffDays < 1
      else if (selectedDateRange === 'week') matchesDate = diffDays < 7
      else if (selectedDateRange === 'month') matchesDate = diffDays < 30
      else if (selectedDateRange === 'year') matchesDate = diffDays < 365
    }

    return matchesSearch && matchesGender && matchesAge && matchesType && matchesSituation &&
           matchesAccessories && matchesEmotions && matchesSkinTone && matchesDate
  })

  const handleDelete = async (imageId: string) => {
    const updated = images.map(img => img.id === imageId ? { ...img, deletedAt: Date.now() } : img)
    setImages(updated)
    localStorage.setItem(`talkingActorsImages-${workspaceId}`, JSON.stringify(updated))

    try {
      const savedHistory = localStorage.getItem(`imageGenerationHistory-${workspaceId}`)
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory)
        const updatedHistory = parsed.map((img: any) => img.id === imageId ? { ...img, deletedAt: Date.now() } : img)
        localStorage.setItem(`imageGenerationHistory-${workspaceId}`, JSON.stringify(updatedHistory))
      }
    } catch (e) {
      console.error('Error updating localStorage:', e)
    }

    try {
      const talkingAdHistory = localStorage.getItem(`talkingAdHistory-${workspaceId}`)
      if (talkingAdHistory) {
        const parsed = JSON.parse(talkingAdHistory)
        const updatedHistory = parsed.map((v: any) => v.id === imageId ? { ...v, deletedAt: Date.now() } : v)
        localStorage.setItem(`talkingAdHistory-${workspaceId}`, JSON.stringify(updatedHistory))
      }
    } catch (e) {
      console.error('Error updating talking ad history:', e)
    }

    // Sync deletion to server
    try {
      await fetch('/api/ai-studio/trash-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': workspaceId,
        },
        body: JSON.stringify({ image_id: imageId }),
      })
      console.log('[TalkingActors] Image deletion synced to server:', imageId)
    } catch (e) {
      console.error('[TalkingActors] Error syncing image deletion to server:', e)
    }
  }

  const handleRestore = async (imageId: string) => {
    const updated = images.map(img => img.id === imageId ? { ...img, deletedAt: undefined } : img)
    setImages(updated)
    localStorage.setItem(`talkingActorsImages-${workspaceId}`, JSON.stringify(updated))

    try {
      const savedHistory = localStorage.getItem(`imageGenerationHistory-${workspaceId}`)
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory)
        const updatedHistory = parsed.map((img: any) => img.id === imageId ? { ...img, deletedAt: undefined } : img)
        localStorage.setItem(`imageGenerationHistory-${workspaceId}`, JSON.stringify(updatedHistory))
      }
    } catch (e) {
      console.error('Error updating localStorage:', e)
    }

    // Sync restoration to server
    try {
      await fetch('/api/ai-studio/restore-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': workspaceId,
        },
        body: JSON.stringify({ image_id: imageId }),
      })
      console.log('[TalkingActors] Image restoration synced to server:', imageId)
    } catch (e) {
      console.error('[TalkingActors] Error syncing image restoration to server:', e)
    }
  }

  const handlePermanentDelete = async (imageId: string) => {
    try {
      const response = await fetch('/api/ai-studio/permanently-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': workspaceId,
        },
        body: JSON.stringify({ image_id: imageId }),
      })
      if (response.ok) {
        console.log('[TalkingActors] Image scheduled for permanent deletion:', imageId)
      } else {
        console.warn('[TalkingActors] Failed to schedule permanent deletion:', response.status)
      }
    } catch (e) {
      console.error('[TalkingActors] Error scheduling permanent deletion:', e)
    }
  }

  const handleSaveToFolder = (image: GeneratedImage) => {
    setImageToSave(image)
    setShowSaveDialog(true)
  }

  const handleSaveImage = async () => {
    if (!imageToSave || !selectedFolderId) {
      alert('Please select a folder')
      return
    }

    try {
      const response = await fetch('/api/ai-studio/actor-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': workspaceId,
        },
        body: JSON.stringify({
          image_url: imageToSave.image,
          prompt: imageToSave.prompt,
          folder_id: selectedFolderId,
        }),
      })

      if (response.ok) {
        alert('Image saved to folder!')
        setShowSaveDialog(false)
        setImageToSave(null)
        setSelectedFolderId('')
      } else {
        alert('Failed to save image')
      }
    } catch (error) {
      console.error('Save error:', error)
      alert('Failed to save image')
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    setIsCreatingFolder(true)

    try {
      const response = await fetch('/api/ai-studio/actor-folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': workspaceId,
        },
        body: JSON.stringify({ name: newFolderName }),
      })

      if (response.ok) {
        const newFolder = await response.json()
        setFolders([...folders, newFolder])
        setSelectedFolderId(newFolder.id)
        setNewFolderName('')
      }
    } catch (error) {
      console.error('Create folder error:', error)
    } finally {
      setIsCreatingFolder(false)
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!fullscreenImage) return
      if (e.key === 'Escape') setFullscreenImage(null)
      else if (e.key === 'ArrowLeft' && fullscreenImageIndex > 0) {
        const newIdx = fullscreenImageIndex - 1
        setFullscreenImageIndex(newIdx)
        setFullscreenImage(filteredImages[newIdx])
        setImageZoom(0.5)
      } else if (e.key === 'ArrowRight' && fullscreenImageIndex < filteredImages.length - 1) {
        const newIdx = fullscreenImageIndex + 1
        setFullscreenImageIndex(newIdx)
        setFullscreenImage(filteredImages[newIdx])
        setImageZoom(0.5)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [fullscreenImage, fullscreenImageIndex, filteredImages])

  return (
    <div className="-m-8 flex flex-col h-screen overflow-hidden" suppressHydrationWarning>
      <SageToolbar pageKey="email" />

      <div className="flex flex-1 overflow-hidden gap-3">
        {/* Left Panel - Create Actor Filters */}
        <div className="w-80 flex flex-col rounded-2xl shadow-lg bg-white overflow-hidden m-3 flex-shrink-0" style={{ marginTop: 'calc(1.5rem - 20px)' }}>
          <div className="bg-black text-white px-4 py-3 h-12 flex items-center justify-between flex-shrink-0">
            <h2 className="text-sm font-semibold">Create Actor</h2>
            <button
              onClick={() => router.push("/ai-studio")}
              className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-1"
              title="Back to AI Studio"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
              <span className="text-sm font-medium">Back</span>
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide px-3 py-3 pr-2 space-y-4 text-xs">
            {/* Actor Name */}
            <div>
              <label className="text-xs font-semibold text-black uppercase tracking-widest mb-2 block">Actor Name</label>
              <input type="text" value={actorName} onChange={(e) => setActorName(e.target.value)} placeholder="Give this actor a name..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* Gender */}
            <div>
              <label className="text-xs font-semibold text-black uppercase tracking-widest mb-2 block">Gender</label>
              <div className="flex flex-wrap gap-2">
                {GENDERS.map(g => (
                  <button key={g} onClick={() => setSelectedGenders(selectedGenders.includes(g) ? selectedGenders.filter(x => x !== g) : [...selectedGenders, g])} className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${selectedGenders.includes(g) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{g}</button>
                ))}
              </div>
            </div>

            {/* Age */}
            <div>
              <label className="text-xs font-semibold text-black uppercase tracking-widest mb-2 block">Age</label>
              <div className="flex flex-wrap gap-2">
                {AGES.map(a => (
                  <button key={a} onClick={() => setSelectedAges(selectedAges.includes(a) ? selectedAges.filter(x => x !== a) : [...selectedAges, a])} className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${selectedAges.includes(a) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{a}</button>
                ))}
              </div>
            </div>

            {/* Type */}
            <div>
              <label className="text-xs font-semibold text-black uppercase tracking-widest mb-2 block">Type</label>
              <div className="flex flex-wrap gap-2">
                {TYPES.map(t => (
                  <button key={t} onClick={() => setSelectedTypes(selectedTypes.includes(t) ? selectedTypes.filter(x => x !== t) : [...selectedTypes, t])} className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${selectedTypes.includes(t) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{t}</button>
                ))}
              </div>
            </div>

            {/* Situation */}
            <div>
              <label className="text-xs font-semibold text-black uppercase tracking-widest mb-2 block">Situation</label>
              <div className="flex flex-wrap gap-2">
                {SITUATIONS.slice(0, 20).map(s => (
                  <button key={s} onClick={() => setSelectedSituations(selectedSituations.includes(s) ? selectedSituations.filter(x => x !== s) : [...selectedSituations, s])} className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${selectedSituations.includes(s) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{s}</button>
                ))}
              </div>
            </div>

            {/* Accessories */}
            <div>
              <label className="text-xs font-semibold text-black uppercase tracking-widest mb-2 block">Accessories</label>
              <div className="flex flex-wrap gap-2">
                {ACCESSORIES.slice(0, 15).map(ac => (
                  <button key={ac} onClick={() => setSelectedAccessories(selectedAccessories.includes(ac) ? selectedAccessories.filter(x => x !== ac) : [...selectedAccessories, ac])} className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${selectedAccessories.includes(ac) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{ac}</button>
                ))}
              </div>
            </div>

            {/* Emotions */}
            <div>
              <label className="text-xs font-semibold text-black uppercase tracking-widest mb-2 block">Emotions</label>
              <div className="flex flex-wrap gap-2">
                {EMOTIONS.map(e => (
                  <button key={e} onClick={() => setSelectedEmotions(selectedEmotions.includes(e) ? selectedEmotions.filter(x => x !== e) : [...selectedEmotions, e])} className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${selectedEmotions.includes(e) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{e}</button>
                ))}
              </div>
            </div>

            {/* Skin Tone */}
            <div>
              <label className="text-xs font-semibold text-black uppercase tracking-widest mb-2 block">Skin Tone</label>
              <div className="flex flex-wrap gap-2">
                {SKIN_TONES.map(st => (
                  <button key={st.name} onClick={() => setSelectedSkinTone(selectedSkinTone === st.name ? '' : st.name)} className={`w-8 h-8 rounded-full transition-all border-2 ${selectedSkinTone === st.name ? 'border-blue-600 shadow-lg' : 'border-gray-300'}`} style={{ backgroundColor: st.color }} title={st.name} />
                ))}
              </div>
            </div>

            {/* Clear All Filters Button */}
            {(selectedGenders.length > 0 || selectedAges.length > 0 || selectedTypes.length > 0 || selectedSituations.length > 0 || selectedAccessories.length > 0 || selectedEmotions.length > 0 || selectedSkinTone) && (
              <button
                onClick={() => {
                  setSelectedGenders([])
                  setSelectedAges([])
                  setSelectedTypes([])
                  setSelectedSituations([])
                  setSelectedAccessories([])
                  setSelectedEmotions([])
                  setSelectedSkinTone('')
                }}
                className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors mt-4"
              >
                Clear All Filters
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-hidden bg-[#f5f4f1] flex flex-col mr-3" style={{ marginTop: 'calc(1.5rem - 20px)' }}>
          <div className="px-4 pt-8 pb-0 shrink-0">
            <div className="mb-5">
              <h1 className="text-xl font-bold text-gray-900">Talking Actors</h1>
              <p className="text-gray-500 text-sm mt-0.5">Create and manage your AI-generated talking actor videos</p>
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col px-4 pb-4 min-h-0">
            <div className="bg-[#141c2b] rounded-t-xl border border-white/10 border-b-0 shadow-lg p-4 shrink-0">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  <input type="text" placeholder="Search…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-8 pr-3 py-2 text-sm border border-white/20 rounded-lg !bg-[#f5f4f1] !text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40" />
                </div>
                <div className="relative">
                  <select value={selectedDateRange || ''} onChange={(e) => setSelectedDateRange(e.target.value || null)} className="appearance-none pl-3 pr-7 py-2 text-sm border border-white/20 rounded-lg bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 cursor-pointer">
                    <option value="">All Times</option>
                    <option value="today">Today</option>
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                    <option value="year">Year</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg text-white bg-white/10 border border-white/20">{credits} Credits</div>
                {isMainWorkspace && (
                  <button
                    onClick={() => {
                      setSelectionMode(!selectionMode)
                      if (selectionMode) {
                        // Exiting selection mode, clear selections
                        setSelectedActorIds(new Set())
                      }
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      selectionMode
                        ? 'bg-purple-700 border border-purple-400 text-white'
                        : 'bg-purple-600 border border-purple-500 hover:bg-purple-700 text-white'
                    }`}
                    title={selectionMode ? "Exit selection mode" : "Click to select actors"}
                  >
                    <Sparkles className="w-4 h-4" />
                    {selectionMode ? `Select Actors (${selectedActorIds.size})` : `Select Actors`}
                  </button>
                )}
                <button
                  onClick={() => setShowTrash(!showTrash)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors text-white ${
                    showTrash
                      ? 'bg-red-600 border border-red-500'
                      : deletedImages.length > 0
                      ? 'bg-red-900/40 border border-red-500/50 hover:bg-red-900/60'
                      : 'bg-gray-700 border border-gray-600 hover:bg-gray-600'
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                  Trash ({deletedImages.length})
                </button>
                <button
                  onClick={() => router.push("/ai-studio?mode=select-actors")}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg text-white bg-blue-600 border border-blue-500 hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Select to Import
                </button>

                {selectionMode && selectedActorIds.size > 0 && (
                    <button
                      onClick={handlePublishAsPresets}
                      disabled={isPublishing}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 border border-green-500 transition-colors"
                      title="Publish as presets available to all workspaces"
                    >
                      <Sparkles className="w-4 h-4" />
                      {isPublishing ? 'Publishing...' : `Publish ${selectedActorIds.size} Actor${selectedActorIds.size !== 1 ? 's' : ''}`}
                    </button>
                )}

              </div>
            </div>

            <div className="flex-1 overflow-hidden bg-slate-900 rounded-b-xl border border-white/10 border-t-0 shadow-lg min-h-0">
              <div className="h-full overflow-y-auto p-6 flex flex-col scrollbar-hide">
                {showTrash && (
                  <>
                    <div className="mb-4 flex items-center gap-3">
                      <button
                        onClick={() => setShowTrash(false)}
                        className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                        title="Back to gallery"
                      >
                        <ChevronLeft className="w-5 h-5 text-white" />
                      </button>
                      <h2 className="text-lg font-semibold text-white">Trash ({deletedImages.length})</h2>
                    </div>
                    {deletedImages.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-gray-400 font-medium">Trash is empty</p>
                      </div>
                    )}
                  </>
                )}
                <div className={showTrash ? 'flex-1 overflow-y-auto' : ''}>
                  {showTrash && deletedImages.length > 0 ? (
                    // Trash view
                    <div className="grid grid-cols-5 gap-3">
                      {deletedImages.map((image, idx) => (
                        <div
                          key={image.id}
                          className="group relative rounded-lg overflow-hidden border-2 border-gray-600 bg-gray-200"
                        >
                          <img
                            src={image.image}
                            alt={image.prompt}
                            className="w-full h-full object-cover aspect-square opacity-50"
                            onError={(e) => {
                              ;(e.target as HTMLImageElement).style.opacity = '0'
                            }}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRestore(image.id)
                              }}
                              className="p-2 bg-white rounded-full hover:bg-gray-200 transition-colors"
                              title="Restore"
                            >
                              <ChevronLeft className="w-4 h-4 text-gray-700" />
                            </button>
                          </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handlePermanentDelete(image.id)
                              }}
                              className="p-2 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                              title="Permanently delete in 3 days"
                            >
                              <Trash2 className="w-4 h-4 text-white" />
                            </button>

                        </div>
                      ))}
                    </div>
                  ) : loading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                  </div>
                ) : filteredImages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <p className="text-gray-300 font-medium">Your gallery is empty</p>
                      <p className="text-gray-400 text-sm">Import images to get started</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                    {filteredImages.map((image, idx) => {
                      const isSelected = selectedActorIds.has(image.id)
                      const isPreset = presetImageIds.has(image.id)

                      return (
                        <div
                          key={image.id}
                          className={`group relative rounded-lg overflow-hidden border-2 transition-all block w-full aspect-[9/16] cursor-pointer bg-gray-200 ${
                            isSelected
                              ? 'border-green-500 shadow-lg shadow-green-500/50'
                              : image.id === fullscreenImage?.id
                              ? 'border-blue-500 shadow-lg shadow-blue-500/50'
                              : 'border-gray-600 hover:border-gray-500 shadow-md'
                          }`}
                          onClick={(e) => {
                            if (selectionMode && !isPreset) {
                              e.preventDefault()
                              toggleActorSelection(image.id)
                            } else {
                              setFullscreenImage(image); setFullscreenImageIndex(idx); setImageZoom(0.5)
                            }
                          }}
                        >
                          {/* Selection checkbox - only show in selection mode for non-presets */}
                          {selectionMode && !isPreset && (
                            <div className="absolute top-2 left-2 z-10 pointer-events-auto" onClick={(e) => { e.stopPropagation(); toggleActorSelection(image.id) }}>
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                isSelected
                                  ? 'bg-green-500 border-green-600'
                                  : 'bg-white/80 border-gray-400 hover:bg-white'
                              }`}>
                                {isSelected && <span className="text-white font-bold text-xs">✓</span>}
                              </div>
                            </div>
                          )}
                          <img
                            src={image.image}
                            alt={image.prompt}
                            className="w-full h-full object-cover"
                            onLoad={() => {
                              console.log('[TalkingActors] Image loaded:', image.id)
                            }}
                            onError={(e) => {
                              ;(e.target as HTMLImageElement).style.opacity = '0'

                            }}
                          />
                          <div className="absolute inset-0 z-20 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                sessionStorage.setItem('selectedActor', JSON.stringify(image))
                                router.push('/ai-studio/create-video')
                              }}
                              className="p-2 bg-blue-600 rounded-full hover:bg-blue-700 transition-colors"
                              title="Use this Actor"
                            >
                              <Plus className="w-4 h-4 text-white" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSaveToFolder(image)
                              }}
                              className="p-2 bg-white rounded-full hover:bg-gray-200 transition-colors"
                              title="Save to Folder"
                            >
                              <Heart className="w-4 h-4 text-gray-700" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(image.id)
                              }}
                              className="p-2 bg-red-600 rounded-full hover:bg-red-700 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4 text-white" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {fullscreenImage && (
        <div className="fixed inset-0 bg-black/90 z-50 flex" onClick={() => { setFullscreenImage(null); setImageZoom(0.5) }}>
          <div className="flex-1 flex items-center justify-center overflow-hidden p-4 relative" ref={imageContainerRef} onWheel={(e) => { e.preventDefault(); setImageZoom(Math.max(0.5, Math.min(1, imageZoom + e.deltaY * 0.001))) }} onClick={(e) => e.stopPropagation()}>
            <div
              className="overflow-auto scrollbar-hide"
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
              <img src={fullscreenImage.image} alt={fullscreenImage.prompt} style={{ width: `${imageZoom * 100}%`, height: 'auto', margin: 'auto' }} className="object-contain pointer-events-none" />
            </div>
            {fullscreenImageIndex > 0 && <button onClick={(e) => { e.stopPropagation(); const newIdx = fullscreenImageIndex - 1; setFullscreenImageIndex(newIdx); setFullscreenImage(filteredImages[newIdx]); setImageZoom(0.5) }} className="absolute left-4 top-1/2 transform -translate-y-1/2 p-3 bg-white/20 hover:bg-white/30 rounded-full shadow-lg transition-all z-10"><ChevronLeft className="w-8 h-8 text-white" /></button>}
            {fullscreenImageIndex < filteredImages.length - 1 && <button onClick={(e) => { e.stopPropagation(); const newIdx = fullscreenImageIndex + 1; setFullscreenImageIndex(newIdx); setFullscreenImage(filteredImages[newIdx]); setImageZoom(0.5) }} className="absolute right-4 top-1/2 transform -translate-y-1/2 p-3 bg-white/20 hover:bg-white/30 rounded-full shadow-lg transition-all z-10"><ChevronRight className="w-8 h-8 text-white" /></button>}
          </div>

          <div className="w-96 bg-black/95 border-l border-gray-700 p-6 flex flex-col gap-4 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between flex-shrink-0">
              <div className="text-sm text-white font-medium">{fullscreenImageIndex + 1} of {filteredImages.length}</div>
              <button onClick={() => { setFullscreenImage(null); setImageZoom(0.5) }} className="p-2 hover:bg-gray-700 rounded-lg transition-colors"><X className="w-5 h-5 text-white" /></button>
            </div>

            <div className="text-xs text-white bg-gray-900 rounded-lg p-2 border border-gray-700 flex-shrink-0">Current: {Math.round(imageZoom * 100)}%</div>

            <div className="flex flex-col gap-2 flex-1 min-h-0">
              <p className="text-xs text-white uppercase font-semibold flex-shrink-0">Prompt</p>
              <div className="text-white text-sm break-words bg-gray-900 rounded-lg p-3 border border-gray-700 overflow-y-auto flex-1 whitespace-pre-wrap">{fullscreenImage?.prompt && fullscreenImage.prompt.trim().length > 0 ? fullscreenImage.prompt : '(No prompt saved for this image)'}</div>
            </div>

            <div className="flex flex-col gap-2 pt-4 border-t border-gray-700 flex-shrink-0">
              <button
                onClick={() => {
                  sessionStorage.setItem('selectedActor', JSON.stringify(fullscreenImage))
                  router.push('/ai-studio/create-video')
                }}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Use this Actor
              </button>
              <button onClick={() => handleSaveToFolder(fullscreenImage)} className="w-full px-4 py-2 bg-white/80 hover:bg-white text-gray-900 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"><Save className="w-4 h-4" /> Save to Folder</button>
              <button onClick={() => { handleDelete(fullscreenImage.id); setFullscreenImage(null); setImageZoom(0.5) }} className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"><Trash2 className="w-4 h-4" /> Delete</button>
            </div>
          </div>
        </div>
      )}

      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Save Image to Folder</h2>

            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Select Folder</label>
              <select value={selectedFolderId} onChange={(e) => setSelectedFolderId(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                <option value="">-- Choose a folder --</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>{folder.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Or Create New Folder</label>
              <div className="flex gap-2">
                <input type="text" placeholder="Folder name..." value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                <button onClick={handleCreateFolder} disabled={!newFolderName.trim() || isCreatingFolder} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">{isCreatingFolder ? 'Creating...' : 'Create'}</button>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t">
              <button onClick={() => { setShowSaveDialog(false); setImageToSave(null); setSelectedFolderId(''); setNewFolderName('') }} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors">Cancel</button>
              <button onClick={handleSaveImage} disabled={!selectedFolderId} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors"><Save className="w-4 h-4 inline mr-2" /> Save</button>
            </div>
          </div>
        </div>
      )}

      {showCreateProjectDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">New Project</h2>
            <input type="text" placeholder="Project name..." value={createProjectName} onChange={(e) => setCreateProjectName(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" onKeyPress={(e) => { if (e.key === 'Enter') { } }} />
            <div className="flex gap-2 justify-end pt-4 border-t">
              <button onClick={() => { setShowCreateProjectDialog(false); setCreateProjectName('') }} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors">Cancel</button>
              <button onClick={() => { }} disabled={!createProjectName.trim() || isCreatingProject} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">{isCreatingProject ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating</> : <><Plus className="w-4 h-4" /> Create</>}</button>
            </div>
          </div>
        </div>
      )}

      {/* Presets Modal */}
      {showPresets && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-96 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-900">Preset Talking Actors</h2>
              <button onClick={() => setShowPresets(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-700" />
              </button>
            </div>

            {presetActors.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No preset actors available yet</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {presetActors.map((preset) => (
                  <div key={preset.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                    {preset.image_url && (
                      <img src={preset.image_url} alt={preset.name} className="w-full h-40 object-cover" />
                    )}
                    <div className="p-3 space-y-2">
                      <p className="font-semibold text-gray-900 truncate">{preset.name}</p>
                      <p className="text-xs text-gray-600 line-clamp-2">{preset.description}</p>
                      <button
                        onClick={() => handleCopyPreset(preset.id)}
                        className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors"
                      >
                        Copy to My Workspace
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
