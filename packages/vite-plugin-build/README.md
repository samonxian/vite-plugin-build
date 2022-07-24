# vite-plugin-build

<img width="526" alt="" src="https://user-images.githubusercontent.com/1954171/180627715-c75377fa-481e-4184-a546-40e17b6c0f23.png">

vite 库模式插件，支持单个文件转换（vite 的默认模式），还拓展支持整个文件夹的转换（多个输入文件，多个输出文件）。

```js
import { defineConfig } from 'vite';
import { buildPlugin } from 'vite-plugin-build';

export default defineConfig({
  plugins: [buildPlugin()],
});
```

## 选项

```ts
export interface Options {
  /**
   * vite 库模式配置，入口文件打包成一个文件，不配置则不开启此功能
   */
  libBuild?: BuildLibOptions;
  /**
   * vite 库模式配置，指定文件夹下的所有 js 或者 ts 文件转成 commonjs 和 es module 的文件
   * 默认开启此功能
   */
  fileBuild?: BuildFilesOptions | boolean;
}
```

**options.libBuild**

```ts
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
   * 同 vite 配置字段 build
   */
  buildOptions: BuildOptions;
}
```

**options.fileBuild**

```ts
export interface BuildFilesOptions {
  /**
   * 需要转换的输入文件，只支持 glob 语法，默认为 ['src/**/*.{ts,tsx,js,jsx,vue,svelte}'],
   */
  inputs?: string[];
  /**
   * 忽略的转换文件，只支持 glob 语法，默认为 ['**/*.spec.*', '**/*.test.*', '**/*.d.ts']
   */
  ignoreInputs?: string[];
  /**
   * 此配置会覆盖所有当前构建中 vite config 中 build 配置，
   * 建议优先使用 rollupOptionsOutput、rollupOptionsExternal等其他字段配置
   * 支持函数，第一个参数是入口文件路径
   */
  buildOptions?: BuildOptions | ((inputFilePath: string) => BuildOptions);
  /**
   * 和 rollup output 配置一致，会同时作用在 commonjs 和 es output 配置
   * 支持函数，第一个参数是转换的文件路径
   */
  rollupOptionsOutput?: OutputOptions | ((outputFilePath: string) => OutputOptions);
  /**
   * 和 rollup external 配置一致，
   * 由于 external 不能把自身归属于外部依赖，所以函数模式的参数增加了第四个参数：入口文件相对路径
   * 重新定义 external 需要这样判断：if(id.includes(fileRelativePath)) { return false }
   */
  rollupOptionsExternal?:
    | (string | RegExp)[]
    | string
    | RegExp
    | ((
        source: string,
        importer: string | undefined,
        isResolved: boolean,
        inputFilePath: string,
      ) => boolean | null | void);
  /**
   * 文件只转换为 es 格式，onlyEs 和 onlyCjs 不能同时设置为 true
   */
  onlyEs?: boolean;
  /**
   * 文件只转换为 commonjs 格式，onlyEs 和 onlyCjs 不能同时设置为 true
   */
  onlyCjs?: boolean;
  /**
   * es 文件输出路径
   * @default es
   */
  esOutputDir?: string;
  /**
   * commonjs 文件输出路径
   * @default lib
   */
  commonJsOutputDir?: string;
}
```

## 使用例子

### 只支持文件夹转 commonjs

这是拓展的功能，vite 本身不支持，默认转换文件夹是根目录的 src 文件夹。

```js
import { defineConfig } from 'vite';
import { buildPlugin } from 'vite-plugin-build';

export default defineConfig({
  plugins: [buildPlugin({ fileBuild: { onlyCjs: true } })],
});
```

### 支持单个入口文件转换为 umd 格式

这是 vite 本身支持的 vite 库模式。

```js
import { defineConfig } from 'vite';
import { buildPlugin } from 'vite-plugin-build';

export default defineConfig({
  plugins: [
    buildPlugin({
      libBuild: {
        buildOptions: {
          rollupOptions: {
            external: ['react', 'react-dom'],
            output: {
              globals: {
                react: 'React',
                'react-dom': 'ReactDOM',
              },
            },
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
```

### 文件夹转换模式配置 external

文件夹转换模式默认的 external 默认如下：

```js
function external(id) {
  if (
    id.includes('.less') ||
    id.includes('.css') ||
    id.includes('.svg') ||
    // fileRelativePath 是当前入口文件
    id === path.resolve(process.cwd(), fileRelativePath)
  ) {
    return false;
  }
  return true;
}
```

less、css、svg 则会打包，其他都当中外包依赖包，如果有其他需求，需要自己配置。

```js
import { defineConfig } from 'vite';
import { buildPlugin } from 'vite-plugin-build';

export default defineConfig({
  plugins: [
    buildPlugin({
      fileBuild: {
        rollupOptionsExternal(id, importer, isResolved, fileRelativePath) {
          if (
            id.includes('.scss') ||
            // fileRelativePath 是当前入口文件
            id === path.resolve(process.cwd(), fileRelativePath)
          ) {
            return false;
          }
          return true;
        },
      },
    }),
  ],
});
```

### 修改转换的入口文件夹

入口文件支持 glob 语法。

```js
import { defineConfig } from 'vite';
import { buildPlugin } from 'vite-plugin-build';

export default defineConfig({
  plugins: [buildPlugin({ fileBuild: { inputs: [['node/**/*.mjs']] } })],
});
```
