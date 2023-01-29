import type { AstroIntegration } from 'astro';
import type { VFile } from 'vfile';
import orgPlugin, { OrgPluginOptions } from 'rollup-plugin-orgx';
import { extractKeywords } from 'uniorg-extract-keywords';
import { uniorgSlug } from 'uniorg-slug';
import { visitIds } from 'orgast-util-visit-ids';

import { rehypeExportFrontmatter } from './plugin/rehype-export-frontmatter.js';

export type Options = OrgPluginOptions;

export default function org(options: OrgPluginOptions = {}): AstroIntegration {
  return {
    name: 'astro-org',
    hooks: {
      'astro:config:setup': async ({ updateConfig }) => {
        updateConfig({
          vite: {
            plugins: [
              {
                enforce: 'pre',
                ...orgPlugin({
                  ...options,
                  uniorgPlugins: [
                    initFrontmatter,
                    [extractKeywords, { name: 'keywords' }],
                    keywordsToFrontmatter,
                    uniorgSlug,
                    saveIds,
                    ...(options.uniorgPlugins ?? []),
                  ],
                  rehypePlugins: [
                    ...(options.rehypePlugins ?? []),
                    rehypeExportFrontmatter,
                  ],
                  development: false,
                  jsxImportSource: 'astro',
                }),
              },
              {
                name: 'astro-org/postprocess',
                transform: (code: string, id: string) => {
                  if (!id.endsWith('.org')) {
                    return;
                  }

                  const fileId = id.split('?')[0];

                  code += `\nexport const file = ${JSON.stringify(fileId)};`;

                  return code;
                },
              },
            ],
          },
        });
      },
    },
  };
}

function initFrontmatter() {
  return transformer;

  function transformer(_tree: any, file: VFile) {
    if (!file.data.astro) {
      file.data.astro = { frontmatter: {} };
    }
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
