import type { Node } from 'unist';

export interface Options {}

/**
 * Get the text content of a node.
 * Prefer the node’s plain-text fields, otherwise serialize its children,
 * and if the given value is an array, serialize the nodes in it.
 */
export function toString(node: Node | Node[], _options: Options = {}): string {
  return one(node);
}

function one(node: Node | Node[]): string {
  const n = node as any;

  if (!n) {
    return '';
  }

  if (Array.isArray(n)) {
    return all(n);
  }

  if (typeof n.value === 'string') {
    return n.value;
  }

  if ('children' in n) {
    return all(n.children as Node[]);
  }

  return '';
}

function all(values: Node[]): string {
  return values.map(one).join('');
}

export default toString;
