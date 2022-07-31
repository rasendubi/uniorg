import type {
  AffiliatedKeywords,
  OrgNode,
  WithAffiliatedKeywords,
} from 'uniorg';
import type { Node } from 'unist';

export function stringify(org: string | Node | Node[]): string {
  const result = Array.isArray(org)
    ? org.map(stringify).join('')
    : stringifyOne(org);
  return result;
}

function stringifyOne(node: Node | string): string {
  if (typeof node === 'string') {
    return node;
  }

  const org = node as OrgNode & Partial<WithAffiliatedKeywords>;

  const result: string[] = [];

  if (org.affiliated) {
    result.push(stringifyAffiliated(org.affiliated as AffiliatedKeywords));
  }

  result.push(stringifyNode(org));

  return result.join('');
}

function stringifyNode(org: OrgNode): string {
  switch (org.type) {
    case 'org-data':
      return withNewline(stringify(org.children));
    case 'section':
      return withNewline(stringify(org.children));
    case 'headline': {
      const components = [
        '*'.repeat(org.level),
        org.todoKeyword,
        org.priority ? `[#${org.priority}]` : null,
        org.commented ? 'COMMENT' : null,
        stringify(org.children),
        org.tags.length ? `:${org.tags.join(':')}:` : null,
      ].filter((x) => x !== null);
      return withNewline(components.join(' '));
    }
    case 'statistics-cookie':
      return [org.value, ' '.repeat(org.postBlank)].join('');
    case 'planning':
      return withNewline(
        [
          org.closed ? `CLOSED: ${stringify(org.closed)}` : null,
          org.scheduled ? `SCHEDULED: ${stringify(org.scheduled)}` : null,
          org.deadline ? `DEADLINE: ${stringify(org.deadline)}` : null,
        ]
          .filter((x) => x !== null)
          .join(' ')
      );
    case 'property-drawer':
      return withNewline(
        [':PROPERTIES:\n', ...org.children.map(stringify), ':END:'].join('')
      );
    case 'node-property':
      return withNewline([':', org.key, ': ', org.value].join(''));
    case 'drawer':
      return [
        ':',
        org.name,
        ':\n',
        withNewline(stringify(org.children)),
        ':END:\n',
      ].join('');
    case 'keyword':
      return withNewline(`#+${org.key}: ${org.value}`);
    case 'plain-list':
      return withNewline(stringify(org.children));
    case 'list-item':
      return withNewline(
        [
          ' '.repeat(org.indent),
          org.bullet,
          org.counter,
          org.checkbox === 'on'
            ? '[X]'
            : org.checkbox === 'off'
            ? '[ ]'
            : org.checkbox === 'trans'
            ? '[-]'
            : null,
          indent(
            stringify(org.children),
            org.indent + org.bullet.length
          ).trimStart(),
        ]
          .filter((x) => x !== null)
          .join('')
      );
    case 'list-item-tag':
      return `${stringify(org.children[0])} :: ${stringify(
        org.children.slice(1)
      )}`;
    case 'table':
      const value =
        org.tableType === 'table.el' ? org.value : stringify(org.children);
      return (
        withNewline(value) + (org.tblfm ? '#+TBLFM: ' + org.tblfm + '\n' : '')
      );
    case 'table-row':
      if (org.rowType === 'standard') {
        return '| ' + org.children.map(stringify).join(' | ') + ' |\n';
      } else {
        return '|-|\n';
      }
    case 'table-cell':
      return stringify(org.children);
    case 'comment':
      return withNewline(
        org.value
          .split(/\n/)
          .map((s) => '# ' + s)
          .join('\n')
      );
    case 'fixed-width':
      return withNewline(
        org.value
          .split(/\n/)
          .map((s) => ': ' + s)
          .join('\n')
      );
    case 'clock':
      return withNewline(
        [
          'CLOCK: ',
          org.value ? stringify(org.value) : null,
          org.duration ? ' =>  ' + org.duration : null,
        ]
          .filter((x) => x !== null)
          .join('')
      );
    case 'latex-environment':
      return withNewline(org.value);
    case 'horizontal-rule':
      return withNewline('-----');
    case 'footnote-definition':
      return withNewline(`[fn:${org.label}] ${stringify(org.children)}`);
    case 'footnote-reference':
      return [
        '[fn:',
        org.label,
        org.footnoteType === 'inline' ? ':' + stringify(org.children) : null,
        ']',
      ]
        .filter((x) => x !== null)
        .join('');
    case 'diary-sexp':
      return withNewline(org.value);
    case 'src-block':
      return [
        '#+begin_src',
        org.language ? ' ' + org.language : null,
        '\n',
        withNewline(escapeCodeInString(org.value)),
        '#+end_src\n',
      ]
        .filter((x) => x !== null)
        .join('');
    case 'quote-block':
      return [
        '#+begin_quote\n',
        withNewline(stringify(org.children)),
        '#+end_quote\n',
      ]
        .filter((x) => x !== null)
        .join('');
    case 'verse-block':
      return [
        '#+begin_verse\n',
        withNewline(stringify(org.children)),
        '#+end_verse\n',
      ]
        .filter((x) => x !== null)
        .join('');
    case 'center-block':
      return [
        '#+begin_center\n',
        withNewline(stringify(org.children)),
        '#+end_center\n',
      ]
        .filter((x) => x !== null)
        .join('');
    case 'comment-block':
      return ['#+begin_comment\n', withNewline(org.value), '#+end_comment\n']
        .filter((x) => x !== null)
        .join('');
    case 'example-block':
      return ['#+begin_example\n', withNewline(org.value), '#+end_example\n']
        .filter((x) => x !== null)
        .join('');
    case 'export-block':
      return [
        '#+begin_export',
        org.backend ? ' ' + org.backend : null,
        '\n',
        withNewline(org.value),
        '#+end_export\n',
      ]
        .filter((x) => x !== null)
        .join('');
    case 'special-block':
      return [
        '#+begin_',
        org.blockType,
        '\n',
        withNewline(stringify(org.children)),
        '#+end_',
        org.blockType,
        '\n',
      ]
        .filter((x) => x !== null)
        .join('');
    case 'paragraph':
      return (
        withNewline(stringify(org.children)) +
        // an extra newline to separate from the possible following paragraph
        '\n'
      );
    case 'link':
      return org.format === 'plain'
        ? org.rawLink
        : org.format === 'bracket'
        ? `[[${org.rawLink}]${
            org.children.length ? '[' + stringify(org.children) + ']' : ''
          }]`
        : `<${org.rawLink}>`;
    case 'superscript':
      return `^{${stringify(org.children)}}`;
    case 'subscript':
      return `_{${stringify(org.children)}}`;
    case 'bold':
      return `*${stringify(org.children)}*`;
    case 'italic':
      return `/${stringify(org.children)}/`;
    case 'strike-through':
      return `+${stringify(org.children)}+`;
    case 'underline':
      return `_${stringify(org.children)}_`;
    case 'code':
      return `~${org.value}~`;
    case 'verbatim':
      return `=${org.value}=`;
    case 'latex-fragment':
      return org.value;
    case 'timestamp':
      return org.rawValue;
    case 'entity':
      return '\\' + org.name;
    case 'text':
      return org.value;
    default:
      return '';
  }
}

function stringifyAffiliated(keywords: AffiliatedKeywords): string {
  return Object.entries(keywords)
    .map(([key, values]) => {
      const dualKeyword = Array.isArray(values) ? values[1] : null;
      const value = Array.isArray(values) ? values[0] : values;
      return [
        '#+',
        key,
        // TODO: "as any" here is incorrect
        dualKeyword ? `[${stringify(dualKeyword as any)}]` : null,
        ': ',
        // TODO: "as any" here is incorrect
        stringify(value as any).trimEnd(),
        '\n',
      ].join('');
    })
    .join('');
}

function withNewline(s: string): string {
  return s.trimEnd() + '\n';
}

function indent(s: string, level: number): string {
  // strip at most `level` spaces
  const stripRe = new RegExp(`^ {0,${level}}`);
  const indent = ' '.repeat(level);
  return s
    .split(/\n/)
    .map((line) => indent + line.replace(stripRe, ''))
    .join('\n');
}

function escapeCodeInString(value: string): string {
  return value.replace(/^([ \t]*)(,*)(\*|#\+)/gm, '$1,$2$3');
}
