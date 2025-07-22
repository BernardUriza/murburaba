# Murmuraba - Zero Config Setup

## 🚀 Automatic Setup (Recommended)

Just install and use - no manual file copying needed!

```bash
npm install murmuraba
```

```tsx
import { useMurmubaraEngine } from 'murmuraba';

// That's it! WASM loads automatically
const engine = useMurmubaraEngine();
```

## 📦 Bundler Configurations

### Next.js (Automatic)
```js
// next.config.js
module.exports = {
  webpack: (config) => {
    // WASM support is automatic in Next.js 13+
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    return config;
  },
};
```

### Vite (Automatic)
```js
// vite.config.js
export default {
  // Vite handles WASM automatically!
  // No config needed
};
```

### Webpack 5+ (Automatic)
```js
// webpack.config.js
module.exports = {
  experiments: {
    asyncWebAssembly: true,
  },
};
```

### Create React App (Needs Ejection)
```js
// After ejecting, in webpack.config.js
module.exports = {
  experiments: {
    asyncWebAssembly: true,
  },
  module: {
    rules: [
      {
        test: /\.wasm$/,
        type: 'asset/resource',
      },
    ],
  },
};
```

## 🎯 How It Works

Murmuraba uses smart loading strategies:

1. **First**: Tries to load WASM using modern import syntax
2. **Fallback**: Uses CDN if local loading fails
3. **Last Resort**: Falls back to default module loader

No manual copying needed! The package handles everything.

## 🔧 Troubleshooting

### CORS Issues?
If serving from file:// protocol, WASM might fail. Use a local server:
```bash
npx serve .
```

### Old Bundler?
For webpack < 5, you might need:
```bash
npm install --save-dev wasm-loader
```

### Still Having Issues?
The package will automatically fall back to CDN loading!

## 🎁 Benefits

- ✅ No manual file copying
- ✅ No public folder pollution  
- ✅ Works with all modern bundlers
- ✅ Automatic fallbacks
- ✅ Zero configuration needed