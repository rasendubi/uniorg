import visit from 'unist-util-visit';
import { Plugin } from 'unified';
import { Node } from 'unist';
import { VFile } from 'vfile';
import GithubSlugger from 'github-slugger';

import { Headline } from 'uniorg';
import { toString } from 'orgast-util-to-string';

export interface Options {}

export const uniorgSlug: Plugin<[Options?]> = (options: Options = {}) => {
  return transformer;

  function transformer(tree: Node, _file: VFile) {
    const slugger = new GithubSlugger();

    visit(tree, 'headline', (node: Headline) => {
      const data: any = (node.data = node.data || {});
      const props = (data.hProperties = data.hProperties || {});

      if (!props.id) {
        const id = customId(node) ?? slugger.slug(toString(node.title));
        props.id = id;
      }
    });
  }
};

function customId(headline: Headline): string | null {
  const section = headline.children[0];
  const drawer: any = section?.children?.find(
    (node: any) => node.type === 'property-drawer'
  );
  const property = drawer?.children?.find(
    (node: any) => node.type === 'node-property' && node.key === 'CUSTOM_ID'
  );

  return property?.value;
}

export default uniorgSlug;
