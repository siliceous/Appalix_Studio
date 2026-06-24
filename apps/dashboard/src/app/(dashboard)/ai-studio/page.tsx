'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Sparkles, Zap } from 'lucide-react'
import {
  ToolCard,
  ProjectCard,
  ModelCard,
  CreditUsageCard,
} from '@/components/ai-studio/components'
import { aiStudioAPI } from '@/lib/api/ai-studio'
import type { Project, AIModel, CreditUsage } from '@/lib/types/ai-studio'

export default function AIStudioDashboard() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [models, setModels] = useState<AIModel[]>([])
  const [credits, setCredits] = useState<CreditUsage | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectsData, modelsData, creditsData] = await Promise.all([
          aiStudioAPI.getProjects(),
          aiStudioAPI.getModels(),
          aiStudioAPI.getCreditUsage(),
        ])

        setProjects(projectsData)
        setModels(modelsData)
        setCredits(creditsData)
      } catch (error) {
        console.error('Failed to load AI Studio data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const featuredModels = models.filter((m) => m.featured).slice(0, 4)
  const recentProjects = projects.slice(0, 6)

  return (
    <div className="flex h-screen bg-white dark:bg-black">
      {/* Left Sidebar - AI Studio Navigation */}
      <div className="w-64 border-r border-gray-200 dark:border-white/10 p-6 overflow-y-auto bg-white dark:bg-black">
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wide">
            AI Studio
          </h2>
          <p className="text-xs text-white mt-2">
            Create professional AI-generated content
          </p>
        </div>

        <nav className="space-y-2">
          <a href="/ai-studio" className="flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm bg-gray-800 text-white">
            <span>📊</span>
            Dashboard
          </a>
          <a href="/ai-studio/create-image" className="flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm text-white hover:bg-gray-800">
            <span>🎨</span>
            Create Image
          </a>
          <a href="/ai-studio/create-video" className="flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm text-white hover:bg-gray-800">
            <span>🎬</span>
            Create Video
          </a>
          <a href="/ai-studio/product-ads" className="flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm text-white hover:bg-gray-800">
            <span>🛍️</span>
            Product Ads
          </a>
          <a href="/ai-studio/talking-ad" className="flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm text-white hover:bg-gray-800">
            <span>💬</span>
            Talking Ad
          </a>
          <a href="/ai-studio/library" className="flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm text-white hover:bg-gray-800">
            <span>📚</span>
            Asset Library
          </a>
        </nav>

        <div className="mt-8 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-1">
            Pro Tip
          </p>
          <p className="text-xs text-blue-800 dark:text-blue-300">
            Use projects to organize and reuse your assets across multiple generations.
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-8 space-y-12 overflow-y-auto bg-white dark:bg-black">
        {/* Hero Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-blue-500" />
            <h1 className="text-4xl font-bold text-white">
              AI Studio
            </h1>
          </div>
          <p className="text-lg text-white">
            Create professional AI-generated content for your brand. Generate images, videos,
            and more with our powerful AI models.
          </p>
        </div>

        {/* Quick Create Cards */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">
            Get Started
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <ToolCard
              icon="🎨"
              title="Create Image"
              description="Generate stunning images with AI"
              onClick={() => router.push('/ai-studio/create-image')}
            />
            <ToolCard
              icon="🎬"
              title="Create Video"
              description="Generate videos from text or images"
              onClick={() => router.push('/ai-studio/create-video')}
            />
            <ToolCard
              icon="🛍️"
              title="Product Ads"
              description="Auto-generate product ads"
              onClick={() => router.push('/ai-studio/product-ads')}
            />
            <ToolCard
              icon="💬"
              title="Talking Ad"
              description="Create talking avatar videos"
              onClick={() => router.push('/ai-studio/talking-ad')}
            />
            <ToolCard
              icon="⚙️"
              title="Settings"
              description="Manage your studio settings"
              onClick={() => {}}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-8">
          {/* Left Column - Projects */}
          <div className="col-span-2 space-y-6">
            {/* Recent Projects */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">
                  Recent Projects
                </h2>
                <button className="text-sm font-medium text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1">
                  View All
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {loading ? (
                <div className="grid grid-cols-2 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-48 rounded-lg bg-gray-200 dark:bg-white/5 animate-pulse" />
                  ))}
                </div>
              ) : recentProjects.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {recentProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      name={project.name}
                      type={project.type}
                      thumbnail={project.thumbnail}
                      createdAt={project.createdAt}
                      onClick={() => console.log('Open project:', project.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
                  <p className="text-white">
                    No projects yet. Create one to get started!
                  </p>
                </div>
              )}
            </div>

            {/* Featured Models */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">
                  Featured Models
                </h2>
              </div>

              {loading ? (
                <div className="grid grid-cols-2 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-32 rounded-lg bg-gray-200 dark:bg-white/5 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {featuredModels.map((model) => (
                    <ModelCard
                      key={model.id}
                      name={model.name}
                      description={model.description}
                      icon={model.icon}
                      creditsPerGeneration={model.creditsPerGeneration}
                      featured={model.featured}
                      onClick={() => console.log('Select model:', model.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Credit Usage */}
          <div>
            {loading ? (
              <div className="h-64 rounded-lg bg-gray-200 dark:bg-white/5 animate-pulse" />
            ) : credits ? (
              <CreditUsageCard usage={credits} />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
