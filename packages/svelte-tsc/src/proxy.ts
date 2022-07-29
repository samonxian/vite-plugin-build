// import * as ts from 'typescript/lib/tsserverlibrary';

// export function createProgramProxy(
//   options: ts.CreateProgramOptions, // rootNamesOrOptions: readonly string[] | CreateProgramOptions,
// ) {
//   if (!options.options.noEmit && !options.options.emitDeclarationOnly) return doThrow('js emit is not support');

//   if (!options.host) return doThrow('!options.host');

//   let program = options.oldProgram as any;

//   if (!program) {
//     const ctx = {
//       projectVersion: 0,
//       options: options,
//     };

//     program = vueTsLs.getProgram();
//     program.__VLS_ctx = ctx;
//   } else {
//     program.__VLS_ctx.options = options;
//     program.__VLS_ctx.projectVersion++;
//   }

//   for (const rootName of options.rootNames) {
//     // register file watchers
//     options.host.getSourceFile(rootName, ts.ScriptTarget.ESNext);
//   }

//   return program;
// }

// export function loadTsLib() {
//   return ts;
// }

// function doThrow(msg: string) {
//   console.error(msg);
//   throw msg;
// }
