import path from 'path';
import { defineConfig } from 'vite';
import { buildPlugin } from 'vite-plugin-build';

export default defineConfig({
  plugins: [
    buildPlugin({
      fileBuild: {
        emitDeclaration: true,
      },
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
