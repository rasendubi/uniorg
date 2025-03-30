import { u } from 'unist-builder';
import { h as hast } from 'hastscript';
import type { Properties, Node, Element, Root, Text } from 'hast';
import type {
  OrgNode,
  OrgData,
  TableRow,
  Headline,
  FootnoteReference,
  FootnoteDefinition,
} from 'uniorg';

declare module 'unist' {
  interface Data {
    hProperties?: Properties;
  }
}

type Hast = Root['children'][number];

type Handler<T> = (this: OrgToHast, org: T) => Hast | null | (Hast | null)[];

export type Handlers = {
  [K in OrgNode['type']]?: Handler<OrgNode & { type: K }>;
};

export interface OrgToHastOptions {
  imageFilenameExtensions: string[];
  /**
   * Whether to wrap org sections into <section>.
   */
  useSections: boolean;
  /**
   * A function to wrap footnotes. First argument of the function is
   * an array of all footnote definitions and the function should
   * return a new Hast node to be appended to the document.
   *
   * Roughly corresponds to `org-html-footnotes-section`.
   *
   * Default is:
   * ```
   * <h1>Footnotes:</h1>
   * {...footnotes}
   * ```
   */
  footnotesSection: (footnotes: Hast[]) => Hast[];

  handlers: Handlers;
}

const defaultOptions: OrgToHastOptions = {
  imageFilenameExtensions: [
    'png',
    'jpeg',
    'jpg',
    'gif',
    'tiff',
    'tif',
    'xbm',
    'xpm',
    'pbm',
    'pgm',
    'ppm',
    'pnm',
    'svg',
    'webp',
    'avif',
  ],
  useSections: false,
  footnotesSection: (footnotes) => [hast('h1', {}, 'Footnotes:'), ...footnotes],
  handlers: {},
};

const defaultHandlers: Handlers = {
  citation: renderAsChildren,
  'citation-common-prefix': renderAsChildren,
  'citation-common-suffix': renderAsChildren,
  'citation-reference': renderAsChildren,
  'citation-prefix': renderAsChildren,
  'citation-suffix': renderAsChildren,
  'citation-key': function (org) {
    return this.h(org, 'a', { href: 'cite:' + org.key }, ['cite:' + org.key]);
  },

  'export-snippet': function (org) {
    if (org.backEnd !== 'html') return null;
    return u('raw', org.value) as any;
  },
  'line-break': function (org) {
    return this.h(org, 'br');
  },
};

function renderAsChildren(
  this: OrgToHast,
  org: OrgNode & { children: OrgNode[] }
) {
  return this.toHast(org.children, org);
}

// `org-html-html5-elements`
const html5Elements = new Set([
  'article',
  'aside',
  'audio',
  'canvas',
  'details',
  'figcaption',
  'figure',
  'footer',
  'header',
  'menu',
  'meter',
  'nav',
  'output',
  'progress',
  'section',
  'summary',
  'video',
]);

export function orgToHast(
  org: OrgData,
  opts: Partial<OrgToHastOptions> = {}
): Hast | Root | null {
  return new OrgToHast(opts).toHast(org, null);
}

class OrgToHast {
  private options: OrgToHastOptions;
  // Labels of footnotes as they occur in footnote-reference.
  private footnotesOrder: Array<string | number> = [];
  // map of: label -> footnote div
  private footnotes: Record<string, FootnoteDefinition | FootnoteReference> =
    {};

  private handlers: Handlers;

  constructor(options: Partial<OrgToHastOptions>) {
    this.options = { ...defaultOptions, ...options };
    this.handlers = { ...defaultHandlers, ...this.options.handlers };
  }

