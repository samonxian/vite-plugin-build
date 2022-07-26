import path from 'path';
import { defineConfig } from 'vite';
import { buildPlugin } from 'vite-plugin-build';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [
    vue(),
    buildPlugin({
      libBuild: {
        buildOptions: {
          rollupOptions: {
            external: ['vue'],
            output: { globals: { vue: 'Vue' } },
          },
          lib: {
            entry: path.resolve(__dirname, 'src/index.js'),
            name: 'RbacComponents',
            fileName: (format) => `rbac-components.${format}.js`,
          },
        },
      },
    }),
  ],

  css: {
    modules: {
      localsConvention: 'camelCaseOnly',
      generateScopedName: (name) => `rbac-${name}`,
    },
  },
});
