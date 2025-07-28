/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  async headers() {
    return [
      {
        source: '/rnnoise.wasm',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/wasm',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    const path = require('path');
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
      'murmuraba': path.resolve(__dirname, 'packages/murmuraba'),
      // Asegurar que React se resuelva desde el proyecto principal
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom')
    };
    
    // Enable WebAssembly
    config.experiments = {
      asyncWebAssembly: true,
      layers: true,
    };
    
    // Permitir importar archivos desde packages/murmuraba/src
    config.module.rules.push({
      test: /\.(ts|tsx)$/,
      include: [path.resolve(__dirname, 'packages/murmuraba/src')],
      use: [
        {
          loader: require.resolve('ts-loader'),
          options: {
            transpileOnly: true,
            configFile: path.resolve(__dirname, 'packages/murmuraba/tsconfig.json')
          }
        }
      ]
    });
    
    return config;
  },
}

module.exports = nextConfig