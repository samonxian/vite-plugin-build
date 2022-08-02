import path from 'path';
import fs from 'fs-extra';
import type { Plugin, UserConfig } from 'vite';
import type { BuildFilesOptions } from './buildFiles';
import { buildFiles } from './buildFiles';
import { InterceptConsole } from './InterceptConsole';
import type { BuildLibOptions } from './buildLib';
import { buildLib } from './buildLib';
import { createReporter } from './reporter';
import { emitDeclaration } from './emitDeclaration';

export interface FileBuild extends BuildFilesOptions {
  /**
   * 是否导出 typescript 声明文件
   */
  emitDeclaration?: boolean;
  /**
   * 是否是 vue 文件构建，配合 emitDeclaration 来处理
   * 使用官方的插件 @vitejs/plugin-vue，默认为 true
   */
  isVue?: boolean;
  /**
   * 是否是 svelte 文件构建，配合 emitDeclaration 来处理
   * 使用官方的插件 @sveltejs/vite-plugin-svelte，默认为 true
   */
  isSvelte?: boolean;
}
export interface Options {
  /**
   * vite 库模式配置，入口文件打包成一个文件，不配置则不开启此功能
   */
  libBuild?: BuildLibOptions;
  /**
   * vite 库模式配置，指定文件夹下的所有 js 或者 ts 文件转成 commonjs 和 es module 的文件
   * 默认开启此功能
   */
  fileBuild?: FileBuild | false;
}

const pluginName = 'vite:build';
const defaultInputFolder = 'src';
const defaultEsOutputDir = 'es';
const defaultCommonJsOutputDir = 'lib';
let reporter: ReturnType<typeof createReporter>;
export const interceptConsoleInstance = new InterceptConsole();

export function buildPlugin(options: Options = {}): Plugin {
  const { fileBuild = {}, libBuild } = options;
  let userConfig: UserConfig;
  let isSvelte = false;
  let isVue = false;

  return {
    name: pluginName,
    apply: 'build',

    config(config) {
      // 修改当前的构建，当前构建在 build 插件中只有触发构建作用
      const tempTsFilePath = path.resolve(process.cwd(), 'node_modules/.temp/noop.ts');
      fs.ensureFileSync(tempTsFilePath);
      fs.writeFileSync(tempTsFilePath, 'const a = 2', { encoding: 'utf-8' });
      config.build = {
        emptyOutDir: false,
        rollupOptions: {
          output: { dir: path.resolve(process.cwd(), 'node_modules/.temp/dist') },
        },
        lib: {
          entry: tempTsFilePath,
          name: 'noop',
          formats: [],
        },
      };

      // 过滤 vite-plugin-build 插件
      config.plugins = config.plugins.filter((p) => {
        const lp = (p || {}) as Record<string, any>;

        if (lp.name === pluginName) {
          return false;
        }

        return true;
      });

      // 判断是否是 svelte 或者 vue app
      config.plugins.flat(10).forEach((p) => {
        const lp = (p || {}) as Record<string, any>;

        if (lp.name === 'vite-plugin-svelte') {
          isSvelte = true;
        }

        if (lp.name === 'vite:vue') {
          isVue = true;
        }
      });

      userConfig = config;
    },

    configResolved(resolvedConfig) {
      reporter = createReporter(resolvedConfig);
    },

    buildStart() {
      interceptConsoleInstance.silent(); // 拦截 console.log 和 console.warn 不做任何输出
    },

    async closeBundle() {
      const shouldBuildFiles = typeof fileBuild === 'object';
      const lastFileBuildOptions = typeof fileBuild === 'object' ? fileBuild : {};
      const lastEsOutputDir = lastFileBuildOptions.esOutputDir ?? defaultEsOutputDir;
      const lastCommonjsOutputDir = lastFileBuildOptions.commonJsOutputDir ?? defaultCommonJsOutputDir;

      if (shouldBuildFiles && fileBuild.emitDeclaration) {
        // 生成声明文件
        const { inputFolder = defaultInputFolder } = fileBuild;

        emitDeclaration({
          rootDir: inputFolder,
          commonJsOutputDir: lastCommonjsOutputDir,
          esOutputDir: lastEsOutputDir,
          isSvelte: fileBuild.isSvelte || isSvelte,
          isVue: fileBuild.isVue || isVue,
        });
      }

      const pluginHooks: Plugin = {
        name: 'noop // 无用，为了防止 eslint 报错',
        transform: (_, id) => {
          reporter.transform(id);
          return null;
        },

        writeBundle: (_, output) => {
          reporter.writeBundle(output);
        },
      };
      const buildPromise = [
        shouldBuildFiles &&
          buildFiles({
            ...lastFileBuildOptions,
            esOutputDir: lastEsOutputDir,
            commonJsOutputDir: lastCommonjsOutputDir,
            viteConfig: userConfig,
            pluginHooks,
          }),
        libBuild &&
          buildLib({
            ...libBuild,
            viteConfig: userConfig,
            pluginHooks,
          }),
      ].filter(Boolean);
      await Promise.all(buildPromise);

      reporter.buildEndAll();

      interceptConsoleInstance.restore(); // 恢复 console.log 和 console.warn
    },
  };
}
