'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Trash2, Search, Loader2, X, ChevronLeft, ChevronRight, Plus, Eye, Save } from 'lucide-react'
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
  const [imageZoom, setImageZoom] = useState(1)
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

  useEffect(() => {
    const wId = typeof window !== 'undefined' ? localStorage.getItem('workspaceId') || '' : ''
    setWorkspaceId(wId)

    const fetchImages = async () => {
      try {
        setLoading(true)

        // Gallery starts empty - images added explicitly via library selector
        setImages([])
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
    // Load persisted images from localStorage
    const saved = localStorage.getItem("talkingActorsImages")
    if (saved) {
      try {
        const savedImages = JSON.parse(saved)
        setImages(savedImages)
        console.log("[TalkingActors] Loaded", savedImages.length, "images from localStorage")
      } catch (e) {
        console.error("[TalkingActors] Error loading saved images:", e)
      }
    }
  }, [])

  useEffect(() => {
    const pending = sessionStorage.getItem("pendingImports")
    if (pending) {
      try {
        const newImages = JSON.parse(pending)
        // Parse metadata for each imported image
        const parsedImages = newImages.map((img: GeneratedImage) => ({
          ...img,
          parsedMetadata: parseImageMetadata(img.prompt)
        }))
        setImages(prevImages => {
          const updated = [...prevImages, ...parsedImages]
          // Persist to localStorage
          localStorage.setItem("talkingActorsImages", JSON.stringify(updated))
          return updated
        })
        sessionStorage.removeItem("pendingImports")
        console.log("[TalkingActors] Imported", parsedImages.length, "images with parsed metadata")
      } catch (e) {
        console.error("[TalkingActors] Error loading pending imports:", e)
      }
    }
  }, [])


  useEffect(() => {
    if (!workspaceId) return
    const fetchProjects = async () => {
      try {
        const response = await fetch('/api/projects', { headers: { 'x-workspace-id': workspaceId } })
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
    const fetchFolders = async () => {
      try {
        const response = await fetch('/api/ai-studio/actor-folders', { headers: { 'x-workspace-id': workspaceId } })
        if (response.ok) {
          const data = await response.json()
          setFolders(data.folders || [])
        }
      } catch (error) {
        console.error('Error loading folders:', error)
      }
    }
    fetchFolders()
  }, [workspaceId])

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
    localStorage.setItem("talkingActorsImages", JSON.stringify(updated))

    try {
      const savedHistory = localStorage.getItem('imageGenerationHistory')
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory)
        const updatedHistory = parsed.map((img: any) => img.id === imageId ? { ...img, deletedAt: Date.now() } : img)
        localStorage.setItem('imageGenerationHistory', JSON.stringify(updatedHistory))
      }
    } catch (e) {
      console.error('Error updating localStorage:', e)
    }

    try {
      const talkingAdHistory = localStorage.getItem('talkingAdHistory')
      if (talkingAdHistory) {
        const parsed = JSON.parse(talkingAdHistory)
        const updatedHistory = parsed.map((v: any) => v.id === imageId ? { ...v, deletedAt: Date.now() } : v)
        localStorage.setItem('talkingAdHistory', JSON.stringify(updatedHistory))
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
    localStorage.setItem("talkingActorsImages", JSON.stringify(updated))

    try {
      const savedHistory = localStorage.getItem('imageGenerationHistory')
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory)
        const updatedHistory = parsed.map((img: any) => img.id === imageId ? { ...img, deletedAt: undefined } : img)
        localStorage.setItem('imageGenerationHistory', JSON.stringify(updatedHistory))
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
      } else if (e.key === 'ArrowRight' && fullscreenImageIndex < filteredImages.length - 1) {
        const newIdx = fullscreenImageIndex + 1
        setFullscreenImageIndex(newIdx)
        setFullscreenImage(filteredImages[newIdx])
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
        <div className="w-80 flex flex-col rounded-2xl shadow-lg bg-white overflow-hidden m-3 mt-24 flex-shrink-0">
          <div className="bg-black text-white px-4 py-3 h-12 flex items-center justify-between flex-shrink-0">
            <h2 className="text-sm font-semibold">Create Actor</h2>
            <button
              onClick={() => router.push("/ai-studio")}
              className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
              title="Back to AI Studio"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
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

        <div className="flex-1 overflow-hidden bg-[#f5f4f1] flex flex-col mr-3">
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
                  onClick={() => router.push("/ai-studio?import=true")}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg text-white bg-blue-600 border border-blue-500 hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Import Images
                </button>

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
                  <div className="grid grid-cols-5 gap-3">
                    {filteredImages.map((image, idx) => {
                      <button
                        onClick={() => router.push("/ai-studio/create-image")}
                        className="relative rounded-lg overflow-hidden border-2 border-dashed border-gray-300 hover:border-blue-400 bg-white aspect-square flex flex-col items-center justify-center transition-colors gap-2"
                      >
                        <div className="text-4xl font-light text-gray-400">+</div>
                        <div className="text-xs font-semibold text-gray-600">Create New</div>
                      </button>
                      const getAspectRatio = (ratio?: string) => {
                        const ratios: Record<string, string> = {
                          '1:1': 'aspect-square',
                          '16:9': 'aspect-video',
                          '9:16': 'aspect-[9/16]',
                          '3:4': 'aspect-[3/4]',
                          '4:3': 'aspect-[4/3]',
                          '21:9': 'aspect-[21/9]',
                          '2:3': 'aspect-[2/3]',
                        }
                        return ratios[ratio || '1:1'] || 'aspect-square'
                      }

                      return (
                        <div
                          key={image.id}
                          className={`group relative rounded-lg overflow-hidden border-2 transition-all block w-full cursor-pointer bg-gray-200 ${
                            image.id === fullscreenImage?.id
                              ? 'border-blue-500 shadow-lg shadow-blue-500/50'
                              : 'border-gray-600 hover:border-gray-500 shadow-md'
                          }`}
                          onClick={() => { setFullscreenImage(image); setFullscreenImageIndex(idx) }}
                        >
                          <img
                            src={image.image}
                            alt={image.prompt}
                            className={`w-full h-full object-cover ${getAspectRatio(image.aspectRatio)}`}
                            onLoad={() => {
                              console.log('[TalkingActors] Image loaded:', image.id)
                            }}
                            onError={(e) => {
                              ;(e.target as HTMLImageElement).style.opacity = '0'

                            }}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto">
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
                              <Save className="w-4 h-4 text-gray-700" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(image.id)
                              }}
                              className="p-2 bg-white rounded-full hover:bg-gray-200 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4 text-gray-700" />
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
        <div className="fixed inset-0 bg-black/90 z-50 flex" onClick={() => { setFullscreenImage(null); setImageZoom(1) }}>
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
                <img src={fullscreenImage.image} alt={fullscreenImage.prompt} style={{ width: `${imageZoom * 100}%`, height: 'auto', flexShrink: 0 }} className="object-contain pointer-events-none" />
              </div>
            </div>
            {fullscreenImageIndex > 0 && <button onClick={(e) => { e.stopPropagation(); const newIdx = fullscreenImageIndex - 1; setFullscreenImageIndex(newIdx); setFullscreenImage(filteredImages[newIdx]); setImageZoom(1) }} className="absolute left-4 top-1/2 transform -translate-y-1/2 p-3 bg-white/20 hover:bg-white/30 rounded-full shadow-lg transition-all z-10"><ChevronLeft className="w-8 h-8 text-white" /></button>}
            {fullscreenImageIndex < filteredImages.length - 1 && <button onClick={(e) => { e.stopPropagation(); const newIdx = fullscreenImageIndex + 1; setFullscreenImageIndex(newIdx); setFullscreenImage(filteredImages[newIdx]); setImageZoom(1) }} className="absolute right-4 top-1/2 transform -translate-y-1/2 p-3 bg-white/20 hover:bg-white/30 rounded-full shadow-lg transition-all z-10"><ChevronRight className="w-8 h-8 text-white" /></button>}
          </div>

          <div className="w-96 bg-black/95 border-l border-gray-700 p-6 flex flex-col gap-4 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between flex-shrink-0">
              <div className="text-sm text-white font-medium">{fullscreenImageIndex + 1} of {filteredImages.length}</div>
              <button onClick={() => { setFullscreenImage(null); setImageZoom(1) }} className="p-2 hover:bg-gray-700 rounded-lg transition-colors"><X className="w-5 h-5 text-white" /></button>
            </div>

            <div className="text-xs text-white bg-gray-900 rounded-lg p-2 border border-gray-700 flex-shrink-0">Scroll to zoom (50% - 500%) | Current: {Math.round(imageZoom * 100)}%</div>

            <div className="flex flex-col gap-2 flex-1 min-h-0">
              <p className="text-xs text-white uppercase font-semibold flex-shrink-0">Prompt</p>
              <p className="text-white text-sm break-words bg-gray-900 rounded-lg p-3 border border-gray-700 overflow-y-auto flex-1">{fullscreenImage?.prompt && fullscreenImage.prompt.trim().length > 0 ? fullscreenImage.prompt : '(No prompt saved for this image)'}</p>
            </div>

            <div className="flex flex-col gap-2 pt-4 border-t border-gray-700 flex-shrink-0">
              <button onClick={() => handleSaveToFolder(fullscreenImage)} className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"><Save className="w-4 h-4" /> Save to Folder</button>
              <button onClick={() => { handleDelete(fullscreenImage.id); setFullscreenImage(null); setImageZoom(1) }} className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"><Trash2 className="w-4 h-4" /> Delete</button>
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
    </div>
  )
}
