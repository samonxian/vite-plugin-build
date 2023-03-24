import path from 'path';
import spawn from 'cross-spawn';
import fs from 'fs-extra';
import fg from 'fast-glob';
import colors from 'picocolors';
import type { ResolvedConfig } from 'vite';
import { removeSuffix } from './buildFiles';
import type { BuildFilesOptions } from './buildFiles';
import { restoreConsole } from './InterceptConsole';
import { LogLevels } from './reporter';

export function emitDeclaration(options: {
  rootDir?: string;
  esOutputDir?: BuildFilesOptions['esOutputDir'];
  commonJsOutputDir?: BuildFilesOptions['commonJsOutputDir'];
  isVue?: boolean;
  isSvelte?: boolean;
  resolvedConfig: ResolvedConfig;
}) {
  const { rootDir, esOutputDir, commonJsOutputDir, resolvedConfig, isSvelte, isVue } = options;
  const outputDir = commonJsOutputDir || esOutputDir;
  const shouldLogInfo = LogLevels[resolvedConfig.logLevel || 'info'] >= LogLevels.info;

  if (outputDir && rootDir) {
    shouldLogInfo && restoreConsole.log(colors.cyan('emitting the declaration files...'));

    if (isSvelte) {
      const { compile } = require('svelte-tsc');

      compile({
        rootDir,
        declaration: true,
        emitDeclarationOnly: true,
        declarationDir: outputDir,
      });
    } else {
      const tscPath = path.resolve(require.resolve('typescript').split('node_modules')[0], 'node_modules/.bin/tsc');
      const vueTscPath = path.resolve(
        require.resolve('vue-tsc/out/proxy').split('node_modules')[0],
        'node_modules/.bin/vue-tsc',
      );

      spawn.sync(
        isVue ? vueTscPath : tscPath,
        ['--rootDir', rootDir, '--declaration', '--emitDeclarationOnly', '--declarationDir', outputDir],
        {
          stdio: 'ignore',
        },
      );
    }

    if (isVue) {
      renameVueTdsFileName({ esOutputDir, commonJsOutputDir });
    }

    if (isSvelte) {
      renameSvelteTdsFileName({ esOutputDir, commonJsOutputDir });
    }

    // 拷贝构建根目录中以 .d.ts 为后缀名的文件
    const rootDtsFiles = fg.sync([`${rootDir}/**/*.d.ts`]);
    for (const file of rootDtsFiles) {
      const filePath = path.resolve(process.cwd(), file);
      const copyTargetFilePath = path.resolve(process.cwd(), file.replace(new RegExp(`^${rootDir}`), outputDir));
      fs.ensureFileSync(copyTargetFilePath);
      fs.copyFileSync(filePath, copyTargetFilePath);
    }

    if (commonJsOutputDir && esOutputDir) {
      const dtsFiles = fg.sync([`${commonJsOutputDir}/**/*.d.ts`]);

      for (const relativeFilePath of dtsFiles) {
        const filePath = path.resolve(process.cwd(), relativeFilePath);
        const copyTargetFilePath = path.resolve(
          process.cwd(),
          relativeFilePath.replace(new RegExp(`^${commonJsOutputDir}`), esOutputDir),
        );
        fs.ensureFileSync(copyTargetFilePath);
        fs.copyFileSync(filePath, copyTargetFilePath);
      }
    }
  }
}

function renameVueTdsFileName(options: {
  rootDir?: string;
  esOutputDir?: BuildFilesOptions['esOutputDir'];
  commonJsOutputDir?: BuildFilesOptions['commonJsOutputDir'];
}) {
  const { esOutputDir, commonJsOutputDir, rootDir = path.resolve(process.cwd()) } = options;
  renameTargetTdsFileName({ rootDir, targetLanguage: 'vue', esOutputDir, commonJsOutputDir });
}

function renameSvelteTdsFileName(options: {
  rootDir?: string;
  esOutputDir?: BuildFilesOptions['esOutputDir'];
  commonJsOutputDir?: BuildFilesOptions['commonJsOutputDir'];
}) {
  const { esOutputDir, commonJsOutputDir, rootDir = path.resolve(process.cwd()) } = options;
  renameTargetTdsFileName({ rootDir, targetLanguage: 'svelte', esOutputDir, commonJsOutputDir });
}

function renameTargetTdsFileName(options: {
  targetLanguage: string;
  rootDir?: string;
  esOutputDir?: BuildFilesOptions['esOutputDir'];
  commonJsOutputDir?: BuildFilesOptions['commonJsOutputDir'];
}) {
  try {
    const { targetLanguage, esOutputDir, commonJsOutputDir, rootDir = path.resolve(process.cwd()) } = options;
    // 重命名 vue-tsc 生成的生命文件
    const vueDtsFiles = fg.sync(
      [esOutputDir && `${esOutputDir}/**/*.d.ts`, commonJsOutputDir && `${commonJsOutputDir}/**/*.d.ts`].filter(
        Boolean,
      ),
    );
    const getTargetDtsFilePath = (targetFilePath: string) => targetFilePath.replace(`.${targetLanguage}.d.ts`, '.d.ts');

    for (const relativeFilePath of vueDtsFiles) {
      const move = () => {
        const filePath = path.resolve(rootDir, relativeFilePath);
        if (filePath.includes(`.${targetLanguage}.d.ts`)) {
          fs.moveSync(filePath, getTargetDtsFilePath(filePath));
        }
      };
      move();

      const removeTargetSuffix = () => {
        const filePath = path.resolve(rootDir, getTargetDtsFilePath(relativeFilePath));
        const content = fs.readFileSync(filePath, { encoding: 'utf8' });
        fs.writeFileSync(filePath, removeSuffix(content));
      };

      removeTargetSuffix();
    }
  } catch (err) {
    console.error(colors.red('Typescript dts file rename failed.'));
    throw err;
  }
}
