import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Rollup } from 'vite';
import type {
  AstroConfig,
  AstroIntegration,
  ContentEntryModule,
  ContentEntryType,
  HookParameters,
} from 'astro';
import { emitESMImage } from 'astro/assets/utils';
import astroJSXRenderer from 'astro/jsx/renderer.js';
import type { Root as AstRoot, Element as AstElement } from 'hast';
import { visit } from 'unist-util-visit';
import { VFile } from 'vfile';
import { unified, type PluggableList } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeStringify from 'rehype-stringify';

import uniorg from 'uniorg-parse';
import uniorg2rehype from 'uniorg-rehype';
import { extractKeywords } from 'uniorg-extract-keywords';
import { uniorgSlug } from 'uniorg-slug';
import { visitIds } from 'orgast-util-visit-ids';
import { OrgData } from 'uniorg';

declare module 'vfile' {
  interface DataMap {
    astro: {
      frontmatter: Record<string, unknown>;
    };
  }
}

export type Options = {
  uniorgPlugins?: PluggableList;
  rehypePlugins?: PluggableList;
};

type SetupHookParams = HookParameters<'astro:config:setup'> & {
  // NOTE: `addPageExtension` and `contentEntryType` are not a public APIs
  // Add type defs here
  addPageExtension: (extension: string) => void;
  addContentEntryType: (contentEntryType: ContentEntryType) => void;
};

export default function org(options: Options = {}): AstroIntegration {
  const uniorgPlugins: PluggableList = [
    initFrontmatter,
    [extractKeywords, { name: 'keywords' }],
    keywordsToFrontmatter,
    uniorgSlug,
    saveIds,
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

        const uniorgToHast = unified()
          .use(uniorg)
          .use(uniorgPlugins)
          .use(uniorg2rehype);

        const htmlToHtml = unified()
          .use(rehypeParse)
          .use(rehypePlugins)
          .use(rehypeStringify);

        addRenderer(astroJSXRenderer);
        addPageExtension('.org');
        addContentEntryType({
          extensions: ['.org'],
          async getEntryInfo({ fileUrl, contents }) {
            const f = new VFile({ path: fileUrl, value: contents });

            await uniorgToHast.run(uniorgToHast.parse(f) as OrgData, f);
            const frontmatter = f.data.astro!.frontmatter;

            return {
              data: {
                ...frontmatter,
                metadata: f.data.astro,
              },
              body: contents,
              // NOTE: Astro typing requires slug to be a string, however I'm
              // pretty sure that mdx integration returns undefined if slug is
              // not set in frontmatter.
              slug: frontmatter.slug as string,
              rawData: contents,
            };
          },
          async getRenderModule({ fileUrl, contents }) {
            const pluginContext = this;
            const filePath = fileURLToPath(fileUrl);

            const f = new VFile({ path: fileUrl, value: contents });
            const hast = await uniorgToHast.run(
              uniorgToHast.parse(f) as OrgData,
              f
            );

            await emitOptimizedImages(hast, {
              astroConfig,
              pluginContext,
              filePath,
            });

            // TODO(Kevin): Typescript mismatch about the same packag?
            const htmlStr = htmlToHtml.stringify(hast as any, f);

            const code = `
import { jsx, Fragment } from 'astro/jsx-runtime';
const html = ${JSON.stringify(htmlStr)}

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

  function transformer(_tree: unknown, file: VFile) {
    if (!file.data.astro) {
      file.data.astro = { frontmatter: {} };
    }
  }
}

function keywordsToFrontmatter() {
  return transformer;

  function transformer(_tree: unknown, file: any) {
    file.data.astro.frontmatter = {
      ...file.data.astro.frontmatter,
      ...file.data.keywords,
    };
  }
}

function saveIds() {
  return transformer;

  function transformer(tree: OrgData, file: any) {
    const astro = file.data.astro;
    const ids = astro.ids || (astro.ids = {});

    visitIds(tree, (id, node) => {
      if (node.type === 'org-data') {
        ids['id:' + id] = '';
      } else if (node.type === 'section') {
        const headline = node.children[0];
        const data: any = (headline.data = headline.data || {});
        if (!data?.hProperties?.id) {
          // NOTE: The headline doesn't have an html id assigned.
          //
          // Assign an html id property based on org id property, so the links
          // are not broken.
          data.hProperties = data.hProperties || {};
          data.hProperties.id = id;
        }

        ids['id:' + id] = '#' + data?.hProperties?.id;
      }
    });
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
  // NOTE(Kevin): Optimize anything that is NOT external or an absolute path to
  // `public/`
  return !isValidUrl(src) && !src.startsWith('/');
}

async function emitOptimizedImages(
  tree: AstRoot,
  ctx: {
    pluginContext: Rollup.PluginContext;
    filePath: string;
    astroConfig: AstroConfig;
  }
) {
  const images: AstElement[] = [];

  visit(tree, 'element', function (node) {
    if (
      node.tagName === 'img' &&
      node.properties &&
      node.properties.src &&
      typeof node.properties.src === 'string' &&
      shouldOptimizeImage(node.properties.src)
    ) {
      images.push(node);
    }
  });

  for (const node of images) {
    if (typeof node.properties.src === 'string') {
      const resolved = await ctx.pluginContext.resolve(
        node.properties.src,
        ctx.filePath
      );

      if (resolved?.id && fs.existsSync(new URL(resolved.id, 'file://'))) {
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
}
