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
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
  // Core next settings
  output: 'standalone',

  // Ensure server-only packages are treated as externals for server components
  experimental: {
    serverComponentsExternalPackages: [
      'firebase-admin',
      'genkit',
      '@genkit-ai/core',
      '@genkit-ai/next',
      '@genkit-ai/openai',
      'zod',
    ],
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent server-only packages from being bundled into client builds
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'handlebars': false,
        '@opentelemetry/instrumentation': false,
        '@opentelemetry/sdk-node': false,
        '@genkit-ai/core': false,
        '@genkit-ai/next': false,
        '@genkit-ai/openai': false,
        'genkit': false,
      };
    }
    return config;
  },
};

export default nextConfig;
