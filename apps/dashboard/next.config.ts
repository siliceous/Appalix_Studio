import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.appalix.ai' }],
        destination: 'https://app.appalix.ai/:path*',
        permanent: true,
      },
    ]
  },
  env: {
    MAILCHIMP_CLIENT_ID:     process.env.MAILCHIMP_CLIENT_ID     ?? '',
    MAILCHIMP_CLIENT_SECRET: process.env.MAILCHIMP_CLIENT_SECRET ?? '',
  },
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
