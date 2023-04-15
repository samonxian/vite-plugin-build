/// <reference types="vitest" />

import { defineConfig } from 'vite';
import { buildPlugin } from 'vite-plugin-build';

export default defineConfig(() => {
  return {
    plugins: [buildPlugin({ fileBuild: { emitDeclaration: true } })],
    test: {
      watch: false,
    },
  };
});
