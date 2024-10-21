import typescript from '@rollup/plugin-typescript';
import {nodeResolve} from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

const config = {
  input: 'main.ts',
  output: {
    dir: '.',
    sourcemap: 'inline',
    format: 'cjs',
    exports: 'default'
  },
  external: ['obsidian'],
  plugins: [
    typescript({tsconfig: './tsconfig.json'}),
    nodeResolve({browser: true}),
    commonjs(),
  ]
};

export default config;