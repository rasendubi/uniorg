import { Literal, Node } from 'unist';
import { convert } from 'unist-util-is';
import { GreaterElement, Text } from 'uniorg';

export interface Options {}

/**
 * Get the text content of a node.
 * Prefer the node’s plain-text fields, otherwise serialize its children,
 * and if the given value is an array, serialize the nodes in it.
 */
export function toString(node: Node | Node[], _options: Options = {}): string {
  return one(node);
}

const isText = (node: any): node is Literal => typeof node.value === 'string';

const hasChildren = (node: any): node is GreaterElement =>
  node.hasOwnProperty('children');

function one(node: Node | Node[]): string {
  if (!node) {
    return '';
  }

  if (Array.isArray(node)) {
    return all(node);
  }

  if (isText(node) && typeof node.value === 'string') {
    return node.value;
  }

  if (hasChildren(node)) {
    return all(node.children as Node[]);
  }

  return '';
}

function all(values: Node[]): string {
  return values.map(one).join('');
}

export default toString;
