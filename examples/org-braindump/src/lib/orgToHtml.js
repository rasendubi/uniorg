import { unified } from 'unified';

import orgParse from 'uniorg-parse';
import org2rehype from 'uniorg-rehype';
import extractKeywords from 'uniorg-extract-keywords';
import { uniorgSlug } from 'uniorg-slug';
import { visitIds } from 'orgast-util-visit-ids';

const processor = unified()
  .use(orgParse)
  .use(extractKeywords)
  .use(uniorgSlug)
  .use(extractIds)
  .use(org2rehype)
  .use(toJson);

export default async function orgToHtml(file) {
  try {
    return await processor.process(file);
  } catch (e) {
    console.error('failed to process file', file.path, e);
    throw e;
  }
}

function extractIds() {
  return transformer;

  function transformer(tree, file) {
    const data = file.data || (file.data = {});
    // ids is a map: id => #anchor
    const ids = data.ids || (data.ids = {});

    visitIds(tree, (id, node) => {
      if (node.type === 'org-data') {
        ids[id] = '';
      } else if (node.type === 'section') {
        const headline = node.children[0];
        if (!headline.data?.hProperties?.id) {
          // The headline doesn't have an html id assigned. (Did you
          // remove uniorg-slug?)
          //
          // Assign an html id property based on org id property.
          headline.data = headline.data || {};
          headline.data.hProperties = headline.data.hProperties || {};
          headline.data.hProperties.id = id;
        }

        ids[id] = '#' + headline.data.hProperties.id;
      }
    });
  }
}

/** A primitive compiler to return node as is without stringifying. */
function toJson() {
  this.Compiler = (node) => {
    return node;
  };
}
