import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { AstroIntegration, ContentEntryType, HookParameters } from 'astro';
import { emitESMImage } from 'astro/assets/utils';
// This rendered seems to be private and is not explicitly exported.
// @ts-ignore
import astroJSXRenderer from 'astro/jsx/renderer.js';

import { unified, type PluggableList } from 'unified';
import { VFile } from 'vfile';
import uniorg from 'uniorg-parse';
import orgPlugin, { type OrgPluginOptions } from 'rollup-plugin-orgx';
//import { extractKeywords } from 'uniorg-extract-keywords';
//import { uniorgSlug } from 'uniorg-slug';
import { visitIds } from 'orgast-util-visit-ids';
import { visit } from 'unist-util-visit';
import { parse } from 'uniorg-parse/lib/parser.js';
//import { orgToHast } from 'uniorg-rehype/lib/org-to-hast.js';
import uniorg2rehype from 'uniorg-rehype';
//import { toHtml } from 'hast-util-to-html';
import rehypeParse from 'rehype-parse';
import rehypeStringify from 'rehype-stringify';

//import { rehypeExportFrontmatter } from './plugin/rehype-export-frontmatter.js';

declare module 'vfile' {
  interface DataMap {
    astro: {
      frontmatter: Record<string, unknown>;
    };
  }
}

export type Options = OrgPluginOptions;

type SetupHookParams = HookParameters<'astro:config:setup'> & {
  // `addPageExtension` and `contentEntryType` are not a public APIs
  // `contentEntryType` is not a public API
  // Add type defs here
  addPageExtension: (extension: string) => void;
  addContentEntryType: (contentEntryType: ContentEntryType) => void;
};

function getKeywords(contents: string): Record<string, string> {
  const keywords: Record<string, string> = {};
  const ast = parse(contents);

  visit(ast, 'keyword', (node: { key: string; value: string }) => {
    Object.assign(keywords, { [node.key]: node.value });
  });

  return keywords;
}

export default function org(options: OrgPluginOptions = {}): AstroIntegration {
  const uniorgPlugins: PluggableList = [
    //uniorgSlug,
    //saveIds,
    ...(options.uniorgPlugins ?? []),
  ];

  const rehypePlugins: PluggableList = [...(options.rehypePlugins ?? [])];

  return {
    name: 'astro-org',
    hooks: {
      'astro:config:setup': async (params) => {
        const {
          updateConfig,
          addRenderer,
          addContentEntryType,
          addPageExtension,
          config: astroConfig,
        } = params as SetupHookParams;

        addRenderer(astroJSXRenderer);
        addPageExtension('.org');
        addContentEntryType({
          extensions: ['.org'],
          async getEntryInfo({ fileUrl, contents }) {
            const frontmatter = getKeywords(contents);

            return {
              data: {
                // TODO(Kevin): These are kinda fucked
                title: frontmatter.TITLE,
                description: frontmatter.DESCRIPTION,
                date: frontmatter.DATE,
              },
              body: contents,
              // NOTE: Astro typing requires slug to be a string, however I'm
              // pretty sure that mdx integration returns undefined if slug is
              // not set in frontmatter.
              slug: frontmatter.SLUG,
              rawData: contents,
            };
          },
          async getRenderModule({ fileUrl, contents, viteId }) {
            const pluginContext = this;
            const filePath = fileURLToPath(fileUrl);
            //const entry = getEntryInfo({ contents, fileUrl });
            //const orgAst = parse(contents);
            //const hast = orgToHast(orgAst) as any;
            const uniorgToHast = unified()
              .use(uniorg)
              .use(uniorgPlugins)
              .use(uniorg2rehype);

            const htmlToHtml = unified()
              .use(rehypeParse)
              .use(rehypePlugins)
              .use(rehypeStringify);

            const hast = await uniorgToHast.run(
              uniorgToHast.parse(contents) as any
            );

            await emitOptimizedImages(hast as any, {
              astroConfig,
              pluginContext,
              filePath,
            });

            //const rawHTML = toHtml(hast.children as any);
            const rawHTML = htmlToHtml.stringify(hast as any);

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

function prependForwardSlash(str: string) {
  return str[0] === '/' ? str : '/' + str;
}

async function emitOptimizedImages(
  tree: any,
  ctx: {
    pluginContext: any;
    filePath: string;
    astroConfig: any;
  }
) {
  const images: any[] = [];

  visit(tree, 'element', function (node: any) {
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

      if (src) {
        node.properties.src = src.src;
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
