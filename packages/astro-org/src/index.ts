import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import type { AstroIntegration, ContentEntryType, HookParameters } from 'astro';
import { emitESMImage } from 'astro/assets/utils';
// This rendered seems to be private and is not explicitly exported.
// @ts-ignore
import astroJSXRenderer from 'astro/jsx/renderer.js';

import { unified, type PluggableList } from 'unified';
import { VFile } from 'vfile';
import uniorg from 'uniorg-parse';
import orgPlugin, { type OrgPluginOptions } from 'rollup-plugin-orgx';
import { extractKeywords } from 'uniorg-extract-keywords';
import { uniorgSlug } from 'uniorg-slug';
import { visitIds } from 'orgast-util-visit-ids';
import { visit } from 'unist-util-visit';
import { parse } from 'uniorg-parse/lib/parser.js';
import { orgToHast } from 'uniorg-rehype/lib/org-to-hast.js';
import uniorg2rehype from 'uniorg-rehype';
import html from 'rehype-stringify';
import { toHtml } from 'hast-util-to-html';

import { rehypeExportFrontmatter } from './plugin/rehype-export-frontmatter.js';

declare module 'vfile' {
  interface DataMap {
    astro: {
      frontmatter: Record<string, unknown>;
    };
  }
}

export type Options = OrgPluginOptions;

type SetupHookParams = HookParameters<'astro:config:setup'> & {
  // `contentEntryType` is not a public API
  // Add type defs here
  addContentEntryType: (contentEntryType: ContentEntryType) => void;
};

export default function orgModeIntegration(
  options: OrgPluginOptions = {}
): AstroIntegration {
  const uniorgPlugins: PluggableList = [
    initFrontmatter,
    [extractKeywords, { name: 'keywords' }],
    keywordsToFrontmatter,
    uniorgSlug,
    saveIds,
    ...(options.uniorgPlugins ?? []),
  ];

  return {
    name: 'astro-org',
    hooks: {
      'astro:config:setup': async (params) => {
        const { updateConfig, addRenderer, addContentEntryType } =
          params as SetupHookParams;

        addRenderer(astroJSXRenderer);

        addContentEntryType({
          extensions: ['.org'],
          async getEntryInfo({ fileUrl, contents }) {
            const ast = parse(contents);
            const keywords: Record<string, string> = {};

            visit(ast, 'keyword', (node: any) => {
              Object.assign(keywords, { [node.key]: node.value });
            });
            return {
              data: {
                title: keywords.TITLE,
                description: keywords.DESCRIPTION,
                date: keywords.DATE,
              },
              body: contents,
              // Astro typing requires slug to be a string, however
              // I'm pretty sure that mdx integration returns
              // undefined if slug is not set in frontmatter.
              slug: keywords.SLUG,
              rawData: contents,
            };
          },

          async getRenderModule({ contents, fileUrl, viteId }) {
            const pluginContext = this;
            const astroConfig = params.config;
            const ast = parse(contents);
            const testAst = orgToHast(ast);

            const filePath = fileURLToPath(fileUrl);
            await emitOptimizedImages(
              ast.children,
              {
                astroConfig,
                pluginContext,
                filePath,
              },
              testAst as any
            );
            console.log(testAst);

            const rawHTML = toHtml(testAst as any);
            console.log(JSON.stringify(testAst, null, 2));

            const code = `
import { jsx, Fragment } from 'astro/jsx-runtime';

export const html = ${JSON.stringify(rawHTML)}

export async function Content(props) {
    return jsx(Fragment, { 'set:html': html });
}

export default Content;

`;
            return { code };
          },

          contentModuleTypes: fs.readFileSync(
            new URL('../template/content-module-types.d.ts', import.meta.url),
            'utf-8'
          ),
          handlePropagation: true,
        });
      },
    },
  };
}

function initFrontmatter() {
  return transformer;

  function transformer(_tree: any, file: any) {
    if (!file.data.astro) {
      file.data.astro = { frontmatter: {} };
    }
  }
}
function prependForwardSlash(str: string) {
  return str[0] === '/' ? str : '/' + str;
}

async function emitOptimizedImages(
  tree: any[],
  ctx: {
    pluginContext: any;
    filePath: string;
    astroConfig: any;
  },
  stree: any
) {
  const images: any[] = [];

  visit(stree, 'element', function (node: any) {
    if (
      node.tagName === 'img' &&
      node.properties &&
      node.properties.src &&
      shouldOptimizeImage(node.properties.src)
    ) {
      images.push(node);
    }
  });

  for (const node of images) {
    const resolved = await ctx.pluginContext.resolve(
      node.properties.src,
      ctx.filePath
    );

    if (
      resolved?.id &&
      fs.existsSync(new URL(prependForwardSlash(resolved.id), 'file://'))
    ) {
      const src = await emitESMImage(
        resolved.id,
        ctx.pluginContext.meta.watchMode,
        ctx.pluginContext.emitFile
      );
      const fsPath = resolved.id;

      if (src) {
        // We cannot track images in Markdoc, Markdoc rendering always strips out the proxy. As such, we'll always
        // assume that the image is referenced elsewhere, to be on safer side.
        //if (ctx.astroConfig.output === 'static') {
        //  if (globalThis.astroAsset.referencedImages)
        //    globalThis.astroAsset.referencedImages.add(fsPath);
        //}
        node.properties.src = src.src;

        //node.properties['__optimizedSrc'] = { ...src, fsPath };
      }
    }
  }
}

function isValidUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

function shouldOptimizeImage(src: string) {
  // Optimize anything that is NOT external or an absolute path to `public/`
  return !isValidUrl(src) && !src.startsWith('/');
}

function extractImages() {
  return transformer;

  function transformer(tree: any, file: any) {
    //emitOptimizedImages(tree, file);
  }
}

function keywordsToFrontmatter() {
  return transformer;

  function transformer(_tree: any, file: any) {
    file.data.astro.frontmatter = {
      ...file.data.astro.frontmatter,
      ...file.data.keywords,
    };
  }
}

function saveIds() {
  return transformer;

  function transformer(tree: any, file: any) {
    const astro = file.data.astro;
    const ids = astro.ids || (astro.ids = {});

    visitIds(tree, (id, node) => {
      if (node.type === 'org-data') {
        ids['id:' + id] = '';
      } else if (node.type === 'section') {
        const headline = node.children[0];
        const data: any = (headline.data = headline.data || {});
        if (!data?.hProperties?.id) {
          // The headline doesn't have an html id assigned.
          //
          // Assign an html id property based on org id property, so
          // the links are not broken.
          data.hProperties = data.hProperties || {};
          data.hProperties.id = id;
        }

        ids['id:' + id] = '#' + data?.hProperties?.id;
      }
    });
  }
}
