/// <reference types="vitest" />

import { defineConfig } from 'vite';
import { buildPlugin } from './src';

export default defineConfig(() => {
  return {
    plugins: [buildPlugin({ fileBuild: { onlyCjs: true } })],
    test: {
      watch: false,
    },
  };
});
