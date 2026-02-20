import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Ensure API base URL is available for server components
  env: {
    API_BASE_URL: process.env.API_BASE_URL ?? 'http://localhost:3001',
  },
  images: {
    remotePatterns: [
      // Supabase Storage avatars
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
}

export default nextConfig
