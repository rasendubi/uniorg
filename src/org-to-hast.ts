import h from 'hastscript';
import { OrgNode, OrgData } from './types';

type Hast = any;

export function orgToHast(org: OrgData): Hast {
  return toHast(org);
}

function toHast(node: any): Hast {
  const org = node as OrgNode;

  switch (org.type) {
    case 'org-data':
      return h('div', org.children.map(toHast));
    case 'headline':
      return [
        h(`h${org.level}`, org.title.map(toHast)),
        ...org.children.map(toHast),
      ];
    case 'section':
      return org.children.map(toHast);
    case 'plain-list':
      return h('ul', org.children.map(toHast));
    case 'item':
      return h('li', org.children.map(toHast));
    case 'paragraph':
      return h('p', org.children.map(toHast));
    case 'text':
      return org.value;
    case 'link':
      return h(
        'a',
        { href: org.rawLink },
        org.children.length ? org.children.map(toHast) : org.rawLink
      );
  }
}
