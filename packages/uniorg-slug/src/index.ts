import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Node } from 'unist';
import GithubSlugger from 'github-slugger';

import { Headline, Section } from 'uniorg';
import { toString } from 'orgast-util-to-string';

export interface Options {}

export const uniorgSlug: Plugin<[Options?]> = (options: Options = {}) => {
  return transformer;

  function transformer(tree: Node, _file: unknown) {
    const slugger = new GithubSlugger();

    visit(tree, 'section', (section: Section) => {
      const headline = section.children[0] as Headline;
      const data: any = (headline.data = headline.data || {});
      const props = (data.hProperties = data.hProperties || {});

      if (!props.id) {
        const id = customId(section) ?? slugger.slug(toString(headline));
        props.id = id;
      }
    });
  }
};

function customId(section: Section): string | null {
  const drawer: any = section.children.find(
    (node: any) => node.type === 'property-drawer'
  );
  const property = drawer?.children?.find(
    (node: any) => node.type === 'node-property' && node.key === 'CUSTOM_ID'
  );

  return property?.value;
}

export default uniorgSlug;
