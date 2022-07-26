import path from 'path';
import { defineConfig } from 'vite';
import { buildPlugin } from 'vite-plugin-build';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { less, typescript } from 'svelte-preprocess';
import { cssModules, linearPreprocess } from 'svelte-preprocess-cssmodules';

export default defineConfig({
  plugins: [
    svelte({
      preprocess: linearPreprocess([
        // typescript 需要在这里设置开启
        typescript(), // 1 run first
        less(), // 2 run second
        // css module 在 vite 设置无效，需要在这里设置
        cssModules({
          localIdentName: 'rbac-[local]',
        }), // 3 run last
      ]),
    }),
    buildPlugin({
      libBuild: {
        buildOptions: {
          lib: {
            entry: path.resolve(__dirname, 'src/index.ts'),
            name: 'RbacComponents',
            fileName: (format) => `rbac-components.${format}.js`,
          },
        },
      },
    }),
  ],
});
