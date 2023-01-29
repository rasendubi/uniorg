/**
 * @typedef {import('unified').Processor} Processor
 * @typedef {import('unified').PluggableList} PluggableList
 * @typedef {import('./plugin/recma-document.js').RecmaDocumentOptions} RecmaDocumentOptions
 * @typedef {import('./plugin/recma-stringify.js').RecmaStringifyOptions} RecmaStringifyOptions
 * @typedef {import('./plugin/recma-jsx-rewrite.js').RecmaJsxRewriteOptions} RecmaJsxRewriteOptions
 * @typedef {import('uniorg-parse/lib/parse-options').ParseOptions} UniorgParseOptions
 * @typedef {import('uniorg-rehype').Options} UniorgRehypeOptions
 *
 * @typedef BaseProcessorOptions
 * @property {boolean} [jsx=false]
 *   Whether to keep JSX.
 * @property {'program'|'function-body'} [outputFormat='program']
 *   Whether to compile to a whole program or a function body..
 * @property {PluggableList} [recmaPlugins]
 *   List of recma (esast, JavaScript) plugins.
 * @property {PluggableList} [uniorgPlugins]
 *   List of uniorg (orgast) plugins.
 * @property {PluggableList} [rehypePlugins]
 *   List of rehype (hast, HTML) plugins.
 * @property {UniorgParseOptions} [uniorgParseOptions]
 *   Options to pass to `uniorg-parse`.
 * @property {UniorgRehypeOptions} [uniorgRehypeOptions]
 *   Options to pass through to `uniorg-rehype`.
 *
 * @typedef {Omit<RecmaDocumentOptions & RecmaStringifyOptions & RecmaJsxRewriteOptions, 'outputFormat'>} PluginOptions
 * @typedef {BaseProcessorOptions & PluginOptions} ProcessorOptions
 */

import { unified } from 'unified';
import uniorgParse from 'uniorg-parse';
import uniorgRehype from 'uniorg-rehype';
import { recmaJsxBuild } from './plugin/recma-jsx-build.js';
import { recmaDocument } from './plugin/recma-document.js';
import { recmaJsxRewrite } from './plugin/recma-jsx-rewrite.js';
import { recmaStringify } from './plugin/recma-stringify.js';
import { rehypeRecma } from './plugin/rehype-recma.js';
import { nodeTypes } from './node-types.js';
import { development as defaultDevelopment } from './condition.js';

/**
 * Pipeline to:
 *
 * 1. Parse Org
 * 2. Transform through uniorg (orgast), rehype (hast), and recma (esast)
 * 3. Serialize as JavaScript
 *
 * @param {ProcessorOptions} [options]
 * @return {Processor}
 */
export function createProcessor(options = {}) {
  const {
    development = defaultDevelopment,
    jsx,
    outputFormat,
    providerImportSource,
    uniorgParseOptions = {},
    uniorgPlugins,
    uniorgRehypeOptions = {},
    rehypePlugins,
    recmaPlugins,
    SourceMapGenerator,
    ...rest
  } = options;

  const pipeline = unified()
    .use(uniorgParse, uniorgParseOptions)
    .use(uniorgPlugins || [])
    .use(uniorgRehype, {
      ...uniorgRehypeOptions,
      allowDangerousHtml: true,
      /* c8 ignore next */
      passThrough: [...(uniorgRehypeOptions.passThrough || []), ...nodeTypes],
    })
    .use(rehypePlugins || [])
    .use(rehypeRecma)
    .use(recmaDocument, { ...rest, outputFormat })
    .use(recmaJsxRewrite, { development, providerImportSource, outputFormat });

  if (!jsx) {
    pipeline.use(recmaJsxBuild, { development, outputFormat });
  }

  pipeline.use(recmaStringify, { SourceMapGenerator }).use(recmaPlugins || []);

  return pipeline;
}
