import type {
  AffiliatedKeywords,
  OrgNode,
  WithAffiliatedKeywords,
} from 'uniorg';
import type { Node } from 'unist';

type Handler<T> = (org: T, options: Options) => string;

export type Handlers = {
  [K in OrgNode['type']]?: Handler<OrgNode & { type: K }>;
};

export type StringifyOptions = {
  handlers: Handlers
}

export type Options = Partial<StringifyOptions>

export function stringify(org: string | Node | Node[], options: Options = {}): string {
  const result = Array.isArray(org)
    ? org.map(o => stringify(o, options)).join('')
    : stringifyOne(org, options);
  return result;
}

function stringifyOne(node: Node | string, options: Options): string {
  if (typeof node === 'string') {
    return node;
  }

  const org = node as OrgNode & Partial<WithAffiliatedKeywords>;

  const result: string[] = [];

  if (org.affiliated) {
    result.push(stringifyAffiliated(org.affiliated as AffiliatedKeywords, options));
  }

  result.push(stringifyNode(org, options));

  return result.join('');
}

function stringifyNode(org: OrgNode, options: Options): string {
  const handler = options.handlers?.[org.type];
  if (handler) {
    const rendered = (handler as any)(org, options);
    if (rendered) return rendered;
  }

  switch (org.type) {
    case 'org-data':
      return withNewline(stringify(org.children, options));
    case 'section':
      return withNewline(stringify(org.children, options));
    case 'headline': {
      const components = [
        '*'.repeat(org.level),
        org.todoKeyword,
        org.priority ? `[#${org.priority}]` : null,
        org.commented ? 'COMMENT' : null,
        stringify(org.children, options),
        org.tags.length ? `:${org.tags.join(':')}:` : null,
      ].filter((x) => x !== null);
      return withNewline(components.join(' '));
    }
    case 'statistics-cookie':
      return [org.value, ' '.repeat(org.postBlank)].join('');
    case 'planning':
      return withNewline(
        [
          org.closed ? `CLOSED: ${stringify(org.closed, options)}` : null,
          org.scheduled ? `SCHEDULED: ${stringify(org.scheduled, options)}` : null,
          org.deadline ? `DEADLINE: ${stringify(org.deadline, options)}` : null,
        ]
          .filter((x) => x !== null)
          .join(' ')
      );
    case 'property-drawer':
      return withNewline(
        [':PROPERTIES:\n', ...org.children.map(c => stringify(c, options)), ':END:'].join('')
      );
    case 'node-property':
      return withNewline([':', org.key, ': ', org.value].join(''));
    case 'drawer':
      return [
        ':',
        org.name,
        ':\n',
        withNewline(stringify(org.children, options)),
        ':END:\n',
      ].join('');
    case 'keyword':
      return withNewline(`#+${org.key}: ${org.value}`);
    case 'plain-list':
      return withNewline(stringify(org.children, options));
    case 'list-item':
      return withNewline(
        [
          ' '.repeat(org.indent),
          org.bullet,
          org.counter,
          org.checkbox === 'on'
            ? '[X] '
            : org.checkbox === 'off'
              ? '[ ] '
              : org.checkbox === 'trans'
                ? '[-] '
                : null,
          indent(
            stringify(org.children, options),
            org.indent + org.bullet.length
          ).trimStart(),
        ]
          .filter((x) => x !== null)
          .join('')
      );
    case 'list-item-tag':
      return `${stringify(org.children[0], options)} :: ${stringify(
        org.children.slice(1), options
      )}`;
    case 'table':
      const value =
        org.tableType === 'table.el' ? org.value : stringify(org.children, options);
      return (
        withNewline(value) + (org.tblfm ? '#+TBLFM: ' + org.tblfm + '\n' : '')
      );
    case 'table-row':
      if (org.rowType === 'standard') {
        return '| ' + org.children.map(c => stringify(c, options)).join(' | ') + ' |\n';
      } else {
        return '|-|\n';
      }
    case 'table-cell':
      return stringify(org.children, options);
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
          org.value ? stringify(org.value, options) : null,
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
      return withNewline(`[fn:${org.label}] ${stringify(org.children, options)}`);
    case 'footnote-reference':
      return [
        '[fn:',
        org.label,
        org.footnoteType === 'inline' ? ':' + stringify(org.children, options) : null,
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
        withNewline(stringify(org.children, options)),
        '#+end_quote\n',
      ]
        .filter((x) => x !== null)
        .join('');
    case 'verse-block':
      return [
        '#+begin_verse\n',
        withNewline(stringify(org.children, options)),
        '#+end_verse\n',
      ]
        .filter((x) => x !== null)
        .join('');
    case 'center-block':
      return [
        '#+begin_center\n',
        withNewline(stringify(org.children, options)),
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
        withNewline(stringify(org.children, options)),
        '#+end_',
        org.blockType,
        '\n',
      ]
        .filter((x) => x !== null)
        .join('');
    case 'paragraph':
      return (
        withNewline(stringify(org.children, options)) +
        // an extra newline to separate from the possible following paragraph
        '\n'
      );

    case 'citation':
      return [
        '[cite',
        org.style ? '/' + org.style : '',
        ':',
        ...org.children.map(c => stringifyNode(c, options)).join(';'),
        ']',
      ].join('');
    case 'citation-common-prefix':
    case 'citation-common-suffix':
    case 'citation-reference':
    case 'citation-prefix':
    case 'citation-suffix':
      return org.children.map(c => stringifyNode(c, options)).join('');
    case 'citation-key':
      return '@' + org.key;

    case 'link':
      return org.format === 'plain'
        ? org.rawLink
        : org.format === 'bracket'
          ? `[[${org.rawLink}]${
              org.children.length ? '[' + stringify(org.children, options) + ']' : ''
            }]`
          : `<${org.rawLink}>`;
    case 'superscript':
      return `^{${stringify(org.children, options)}}`;
    case 'subscript':
      return `_{${stringify(org.children, options)}}`;
    case 'bold':
      return `*${stringify(org.children, options)}*`;
    case 'italic':
      return `/${stringify(org.children, options)}/`;
    case 'strike-through':
      return `+${stringify(org.children, options)}+`;
    case 'underline':
      return `_${stringify(org.children, options)}_`;
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

function stringifyAffiliated(keywords: AffiliatedKeywords, options: Options): string {
  return Object.entries(keywords)
    .map(([key, values]) => {
      const dualKeyword = Array.isArray(values) ? values[1] : null;
      const value = Array.isArray(values) ? values[0] : values;
      return [
        '#+',
        key,
        // TODO: "as any" here is incorrect
        dualKeyword ? `[${stringify(dualKeyword as any, options)}]` : null,
        ': ',
        // TODO: "as any" here is incorrect
        stringify(value as any, options).trimEnd(),
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
