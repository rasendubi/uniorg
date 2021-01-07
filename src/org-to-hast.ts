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
      if (org.listType === 'unordered') {
        return h('ul', toHast(org.children));
      } else if (org.listType === 'ordered') {
        return h('ol', toHast(org.children));
      } else {
        return h('dl', toHast(org.children));
      }
    case 'item':
      if (org.tag !== null) {
        return [h('dt', org.tag), h('dd', toHast(org.children))];
      } else {
        return h('li', toHast(org.children));
      }
    case 'quote-block':
      return h('blockquote', toHast(org.children));
    case 'src-block':
      return h('pre', h('code', removeCommonIndent(org.value)));
    case 'special-block':
      return h('div', toHast(org.children));
    case 'keyword':
      return null;
    case 'paragraph':
      return h('p', toHast(org.children));
    case 'bold':
      return h('strong', toHast(org.children));
    case 'italic':
      return h('em', toHast(org.children));
    case 'code':
      return h('code', { className: 'inline-code' }, org.value);
    case 'verbatim':
      // org-mode renders verbatim as <code>
      return h('code', { className: 'inline-verbatim' }, org.value);
    case 'strike-through':
      return h('del', toHast(org.children));
    case 'underline':
      return h(
        'span',
        { style: 'text-decoration: underline;' },
        toHast(org.children)
      );
    case 'text':
      return org.value;
    case 'link':
      return h(
        'a',
        { href: org.rawLink },
        org.children.length ? toHast(org.children) : org.rawLink
      );
    default:
      return org;
  }
}

const removeCommonIndent = (s: string) => {
  const lines = s.split(/\n/g);
  const minIndent = Math.min(
    ...lines.map((l) => l.match(/\S/)?.index ?? Infinity)
  );
  const indent = minIndent === Infinity ? 0 : minIndent;
  return lines.map((l) => l.substring(indent)).join('\n');
};
