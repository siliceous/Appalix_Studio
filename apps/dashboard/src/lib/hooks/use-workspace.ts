'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Hook to set workspace ID in localStorage
 * Called by layout wrapper to ensure workspace context is available
 */
export function useWorkspace(workspaceId?: string) {
  const pathname = usePathname()

  useEffect(() => {
    // Extract workspace ID from URL if not provided
    if (!workspaceId) {
      // For dashboard routes, workspace ID is typically in the session/auth context
      // But we can also extract from URL patterns or auth data
      const stored = localStorage.getItem('workspaceId')
      if (!stored && workspaceId) {
        localStorage.setItem('workspaceId', workspaceId)
      }
    } else {
      // Store workspace ID in localStorage for API calls
      localStorage.setItem('workspaceId', workspaceId)
    }
  }, [workspaceId])
}
