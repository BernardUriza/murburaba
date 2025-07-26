/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  webpack: (config) => {
    const path = require('path');
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
      'murmuraba': path.resolve(__dirname, 'packages/murmuraba/dist')
    };
    
    // Handle WASM files
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
    });
    
    return config;
  },
}

module.exports = nextConfig