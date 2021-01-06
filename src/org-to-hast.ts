import h from 'hastscript';
import { OrgNode, OrgData } from './types';

type Hast = any;

export function orgToHast(org: OrgData): Hast {
  return toHast(org);
}

function toHast(node: any): Hast {
  if (Array.isArray(node)) {
    return node.map(toHast).filter((x) => x !== null && x !== undefined);
  }

  const org = node as OrgNode;

  switch (org.type) {
    case 'org-data':
      return h('div', toHast(org.children));
    case 'headline':
      return [h(`h${org.level}`, toHast(org.title)), ...toHast(org.children)];
    case 'section':
      return toHast(org.children);
    case 'plain-list':
      return h('ul', toHast(org.children));
    case 'item':
      return h('li', toHast(org.children));
    case 'quote-block':
      return h('blockquote', toHast(org.children));
    case 'special-block':
      return h('div', toHast(org.children));
    case 'keyword':
      return null;
    case 'paragraph':
      return h('p', toHast(org.children));
    case 'text':
      return org.value;
    case 'link':
      return h(
        'a',
        { href: org.rawLink },
        org.children.length ? toHast(org.children) : org.rawLink
      );
  }
}
