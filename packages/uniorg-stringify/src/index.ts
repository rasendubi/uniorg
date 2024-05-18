import type { Node } from 'unist';
import { stringify } from './stringify.js';
import type { Options } from './stringify.js';

export function uniorgStringify(this: any, options: Options = {}) {
  this.Compiler = (node: Node) => {
    return stringify(node, options);
  };
}
