# vite-plugin-build

<img width="485" alt="image" src="https://user-images.githubusercontent.com/1954171/181139132-f7915f8c-f222-4fbf-9718-457bf3395af9.png">

English | [中文](./README.md)

The Vite library Mode plugin, which supports single file transform (the default mode for Vite) ,
also support entire folders transform (multiple input files and multiple output files).

- support multiple input files and multiple output files（folder mode）
- support vanilla,react,vue3 and svelte code transform
- support emitting typescript declaration files (vanilla,react,vue3 and svelte)

````js
import { defineConfig } from 'vite';
import { buildPlugin } from 'vite-plugin-build';

export default defineConfig({
  plugins: [buildPlugin()],
});
``

**emit declaration file**

```js
import { defineConfig } from 'vite';
import { buildPlugin } from 'vite-plugin-build';

export default defineConfig({
  plugins: [buildPlugin({ fileBuild: { emitDeclaration: true } })],
});
````

## Online Demo

- [vanilla-ts](https://stackblitz.com/edit/vite-plugin-build-vanilla-ts-8v9fkj?file=vite.config.ts)
- [react-ts](https://stackblitz.com/edit/vite-plugin-build-react-ts-bphvr?file=vite.config.ts)
- [vue-ts](https://stackblitz.com/edit/vite-plugin-build-vue-ts-krtmf?file=vite.config.ts)
- [svelte-ts](https://stackblitz.com/edit/vite-plugin-build-svelte-ts-63wpkp?file=vite.config.ts)

## Warning

When using this plugin, the config build field of vite configuration will not work.

## Options

```ts
export interface Options {
  /**
   * Vite library mode setting,the entry file is bundled as a file,
   * and this feature is not enabled if it is not configured.
   */
  libBuild?: BuildLibOptions;
  /**
   * Vite library mode setting，which will transfrom all js or ts files in the specified folder to commonjs and es module files.
   * This feature is enabled by default.
   */
  fileBuild?: FileBuild | false;
}
```

**options.libBuild**

```ts
export interface BuildLibOptions {
  /**
   * The files is only tansformed to es format, onlyEs and onlyCjs cannot be set to true at the same time.
   */
  onlyEs?: boolean;
  /**
   * The files is only tansformed to commonjs format, onlyEs and onlyCjs cannot be set to true at the same time.
   */
  onlyCjs?: boolean;
  /**
   * Same as vite configuration field build.
   */
  buildOptions: BuildOptions;
}
```

**options.fileBuild**

```ts
export interface FileBuild extends BuildFilesOptions {
  /**
   * Whether to emit typescript declaration files
   */
  emitDeclaration?: boolean;
  /**
   * Whether it is a vue file build, it is processed with emitDeclaration.
   * Whe using the official plugin @vitejs/plugin-vue,the default value is true.
   */
  isVue?: boolean;
  /**
   * Whether it is a vue file build, it is processed with emitDeclaration.
   * Whe using the official plugin @sveltejs/vite-plugin-svelte,the default value is true.
   */
  isSvelte?: boolean;
}

export interface BuildFilesOptions {
  /**
   * The input folder，relative to the project root directory，the format is `src` or `src/test`.
   * @defaults src
   */
  inputFolder?: string;
  /**
   * The supported file extensions for transforming.
   * @defaults ['ts', 'tsx', 'js', 'jsx', 'vue', 'svelte']
   */
  extensions?: string[];
  /**
   * The es files output path, when setting it to false,it will close the building of the es module.
   * @defaults es
   */
  esOutputDir?: string | false;
  /**
   * The commonjs files output path, when setting it to false,it will close the building of the commonjs module.
   * @defaults lib
   */
  commonJsOutputDir?: string | false;
  /**
   * The ignored transform files, only glob syntax is supported.
   * @defaults ['\*\*\/\*.spec.\*', '\*\*\/\*.test.\*', '\*\*\/\*.d.ts']
   */
  ignoreInputs?: string[];
  /**
   * This configuration will override the build configuration in vite config.
   * It is recommended to use rollupOptionsOutput, rollupOptionsExternal and other field configurations first.
   * Support function, the first parameter is the entry file path.
   */
  buildOptions?: BuildOptions | ((inputFilePath: string) => BuildOptions);
  /**
   * Consistent with the rollup output configuration, it will work on both commonjs and es output configuration.
   * Support function, the first parameter is the ouput file path.
   */
  rollupOptionsOutput?: OutputOptions | ((outputFilePath: string) => OutputOptions);
  /**
   * Consistent with rollup external configuration.
   * Since external cannot attribute itself to external dependencies,
   * a fourth parameter is added to the parameters of the function mode: the relative path of the entry file.
   * Redefining external requires this judgment：if(id.includes(path.resolve(fileRelativePath))) { return false }
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

## Usage Examples

See the examples in the examples folder.

### Only support folder to commonjs format

This is an extended function, which is not supported by vite itself.
The default transforming folder is the src folder of the root directory.

```js
import { defineConfig } from 'vite';
import { buildPlugin } from 'vite-plugin-build';

export default defineConfig({
  plugins: [buildPlugin({ fileBuild: { onlyCjs: true } })],
});
```

### Supports converting a single entry file to umd format

This is the vite library mode that vite natively supports.

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

### Folder mode configuration of `external`

The default external of folder mode is as follows:

```js
function external(id) {
  if (isAsset() || isVueTempFile(id) || id === path.resolve(process.cwd(), fileRelativePath)) {
    return false;
  }
  return true;
}
```

The less, css, and svg will be bundled, and others are outsourced.
If you have other requirements, you need to configure them yourself.

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

### Change the input folder

```js
import { defineConfig } from 'vite';
import { buildPlugin } from 'vite-plugin-build';

export default defineConfig({
  plugins: [buildPlugin({ fileBuild: { inputFolder: 'main' } })],
});
```
