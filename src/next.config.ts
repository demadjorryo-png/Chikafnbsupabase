
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'era5758.co.id',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', '').split('/')[0],
        port: '',
        pathname: '/storage/v1/object/public/**',
      }
    ],
  },
  experimental: {
    serverComponentsExternalPackages: [
        'genkit', 
        '@genkit-ai/core', 
        'zod',
    ],
  },
  output: 'standalone',
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "handlebars": false,
        "@opentelemetry/instrumentation": false,
        "@opentelemetry/sdk-node": false,
        "@genkit-ai/core": false,
        "genkit": false,
      };
    }
    return config;
  },
};

export default nextConfig;
