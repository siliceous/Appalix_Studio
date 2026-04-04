'use client'

import { createContext, useContext, useState } from 'react'

interface UserAvatarContextValue {
  avatarUrl:    string | null
  setAvatarUrl: (url: string | null) => void
  userName:     string | null
  plan:         string
  brandColor:   string
}

const UserAvatarContext = createContext<UserAvatarContextValue>({
  avatarUrl:    null,
  setAvatarUrl: () => {},
  userName:     null,
  plan:         'free',
  brandColor:   '#15A4AE',
})

export function UserAvatarProvider({
  children,
  initialUrl,
  userName,
  plan,
  brandColor,
}: {
  children:    React.ReactNode
  initialUrl:  string | null
  userName?:   string | null
  plan?:       string
  brandColor?: string
}) {
  const [avatarUrl, setAvatarUrl] = useState(initialUrl)
  return (
    <UserAvatarContext.Provider value={{
      avatarUrl,
      setAvatarUrl,
      userName:   userName   ?? null,
      plan:       plan       ?? 'free',
      brandColor: brandColor ?? '#15A4AE',
    }}>
      {children}
    </UserAvatarContext.Provider>
  )
}

export function useUserAvatar() {
  return useContext(UserAvatarContext)
}
