import path from 'path';
import { defineConfig } from 'vite';
import { buildPlugin } from 'vite-plugin-build';

export default defineConfig({
  plugins: [
    buildPlugin({
      libBuild: {
        buildOptions: {
          rollupOptions: {
            external: ['dayjs'],
            output: { globals: { dayjs: 'Dayjs' } },
          },
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
