import type { Node } from 'unist';
import { stringify } from './stringify.js';
import type { StringifyOptions } from './stringify.js';

export function uniorgStringify(
  this: any,
  options: Partial<StringifyOptions> = {}
) {
  this.Compiler = (node: Node) => {
    return stringify(node, options);
  };
}
