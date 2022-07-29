# vite-plugin-build

<img width="485" alt="image" src="https://user-images.githubusercontent.com/1954171/181139132-f7915f8c-f222-4fbf-9718-457bf3395af9.png">

vite 库模式插件，支持单个文件转换（vite 的默认模式），还拓展支持整个文件夹的转换（多个输入文件，多个输出文件）。

- 支持多入口文件和多输出文件（文件夹模式）
- 支持 vanilla、react、vue3、svelte 的代码转换
- 支持 vanilla、react、vue3、svelte typesript 声明文件生成

```js
import { defineConfig } from 'vite';
import { buildPlugin } from 'vite-plugin-build';

export default defineConfig({
  plugins: [buildPlugin()],
});
```

生成声明文件

```js
import { defineConfig } from 'vite';
import { buildPlugin } from 'vite-plugin-build';

export default defineConfig({
  plugins: [buildPlugin({ fileBuild: { emitDeclaration: true } })],
});
```

## 在线试用

待补充

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
  fileBuild?: FileBuild | false;
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

export interface BuildFilesOptions {
  /**
   * 输入文件夹，相对于项目根目录下，格式为 `src` 或者 `src/test`
   * @defaults src
   */
  inputFolder?: string;
  /**
   * 支持转换的文件后缀名
   * @defaults ['ts', 'tsx', 'js', 'jsx', 'vue', 'svelte']
   */
  extensions?: string[];
  /**
   * es 文件输出路径，设置为 false 相当于关闭 es 模块的构建
   * @defaults es
   */
  esOutputDir?: string | false;
  /**
   * commonjs 文件输出路径，设置为 false 相当于关闭 commonjs 模块的构建
   * @defaults lib
   */
  commonJsOutputDir?: string | false;
  /**
   * 忽略的转换文件，只支持 glob 语法
   * @defaults ['\*\*\/\*.spec.\*', '\*\*\/\*.test.\*', '\*\*\/\*.d.ts']
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
}
```

## 使用例子

可参考 examples 文件夹下的例子。

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
