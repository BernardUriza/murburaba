import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import copy from 'rollup-plugin-copy';

const external = ['react', 'react-dom', 'lamejs']; // Externalize lamejs

const productionPlugins = [
  terser({
    compress: {
      drop_console: true,
      drop_debugger: true,
      pure_funcs: ['console.log', 'console.debug', 'console.trace'],
      passes: 2,
      unsafe_math: true,
      unsafe_proto: true,
      unsafe_regexp: true,
    },
    mangle: {
      properties: {
        regex: /^_/,
      },
    },
    format: {
      comments: false,
    },
  }),
];

const basePlugins = [
  resolve({
    browser: true,
    preferBuiltins: false,
    mainFields: ['module', 'browser', 'main'],
  }),
  commonjs({
    transformMixedEsModules: true,
  }),
  typescript({
    tsconfig: './tsconfig.json',
    declaration: true,
    declarationDir: 'dist',
    exclude: ['**/*.test.ts', '**/*.spec.ts'],
  }),
];

export default [
  // ESM build (optimized)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: true,
      // Use manual chunks for code splitting
      manualChunks: {
        'audio-converter': ['src/utils/audioConverter.ts', 'src/utils/audioConverterOptimized.ts'],
        'engines': ['src/engines/index.ts'],
      },
    },
    external: [...external, /node_modules/],
    plugins: [
      ...basePlugins,
      copy({
        targets: [
          { src: 'src/engines/wasm/*', dest: 'dist/wasm' },
          { src: '../../public/rnnoise-fixed.js', dest: 'dist' },
          { src: '../../public/dist/*.wasm', dest: 'dist/wasm' }
        ],
        copyOnce: true,
      }),
      ...productionPlugins,
    ],
    treeshake: {
      moduleSideEffects: false,
      propertyReadSideEffects: false,
      tryCatchDeoptimization: false,
    },
  },
  
  // CJS build (optimized)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
      interop: 'auto',
    },
    external: [...external, /node_modules/],
    plugins: [
      ...basePlugins,
      ...productionPlugins,
    ],
    treeshake: {
      moduleSideEffects: false,
      propertyReadSideEffects: false,
    },
  },
  
  // UMD build (heavily optimized)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.umd.min.js',
      format: 'umd',
      name: 'Murmuraba',
      sourcemap: false, // Disable sourcemap for production
      globals: {
        react: 'React',
        'react-dom': 'ReactDOM',
        lamejs: 'lamejs',
      },
      compact: true,
    },
    external,
    plugins: [
      ...basePlugins,
      terser({
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.debug', 'console.trace', 'console.warn'],
          passes: 3,
          unsafe: true,
          unsafe_arrows: true,
          unsafe_comps: true,
          unsafe_Function: true,
          unsafe_math: true,
          unsafe_methods: true,
          unsafe_proto: true,
          unsafe_regexp: true,
          unsafe_undefined: true,
          unused: true,
          dead_code: true,
          collapse_vars: true,
          reduce_vars: true,
          inline: true,
          loops: true,
          if_return: true,
          join_vars: true,
          ecma: 2020,
        },
        mangle: {
          properties: {
            regex: /^_/,
            reserved: ['__esModule'],
          },
          toplevel: true,
        },
        format: {
          comments: false,
          ecma: 2020,
        },
      }),
    ],
    treeshake: {
      moduleSideEffects: false,
      propertyReadSideEffects: false,
      tryCatchDeoptimization: false,
      unknownGlobalSideEffects: false,
      correctVarValueBeforeDeclaration: false,
    },
  },
  
  // Separate worker bundle
  {
    input: 'src/workers/audio-converter.worker.ts',
    output: {
      file: 'dist/workers/audio-converter.worker.js',
      format: 'iife',
    },
    plugins: [
      ...basePlugins,
      ...productionPlugins,
    ],
  },
];