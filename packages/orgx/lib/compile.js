/**
 * @typedef {import('vfile').VFileCompatible} VFileCompatible
 * @typedef {import('vfile').VFile} VFile
 * @typedef {import('./core.js').PluginOptions} PluginOptions
 * @typedef {import('./core.js').BaseProcessorOptions} BaseProcessorOptions
 *
 * @typedef {BaseProcessorOptions & PluginOptions} CompileOptions
 */

import { createProcessor } from './core.js';
import { resolveFileAndOptions } from './util/resolve-file-and-options.js';

/**
 * Compile Org-mode to JS.
 *
 * @param {VFileCompatible} vfileCompatible
 *   Org document to parse (`string`, `Buffer`, `vfile`, anything that can be
 *   given to `vfile`).
 * @param {CompileOptions} [compileOptions]
 * @return {Promise<VFile>}
 */
export function compile(vfileCompatible, compileOptions) {
  const { file, options } = resolveFileAndOptions(
    vfileCompatible,
    compileOptions
  );
  return createProcessor(options).process(file);
}

/**
 * Synchronously compile Org-mode to JS.
 *
 * @param {VFileCompatible} vfileCompatible
 *   MDX document to parse (`string`, `Buffer`, `vfile`, anything that can be
 *   given to `vfile`).
 * @param {CompileOptions} [compileOptions]
 * @return {VFile}
 */
export function compileSync(vfileCompatible, compileOptions) {
  const { file, options } = resolveFileAndOptions(
    vfileCompatible,
    compileOptions
  );
  return createProcessor(options).processSync(file);
}
