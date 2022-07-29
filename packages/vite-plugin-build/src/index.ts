import path from 'path';
import fs from 'fs-extra';
import type { Plugin, ResolvedConfig } from 'vite';
import type { BuildFilesOptions } from './buildFiles';
import { buildFiles, transformFile } from './buildFiles';
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
   * 使用官方的插件 @sveltejs/vite-plugin-svelte，默认为 true
   */
  isVue?: boolean;
  /**
   * 是否是 svelte 文件构建，配合 emitDeclaration 来处理
   * 使用官方的插件 @vitejs/plugin-vue，默认为 true
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
let shouldRun = true;
let reporter: ReturnType<typeof createReporter>;
export const interceptConsoleInstance = new InterceptConsole();

export function buildPlugin(options: Options = {}): Plugin {
  const { fileBuild = {}, libBuild } = options;
  let config: ResolvedConfig;

  return {
    name: pluginName,
    apply: 'build',

    configResolved(resolvedConfig) {
      if (!shouldRun) {
        return;
      }

      // 存储最终解析的配置
      config = resolvedConfig;
      reporter = createReporter(resolvedConfig);
      // 修改当前的构建
      const tempTsFilePath = path.resolve(process.cwd(), 'node_modules/.temp/noop.ts');
      fs.ensureFileSync(tempTsFilePath);
      fs.writeFileSync(tempTsFilePath, 'const a = 2', { encoding: 'utf-8' });
      config.build.rollupOptions = {
        output: { dir: path.resolve(process.cwd(), 'node_modules/.temp/dist') },
      };
      config.build.emptyOutDir = false;
      config.build.lib = {
        entry: tempTsFilePath,
        name: 'noop',
        formats: [],
      };
    },

    async buildStart() {
      if (!shouldRun) {
        return;
      }
      interceptConsoleInstance.silent(); // 拦截 console.log 和 console.warn 不做任何输出
    },

    async closeBundle() {
      if (!shouldRun) {
        return;
      }

      shouldRun = false;
      const tempViteConfigFilePath = path.resolve(process.cwd(), 'node_modules/.temp/.temp.vite.config.js');

      try {
        // 由于 rollup 的动态 import 不支持单变量引入 ts 和 js 文件，同时也存在循环引用问题
        // 所以直接转换 vite 配置文件为临时的 commonjs 格式，在通过 require 引入。
        await transformFile(path.basename(config.configFile), {
          viteConfig: {
            logLevel: 'silent',
          },
          esOutputDir: false,
          rollupOptionsOutput: { file: tempViteConfigFilePath },
          rollupOptionsExternal(id) {
            if (/^\//.test(id) || /^\\/.test(id) || /^\.\//.test(id) || /^\.\.\//.test(id)) {
              // 本地文件则一起打包到一个文件中
              return false;
            }
            return true;
          },
        });

        // 获取 vite 配置
        let viteConfig = require(tempViteConfigFilePath).default;
        if (typeof viteConfig === 'function') {
          viteConfig = viteConfig({ mode: config.mode, command: config.command });
        }

        let isSvelte = false;
        let isVue = false;

        // 过滤 vite-plugin-build 插件
        viteConfig.plugins = viteConfig.plugins.filter((p: Record<string, any>) => {
          if (p.name === pluginName) {
            return false;
          }

          if (p.name === 'vite:vue') {
            isVue = true;
          }

          if (Array.isArray(p)) {
            p.forEach((v) => {
              if (v.name === 'vite-plugin-svelte') {
                isSvelte = true;
              }
            });
          }

          return true;
        });

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
              viteConfig,
              pluginHooks,
            }),
          libBuild &&
            buildLib({
              ...libBuild,
              viteConfig,
              pluginHooks,
            }),
        ].filter(Boolean);
        await Promise.all(buildPromise);
        reporter.buildEndAll();
      } finally {
        // 删除临时的 vite 配置文件
        fs.removeSync(tempViteConfigFilePath);
      }
      interceptConsoleInstance.restore(); // 恢复 console.log 和 console.warn
    },
  };
}
