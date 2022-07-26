import path from 'path';
import { defineConfig } from 'vite';
import { buildPlugin } from 'vite-plugin-build';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { less } from 'svelte-preprocess';
import { cssModules, linearPreprocess } from 'svelte-preprocess-cssmodules';

export default defineConfig({
  plugins: [
    svelte({
      // css module 在 vite 设置无效，需要在这里设置
      preprocess: linearPreprocess([
        less(), // 1 run first
        cssModules({
          localIdentName: 'rbac-[local]',
        }), // 2 run last
      ]),
    }),
    buildPlugin({
      libBuild: {
        buildOptions: {
          lib: {
            entry: path.resolve(__dirname, 'src/index.js'),
            name: 'RbacComponents',
            fileName: (format) => `rbac-components.${format}.js`,
          },
        },
      },
    }),
  ],
});
