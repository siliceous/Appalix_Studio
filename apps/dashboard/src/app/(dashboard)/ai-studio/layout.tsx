import { AIStudioLayout } from '@/components/ai-studio/ai-studio-layout'

export default function Layout({ children }: { children: React.ReactNode }) {
  // Check if this is a generation page (create-image, create-video, etc.)
  // Those pages have their own layout and don't need the AI Studio sidebar
  // Only wrap dashboard page with AI Studio sidebar
  return children
}
