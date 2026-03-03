import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    // Raise Server Action body limit to 52 MB to support PDF/image uploads
    serverActions: {
      bodySizeLimit: '52mb',
    },
  },
  images: {
    remotePatterns: [
      // Supabase Storage avatars
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
}

export default nextConfig
