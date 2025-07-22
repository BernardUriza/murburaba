import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import copy from 'rollup-plugin-copy';

const external = ['react', 'react-dom'];

export default [
  // ESM build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: true,
      inlineDynamicImports: true,
    },
    external,
    plugins: [
      resolve(),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
      }),
      copy({
        targets: [
          { 
            src: 'node_modules/@jitsi/rnnoise-wasm/dist/*.wasm', 
            dest: 'dist/wasm' 
          },
          { 
            src: 'node_modules/@jitsi/rnnoise-wasm/dist/*.js', 
            dest: 'dist/wasm' 
          }
        ],
        hook: 'writeBundle'
      })
    ],
  },
  // CJS build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: true,
      inlineDynamicImports: true,
    },
    external,
    plugins: [
      resolve(),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
      }),
    ],
  },
  // UMD build (minified)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.umd.min.js',
      format: 'umd',
      name: 'Murmuraba',
      sourcemap: true,
      inlineDynamicImports: true,
      globals: {
        react: 'React',
        'react-dom': 'ReactDOM',
      },
    },
    external,
    plugins: [
      resolve(),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
      }),
      terser(),
    ],
  },
];