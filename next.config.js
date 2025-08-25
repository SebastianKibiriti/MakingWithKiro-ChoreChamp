/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  // Removed static export for Netlify Functions support
}

module.exports = nextConfig