/// <reference types="vitest" />

import { defineConfig } from 'vite';
import { buildPlugin } from './src';

export default defineConfig(() => {
  return {
    plugins: [buildPlugin()],
    test: {
      watch: false,
    },
  };
});