  toHast(node: OrgNode | null, parent: OrgNode | null): Root | Hast | null;
  toHast(node: (OrgNode | null)[], parent: OrgNode | null): (Hast | null)[];
  toHast(
    node: OrgNode | null | (OrgNode | null)[],
    parent: OrgNode | null
  ): Hast | (Hast | null)[] | Root | null {
    const h = this.h.bind(this);
    const toHast = this.toHast.bind(this);

    if (Array.isArray(node)) {
      return (
        node
          .map((node) => toHast(node, parent))
          .filter((x) => x !== null && x !== undefined)
          // toHast(section) returns an array, so without this flatMap
          // `children: toHast(org.children)` could return an array of
          // arrays which then fails to serialize by rehype-stringify.
          .flatMap((x) => (Array.isArray(x) ? x : [x]) as Hast[])
      );
    }

    const org = node as OrgNode;

    const handler = this.handlers[org.type];
    if (handler) {
      const rendered = (handler as any).call(this, org as any);
      if (rendered) return rendered;
    }

    switch (org.type) {
      case 'org-data':
        const children = toHast(org.children, org);

        const footnotes = this.footnotesOrder
          .map((name, i) => {
            const def = this.footnotes[name];

            if (!def) {
              // missing footnote definition
              return null;
            }

            return h(org, 'div', { className: 'footnote-definition' }, [
              h(
                null,
                'sup',
                {},
                h(
                  null,
                  'a',
                  {
                    className: 'footnum',
                    id: `fn.${i + 1}`,
                    href: `#fnr.${i + 1}`,
                    role: 'doc-backlink',
                  },
                  String(i + 1)
                )
              ),
              h(
                def,
                'div',
                { className: 'footdef', role: 'doc-footnote' },
                toHast(def.children, def)
              ),
            ]);
          })
          .filter((x) => x !== null) as Hast[];
        if (footnotes.length !== 0) {
          if (this.options.useSections) {
            children.push(
              h(null, 'section', {}, this.options.footnotesSection(footnotes))
            );
          } else {
            children.push(...this.options.footnotesSection(footnotes));
          }
        }

        return { type: 'root', children } as Root;
      case 'section': {
        const headline = org.children[0] as Headline;
        // TODO: support other options that prevent export:
        // - org-export-exclude-tags
        // - #+EXCLUDE_TAGS:
        // TODO: support selective export mode:
        // - org-export-selected-tags
        // - #+SELECTED_TAGS:
        if (headline.commented || headline.tags.includes('noexport')) {
          return null;
        }

        const children = toHast(org.children, org);
        return this.options.useSections
          ? h(
              org,
              'section',
              { class: `section-level-${headline.level}` },
              children
            )
          : children;
      }
      case 'headline': {
        const intersperse = <T extends unknown>(items: T[], sep: T) =>
          items.flatMap((e) => [sep, e]).slice(1);

        const todo = org.todoKeyword
          ? [
              h(
                org,
                'span',
                { className: ['todo-keyword', org.todoKeyword] },
                org.todoKeyword
              ),
              ' ',
            ]
          : null;
        const priority = org.priority
          ? [
              h(
                org,
                'span',
                { className: ['priority', `priority-${org.priority}`] },
                `[${org.priority}]`
              ),
              ' ',
            ]
          : null;
        const tags = org.tags.length
          ? [
              u('text', { value: '\xa0\xa0\xa0' }) as Text,
              h(
                org,
                'span.tags',
                {},
                intersperse(
                  org.tags.map(
                    (x) =>
                      h(org, 'span.tag', { className: `tag-${x}` }, x) as any
                  ),
                  '\xa0'
                )
              ),
            ]
          : null;
        return h(
          org,
          `h${org.level}`,
          {},
          [todo, priority, ...toHast(org.children, org), tags].filter(
            (x) => x
          ) as Hast[]
        );
      }
      case 'statistics-cookie':
        return h(org, 'span', { className: 'statistics-cookie' }, org.value);
      case 'plain-list':
        if (org.listType === 'unordered') {
          return h(org, 'ul', {}, toHast(org.children, org));
        } else if (org.listType === 'ordered') {
          return h(org, 'ol', {}, toHast(org.children, org));
        } else {
          return h(org, 'dl', {}, toHast(org.children, org));
        }
      case 'list-item':
        if (org.children[0]?.type === 'list-item-tag') {
          return [
            h(org, 'dt', {}, toHast(org.children[0].children, org.children[0])),
            h(org, 'dd', {}, toHast(org.children.slice(1), org)),
          ];
        } else {
          return h(org, 'li', {}, toHast(org.children, org));
        }
      case 'quote-block':
        return h(org, 'blockquote', {}, toHast(org.children, org));
      case 'src-block':
        return h(
          org,
          'pre.src-block',
          {},
          h(
            org,
            'code',
            {
              className: org.language ? `language-${org.language}` : undefined,
            },
            removeCommonIndent(org.value)
          )
        );
      case 'verse-block':
        // org-html exports verse-block as <p>. However, <p> might not
        // survive minification (and does not if you use
        // rehype-preset-minify), which drops all spaces and
        // indentation. Serialize verse-block as <pre>, so whitespace
        // is correctly preserved.
        return h(org, 'pre.verse', {}, toHast(org.children, org));
      case 'center-block':
        return h(org, 'div.center', {}, toHast(org.children, org));
      case 'comment-block':
        return null;
      case 'example-block':
        return h(org, 'div.example', {}, org.value);
      case 'export-block':
        if (org.backend === 'html') {
          // @ts-ignore raw is not defined
          return u('raw', org.value);
        }
        return null;
      case 'special-block':
        if (html5Elements.has(org.blockType)) {
          return h(org, org.blockType, {}, toHast(org.children, org));
        }

        return h(
          org,
          'div',
          { className: ['special-block', `block-${org.blockType}`] },
          toHast(org.children, org)
        );
      case 'keyword':
        if (org.key === 'HTML') {
          // @ts-ignore raw is not defined
          return u('raw', org.value);
        }
        return null;
      case 'horizontal-rule':
        return h(org, 'hr', {});
      case 'diary-sexp':
        return null;
      case 'footnote-reference':
        // index of footnote in ctx.footnotesOrder
        let idx = 0;
        let id = '';
        if (org.footnoteType === 'inline') {
          idx = this.footnotesOrder.length;
          this.footnotesOrder.push(idx);
          this.footnotes[idx] = org;
          id = `fnr.${idx + 1}`;
        } else if (org.footnoteType === 'standard') {
          idx = this.footnotesOrder.findIndex((label) => label === org.label);
          if (idx === -1) {
            idx = this.footnotesOrder.length;
            this.footnotesOrder.push(org.label);
            id = `fnr.${idx + 1}`;
            // We do not set id in the else branch because that’s a
            // second reference to this footnote—another reference
            // with this id exists.
          }
        } else {
          throw new Error(`unknown footnoteType: ${org.footnoteType}`);
        }

        return h(
          null,
          'sup',
          {},
          h(
            org,
            'a',
            {
              href: `#fn.${idx + 1}`,
              className: ['footref'],
              id,
              role: 'doc-backlink',
            },
            String(idx + 1)
          )
        );
      case 'footnote-definition':
        this.footnotes[org.label] = org;
        return null;
      case 'paragraph':
        // Implement ox-html behavior for lists: strip paragraph tag
        // if it's inside a list item and is either:
        // 1. The only child of the list item, or
        // 2. Followed by a list
        if (
          parent?.type === 'list-item' &&
          parent.children[0]?.type !== 'list-item-tag' &&
          (parent.children.length === 1 ||
            (parent.children.length === 2 &&
              parent.children[0] === org &&
              parent.children[1].type === 'plain-list'))
        ) {
          return toHast(org.children, org);
        }
        return h(org, 'p', {}, toHast(org.children, org));
      case 'bold':
        return h(org, 'strong', {}, toHast(org.children, org));
      case 'italic':
        return h(org, 'em', {}, toHast(org.children, org));
      case 'superscript':
        return h(org, 'sup', {}, toHast(org.children, org));
      case 'subscript':
        return h(org, 'sub', {}, toHast(org.children, org));
      case 'code':
        return h(org, 'code.inline-code', {}, org.value);
      case 'verbatim':
        // org-mode renders verbatim as <code>
        return h(org, 'code.inline-verbatim', {}, org.value);
      case 'strike-through':
        return h(org, 'del', {}, toHast(org.children, org));
      case 'underline':
        return h(
          org,
          'span.underline',
          { style: 'text-decoration: underline;' },
          toHast(org.children, org)
        );
      case 'text':
        return u('text', org.value);
      case 'link': {
        let link = org.rawLink;
        // This is where uniorg differs from org-mode. org-html-export
        // does not url-encode file path, which leads to broken links
        // if file contains "%".
        if (org.linkType === 'file') {
          link = encodeURI(link);
        }

        const isFirstLink =
          (parent as any)?.children.find(
            (org: OrgNode) => org.type === 'link'
          ) === org;
        // If link is the first image in a paragraph, extract
        // ATTR_HTML from paragraph. This is a hack because org does
        // not have a way to attach ATTR_HTML to image/link directly.
        const attrs = isFirstLink ? getAffiliatedAttrs(parent) : {};

        if (isImageLink(org, this.options)) {
          return h(org, 'img', { ...attrs, src: link });
        }

        return h(
          org,
          'a',
          { ...attrs, href: link },
          org.children.length ? toHast(org.children, org) : org.rawLink
        );
      }
      case 'timestamp':
        return h(org, 'span.timestamp', {}, org.rawValue);
      case 'planning':
        return null;
      case 'property-drawer':
        return null;
      case 'drawer':
        return null;
      case 'comment':
        return null;
      case 'fixed-width':
        return h(org, 'pre.fixed-width', {}, org.value);
      case 'clock':
        return null;
      case 'latex-environment':
        return h(org, 'div.math.math-display', {}, org.value);
      case 'latex-fragment':
        return h(org, 'span.math.math-inline', {}, org.contents.trim());
      case 'entity':
        // rehype does not allow html escapes, so we use utf8 value instead.
        return u('text', { value: org.utf8 });
      case 'table': {
        // table.el tables are not supported for export
        if (org.tableType === 'table.el') {
          return h(org, 'pre.table-el', {}, org.value);
        }

        // TODO: support column groups
        // see https://orgmode.org/manual/Column-Groups.html

        const table = h(org, 'table', {}, []);

        let hasHead = false;
        let group: TableRow[] = [];
        org.children.forEach((r) => {
          if (r.rowType === 'rule') {
            // rule finishes the group
            if (!hasHead) {
              table.children.push(
                h(
                  org,
                  'thead',
                  {},
                  group.map((row: TableRow) =>
                    h(
                      row,
                      'tr',
                      {},
                      row.children.map((cell) =>
                        h(cell, 'th', {}, toHast(cell.children, cell))
                      )
                    )
                  )
                )
              );
              hasHead = true;
            } else {
              table.children.push(h(org, 'tbody', {}, toHast(group, org)));
            }
            group = [];
          }

          group.push(r);
        });

        if (group.length) {
          table.children.push(h(org, 'tbody', {}, toHast(group, org)));
        }

        return table;
      }
      case 'table-row':
        if (org.rowType === 'standard') {
          return h(org, 'tr', {}, toHast(org.children, org));
        } else {
          return null;
        }
      case 'table-cell':
        return h(org, 'td', {}, toHast(org.children, org));
      default:
        // @ts-expect-error This should happen sometimes and its fine
        return org;
    }
  }

