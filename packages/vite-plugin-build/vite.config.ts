/// <reference types="vitest" />

import { defineConfig } from 'vite';
import { buildPlugin } from './src';

export default defineConfig(() => {
  return {
    plugins: [buildPlugin({ fileBuild: { formats: [{ format: 'cjs', outDir: 'lib' }], emitDeclaration: true } })],
    test: {
      watch: false,
    },
  };
});
