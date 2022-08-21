import type { BuildOptions, Plugin, UserConfig } from 'vite';
import { build } from 'vite';

export interface BuildLibOptions {
  /**
   * vite 配置，内置字段，请不要使用此字段
   */
  viteConfig?: UserConfig;
  /**
   * 同 vite 配置字段 build
   */
  buildOptions: BuildOptions | BuildOptions[];
  /**
   * 构建开始钩子函数，第一个参数 totalFilesCount 是转换文件的总数
   */
  startBuild?: () => void;
  /**
   * 所有构建结束钩子函数
   */
  endBuild?: () => void;
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

  startBuild?.();

  const lastBuildOptions = [].concat(buildOptions).map((c: BuildOptions) => {
    return { ...c, emptyOutDir: false };
  });
  const buildPs = lastBuildOptions.map((buildOption) => {
    return build({
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
      build: buildOption,
    });
  });
  await Promise.all(buildPs);
  endBuild?.();
}
