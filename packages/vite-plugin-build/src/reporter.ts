// 功能参考和搬运 vite 官方 reporter 插件
import path from 'node:path';
import { gzip } from 'node:zlib';
import { promisify } from 'node:util';
import colors from 'picocolors';
import { normalizePath } from 'vite';
import type { LogLevel, ResolvedConfig } from 'vite';
import type { OutputBundle } from 'rollup';
import { restoreConsole } from './InterceptConsole';

export const LogLevels: Record<LogLevel, number> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
};

const enum WriteType {
  JS,
  CSS,
  ASSET,
  HTML,
  SOURCE_MAP,
}

const writeColors = {
  [WriteType.JS]: colors.cyan,
  [WriteType.CSS]: colors.magenta,
  [WriteType.ASSET]: colors.green,
  [WriteType.HTML]: colors.blue,
  [WriteType.SOURCE_MAP]: colors.gray,
};

export function createReporter(config: ResolvedConfig) {
  const compress = promisify(gzip);
  const chunkLimit = config.build.chunkSizeWarningLimit;

  async function getCompressedSize(code: string | Uint8Array): Promise<string> {
    if (config.build.ssr || !config.build.reportCompressedSize) {
      return '';
    }
    return ` / gzip: ${((await compress(typeof code === 'string' ? code : Buffer.from(code))).length / 1024).toFixed(
      2,
    )} KiB`;
  }

  function printFileInfo(
    filePath: string,
    content: string | Uint8Array,
    type: WriteType,
    maxLength: number,
    compressedSize = '',
    newOutDir?: string,
  ) {
    let outDir = '';
    if (newOutDir) {
      outDir = newOutDir.replace(`/${filePath}`, '') + '/';
    } else {
      outDir = normalizePath(path.relative(config.root, path.resolve(config.root, config.build.outDir))) + '/';
    }

    const kibs = content.length / 1024;
    const sizeColor = kibs > chunkLimit ? colors.yellow : colors.dim;
    restoreConsole.info(
      `${colors.gray(colors.white(colors.dim(outDir)))}${writeColors[type](filePath.padEnd(maxLength + 2))} ${sizeColor(
        `${kibs.toFixed(2)} KiB${compressedSize}`,
      )}`,
    );
  }

  const tty = process.stdout.isTTY && !process.env.CI;
  const shouldLogInfo = LogLevels[config.logLevel || 'info'] >= LogLevels.info;
  let hasTransformed = false;
  let transformedCount = 0;
  const outputBudles: OutputBundle[] = [];

  async function writeBundle(output: OutputBundle) {
    if (shouldLogInfo) {
      let longest = 0;
      for (const file in output) {
        const l = output[file].fileName.length;
        if (l > longest) longest = l;
      }

      await Promise.all(
        Object.keys(output).map(async (file) => {
          const chunk = output[file];
          // @ts-ignore
          const { outputFilePath } = chunk;
          if (chunk.type === 'chunk') {
            printFileInfo(
              chunk.fileName,
              chunk.code,
              WriteType.JS,
              longest,
              await getCompressedSize(chunk.code),
              outputFilePath,
            );
            if (chunk.map) {
              printFileInfo(
                chunk.fileName + '.map',
                chunk.map.toString(),
                WriteType.SOURCE_MAP,
                longest,
                outputFilePath,
              );
            }
          } else if (chunk.source) {
            const isCSS = chunk.fileName.endsWith('.css');
            const isMap = chunk.fileName.endsWith('.js.map');
            printFileInfo(
              chunk.fileName,
              chunk.source,
              isCSS ? WriteType.CSS : isMap ? WriteType.SOURCE_MAP : WriteType.ASSET,
              longest,
              isCSS ? await getCompressedSize(chunk.source) : undefined,
              outputFilePath ? outputFilePath.replace(`/${path.basename(outputFilePath)}`, '') : null,
            );
          }
        }),
      );
    }
  }
  const logTransform = throttle((id: string) => {
    writeLine(`transforming (${transformedCount}) ${colors.dim(path.relative(config.root, id))}`);
  });

  return {
    transform(id: string) {
      transformedCount++;
      if (shouldLogInfo) {
        if (!tty) {
          if (!hasTransformed) {
            restoreConsole.info(`transforming...`);
          }
        } else {
          if (id.includes(`?`)) return;
          logTransform(id);
        }
        hasTransformed = true;
      }
    },

    async writeBundle(output: OutputBundle) {
      outputBudles.push(output);
    },

    async buildEndAll() {
      if (shouldLogInfo) {
        if (tty) {
          process.stdout.clearLine(0);
          process.stdout.cursorTo(0);
        }

        restoreConsole.info(`${colors.green(`✓`)} ${transformedCount} modules transformed.`);

        for (let i = 0; i < outputBudles.length; i++) {
          await writeBundle(outputBudles[i]);
        }
      }
    },
  };
}

function writeLine(output: string) {
  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
  if (output.length < process.stdout.columns) {
    process.stdout.write(output);
  } else {
    process.stdout.write(output.substring(0, process.stdout.columns - 1));
  }
}

function throttle(fn: Function) {
  let timerHandle: NodeJS.Timeout | null = null;
  return (...args: any[]) => {
    if (timerHandle) return;
    fn(...args);
    timerHandle = setTimeout(() => {
      timerHandle = null;
    }, 100);
  };
}
