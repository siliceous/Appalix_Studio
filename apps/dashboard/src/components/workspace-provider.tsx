'use client'

import { useEffect } from 'react'

interface WorkspaceProviderProps {
  workspaceId: string
  children: React.ReactNode
}

/**
 * Client component to set workspace ID in localStorage
 * This makes workspace context available for API calls
 */
export function WorkspaceProvider({ workspaceId, children }: WorkspaceProviderProps) {
  useEffect(() => {
    // Store workspace ID in localStorage for API calls
    if (workspaceId) {
      localStorage.setItem('workspaceId', workspaceId)
    }
  }, [workspaceId])

  return <>{children}</>
}
