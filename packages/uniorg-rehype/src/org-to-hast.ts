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

type Hast = Root['children'][number];

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
  ],
  useSections: false,
  footnotesSection: (footnotes) => [
    h(null, 'h1', {}, 'Footnotes:'),
    ...footnotes,
  ],
};

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

/**
 * Similar to `hast` but respects `hProperties`.
 */
function h(
  node: OrgNode | null,
  selector?: string,
  properties?: Properties,
  children?: string | Node | null | Array<string | Node | null>
): Element {
  // TODO: hProperties is not respected in text nodes.

  const element: Element =
    // @ts-expect-error does not match the expected overloads
    hast(selector, properties || {}, children || []);

  const hProperties = node?.data?.hProperties;
  if (hProperties) {
    element.properties = Object.assign({}, element.properties, hProperties);
  }

  return element;
}

type Ctx = {
  // Labels of footnotes as they occur in footnote-reference.
  footnotesOrder: Array<string | number>;
  // map of: label -> footnote div
  footnotes: Record<string, FootnoteDefinition | FootnoteReference>;
};

export function orgToHast(
  org: OrgData,
  opts: Partial<OrgToHastOptions> = {}
): Hast | Root | null {
  const options = { ...defaultOptions, ...opts };

  const ctx: Ctx = {
    footnotesOrder: [],
    footnotes: {},
  };

  return toHast(org);

  function toHast(node: OrgNode | null): Root | Hast | null;
  function toHast(node: (OrgNode | null)[]): (Hast | null)[];
  function toHast(
    node: OrgNode | null | (OrgNode | null)[]
  ): Hast | (Hast | null)[] | Root | null {
    if (Array.isArray(node)) {
      return (
        node
          .map((node) => toHast(node))
          .filter((x) => x !== null && x !== undefined)
          // toHast(section) returns an array, so without this flatMap
          // `children: toHast(org.children)` could return an array of
          // arrays which then fails to serialize by rehype-stringify.
          .flatMap((x) => (Array.isArray(x) ? x : [x]) as Hast[])
      );
    }

    const org = node as OrgNode;

    switch (org.type) {
      case 'org-data':
        const children = toHast(org.children);

        const footnotes = ctx.footnotesOrder
          .map((name, i) => {
            const def = ctx.footnotes[name];

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
                org,
                'div',
                { className: 'footdef', role: 'doc-footnote' },
                toHast(def.children)
              ),
            ]);
          })
          .filter((x) => x !== null) as Hast[];
        if (footnotes.length !== 0) {
          if (opts.useSections) {
            children.push(
              h(null, 'section', {}, options.footnotesSection(footnotes))
            );
          } else {
            children.push(...options.footnotesSection(footnotes));
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

        const children = toHast(org.children);
        return options.useSections
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
          todo ? { className: 'todo-headline' } : {},
          [todo, priority, ...toHast(org.children), tags].filter(
            (x) => x
          ) as Hast[]
        );
      }
      case 'statistics-cookie':
        return h(org, 'span', { className: 'statistics-cookie' }, org.value);
      case 'plain-list':
        if (org.listType === 'unordered') {
          return h(org, 'ul', {}, toHast(org.children));
        } else if (org.listType === 'ordered') {
          return h(org, 'ol', {}, toHast(org.children));
        } else {
          return h(org, 'dl', {}, toHast(org.children));
        }
      case 'list-item':
        if (org.children[0]?.type === 'list-item-tag') {
          return [
            h(org, 'dt', {}, toHast(org.children[0].children)),
            h(org, 'dd', {}, toHast(org.children.slice(1))),
          ];
        } else {
          return h(org, 'li', {}, toHast(org.children));
        }
      case 'quote-block':
        return h(org, 'blockquote', {}, toHast(org.children));
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
        return h(org, 'pre.verse', {}, toHast(org.children));
      case 'center-block':
        return h(org, 'div.center', {}, toHast(org.children));
      case 'comment-block':
        return null;
      case 'example-block':
        return h(org, 'div.exampe', {}, org.value);
      case 'export-block':
        if (org.backend === 'html') {
          // @ts-ignore raw is not defined
          return u('raw', org.value);
        }
        return null;
      case 'special-block':
        if (html5Elements.has(org.blockType)) {
          return h(org, org.blockType, {}, toHast(org.children));
        }

        return h(
          org,
          'div',
          { className: ['special-block', `block-${org.blockType}`] },
          toHast(org.children)
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
          idx = ctx.footnotesOrder.length;
          ctx.footnotesOrder.push(idx);
          ctx.footnotes[idx] = org;
          id = `fnr.${idx + 1}`;
        } else if (org.footnoteType === 'standard') {
          idx = ctx.footnotesOrder.findIndex((label) => label === org.label);
          if (idx === -1) {
            idx = ctx.footnotesOrder.length;
            ctx.footnotesOrder.push(org.label);
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
        ctx.footnotes[org.label] = org;
        return null;
      case 'paragraph':
        return h(org, 'p', {}, toHast(org.children));
      case 'bold':
        return h(org, 'strong', {}, toHast(org.children));
      case 'italic':
        return h(org, 'em', {}, toHast(org.children));
      case 'superscript':
        return h(org, 'sup', {}, toHast(org.children));
      case 'subscript':
        return h(org, 'sub', {}, toHast(org.children));
      case 'code':
        return h(org, 'code.inline-code', {}, org.value);
      case 'verbatim':
        // org-mode renders verbatim as <code>
        return h(org, 'code.inline-verbatim', {}, org.value);
      case 'strike-through':
        return h(org, 'del', {}, toHast(org.children));
      case 'underline':
        return h(
          org,
          'span.underline',
          { style: 'text-decoration: underline;' },
          toHast(org.children)
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

        const imageRe = new RegExp(
          `\.(${options.imageFilenameExtensions.join('|')})$`
        );
        if (link.match(imageRe)) {
          // TODO: set alt
          return h(org, 'img', { src: link });
        }

        return h(
          org,
          'a',
          { href: link },
          org.children.length ? toHast(org.children) : org.rawLink
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
                        h(cell, 'th', {}, toHast(cell.children))
                      )
                    )
                  )
                )
              );
              hasHead = true;
            } else {
              table.children.push(h(org, 'tbody', {}, toHast(group)));
            }
            group = [];
          }

          group.push(r);
        });

        if (group.length) {
          table.children.push(h(org, 'tbody', {}, toHast(group)));
        }

        return table;
      }
      case 'table-row':
        if (org.rowType === 'standard') {
          return h(org, 'tr', {}, toHast(org.children));
        } else {
          return null;
        }
      case 'table-cell':
        return h(org, 'td', {}, toHast(org.children));
      default:
        // @ts-expect-error This should happen sometimes and its fine
        return org;
    }
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