  /**
   * Similar to `hast` but respects `hProperties`.
   */
  h(
    node: OrgNode | null,
    selector?: string,
    properties?: Properties,
    children?: string | Node | null | Array<string | Node | null>
  ): Element {
    // TODO: hProperties is not respected in text nodes.

    const element: Element =
      // @ts-expect-error does not match the expected overloads
      hast(selector, properties || {}, children || []);

    const attrs =
      node?.type === 'paragraph' &&
      node.children.length === 1 &&
      isImageLink(node.children[0], this.options)
        ? // If image link is the only child in a paragraph, all attributes
          // are proxied to it.
          {}
        : getAffiliatedAttrs(node);

    const hProperties = node?.data?.hProperties ?? {};

    element.properties = Object.assign(
      {},
      element.properties,
      attrs,
      hProperties
    );

    return element;
  }
}

const getAffiliatedAttrs = (node: any) => {
  const attr_html: string[] =
    (node as any)?.affiliated?.ATTR_HTML?.flatMap((s: string) =>
      s
        .split(/(?:[ \t]+|^):(?<x>[-a-zA-Z0-9_]+(?=[ \t]|$))/u)
        // first element is before the first key
        .slice(1)
    ) ?? [];

  const attrs: Record<string, string> = {};
  for (let i = 0; i < attr_html.length; i += 2) {
    const key = attr_html[i];
    const value = attr_html[i + 1].trim();
    if (value) {
      attrs[key] = value;
    }
  }

  return attrs;
};

type Ctx = {
  // Labels of footnotes as they occur in footnote-reference.
  footnotesOrder: Array<string | number>;
  // map of: label -> footnote div
  footnotes: Record<string, FootnoteDefinition | FootnoteReference>;
};

const removeCommonIndent = (s: string) => {
  const lines = s.split(/\n/g);
  const minIndent = Math.min(
    ...lines.map((l) => l.match(/\S/)?.index ?? Infinity)
  );
  const indent = minIndent === Infinity ? 0 : minIndent;
  return lines.map((l) => l.substring(indent)).join('\n');
};

const isImageLink = (node: OrgNode, options: OrgToHastOptions) => {
  const imageRe = new RegExp(
    `\.(${options.imageFilenameExtensions.join('|')})$`,
    'i'
  );
  return (
    node.type === 'link' &&
    node.children.length === 0 &&
    node.rawLink.match(imageRe)
  );
};
