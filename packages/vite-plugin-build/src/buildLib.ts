import type { BuildOptions, Plugin, UserConfig } from 'vite';
import { build } from 'vite';

export interface BuildLibOptions {
  /**
   * 文件只转换为 es 格式，onlyEs 和 onlyCjs 不能同时设置为 true
   */
  onlyEs?: boolean;
  /**
   * 文件只转换为 commonjs 格式，onlyEs 和 onlyCjs 不能同时设置为 true
   */
  onlyCjs?: boolean;
  /**
   * vite 配置，内置字段，请不要使用此字段
   */
  viteConfig?: UserConfig;
  /**
   * 同 vite 配置字段 build
   */
  buildOptions: BuildOptions;
  /**
   * 构建开始钩子函数，第一个参数 totalFilesCount 是转换文件的总数
   * @param totalFilesCount 所有转换的文件数量
   */
  startBuild?: (totalFilesCount: number) => void;
  /**
   * 所有构建结束钩子函数
   * @param totalFilesCount 所有转换的文件数量
   */
  endBuild?: (totalFilesCount: number) => void;
  /**
   * 插件钩子函数，请不要使用此字段
   */
  pluginHooks?: Plugin;
}

export async function buildLib(options: BuildLibOptions) {
  const { viteConfig, buildOptions, startBuild, endBuild, pluginHooks = {} } = options;
  const lastPluginHooks = Object.keys(pluginHooks).reduce((acc, cur) => {
    if (typeof pluginHooks[cur] === 'function') {
      acc[cur] = pluginHooks[cur];
    }
    return acc;
  }, {});

  startBuild?.(1);
  await build({
    ...viteConfig,
    plugins: [
      ...(viteConfig ? viteConfig.plugins : []),
      {
        name: 'vite:build-lib-transform',
        ...lastPluginHooks,
      },
    ],
    mode: 'production',
    configFile: false,
    logLevel: 'error',
    build: buildOptions,
  });
  endBuild?.(1);
}
