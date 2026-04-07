'use client'

import { createContext, useContext, useState } from 'react'

interface UserAvatarContextValue {
  avatarUrl:    string | null
  setAvatarUrl: (url: string | null) => void
  userName:     string | null
  plan:         string
  brandColor:   string
  bgColor:      string | null
}

const UserAvatarContext = createContext<UserAvatarContextValue>({
  avatarUrl:    null,
  setAvatarUrl: () => {},
  userName:     null,
  plan:         'free',
  brandColor:   '#141C2B',
  bgColor:      null,
})

export function UserAvatarProvider({
  children,
  initialUrl,
  userName,
  plan,
  brandColor,
  bgColor,
}: {
  children:    React.ReactNode
  initialUrl:  string | null
  userName?:   string | null
  plan?:       string
  brandColor?: string
  bgColor?:    string | null
}) {
  const [avatarUrl, setAvatarUrl] = useState(initialUrl)
  return (
    <UserAvatarContext.Provider value={{
      avatarUrl,
      setAvatarUrl,
      userName:   userName   ?? null,
      plan:       plan       ?? 'free',
      brandColor: brandColor ?? '#141C2B',
      bgColor:    bgColor    ?? null,
    }}>
      {children}
    </UserAvatarContext.Provider>
  )
}

export function useUserAvatar() {
  return useContext(UserAvatarContext)
}
