import visit from 'unist-util-visit';

import { Keyword } from 'uniorg';
import { Plugin } from 'unified';
import { Node } from 'unist';
import { VFile } from 'vfile';

export interface Options {
  /**
   * If `name` is specified, keywords are exported under
   * `data[options.name][keyword]` instead of `data[keyword]`.
   */
  name?: string;

  /**
   * If `preserveCase` is specified and is `true`, keyword keys are
   * not lowercased.
   */
  preserveCase?: boolean;
}

const extractKeywords: Plugin<[Options?]> = (options: Options = {}) => {
  return transformer;

  function transformer(tree: Node, file: VFile) {
    visit(tree, 'keyword', (kw: Keyword) => {
      let data: any = (file.data = file.data || {});
      if (options.name) {
        data = data[options.name] = data[options.name] || {};
      }

      let key = kw.key;
      if (!options.preserveCase) {
        key = key.toLowerCase();
      }

      data[key] = kw.value;
    });
  }
};

export default extractKeywords;
