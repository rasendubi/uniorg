import { stringify } from './stringify.js';
import type { StringifyOptions } from './stringify.js';
import type { OrgData } from 'uniorg';
import type { Plugin } from 'unified';
import { Node } from 'unist';

export const uniorgStringify: Plugin<[Partial<StringifyOptions>?], OrgData, string> = function (
  options: Partial<StringifyOptions> = {}
): void {
  this.compiler = (tree): string => {
    if (!isOrgData(tree)) {
      throw new Error('Expected an OrgData node, but received an incompatible node type');
    }
    return stringify(tree, options);
  };
}

function isOrgData(node: Node | undefined): node is OrgData {
  return Boolean(
    node && 
    'type' in node && 
    node.type === 'org-data'
  );
}