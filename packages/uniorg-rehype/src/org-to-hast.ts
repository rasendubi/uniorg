import u from 'unist-builder';
import hast from 'hastscript';
import { Properties, Node, Element } from 'hast';
import { OrgNode, OrgData, TableRow, Headline } from 'uniorg';

type Hast = any;

export interface OrgToHastOptions {
  imageFilenameExtensions: string[];
  /**
   * Whether to wrap org sections into <section>.
   */
  useSections: boolean;
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
  children?: string | Node | Array<string | Node>
): Element {
  // TODO: hProperties is not respected in text nodes.

  const element = hast(selector, properties || {}, children || []);

  const hProperties = node?.data?.hProperties;
  if (hProperties) {
    element.properties = Object.assign({}, element.properties, hProperties);
  }

  return element;
}

export function orgToHast(
  org: OrgData,
  opts: Partial<OrgToHastOptions> = {}
): Hast {
  const options = { ...defaultOptions, ...opts };
  return toHast(org);

  function toHast(node: any): Hast {
    if (Array.isArray(node)) {
      return (
        node
          .map(toHast)
          .filter((x) => x !== null && x !== undefined)
          // toHast(section) returns an array, so without this flatMap
          // `children: toHast(org.children)` could return an array of
          // arrays which then fails to serialize by rehype-stringify.
          .flatMap((x) => (Array.isArray(x) ? x : [x]))
      );
    }

    const org = node as OrgNode;

    switch (org.type) {
      case 'org-data':
        return { type: 'root', children: toHast(org.children) };
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
              u('text', { value: '\xa0\xa0\xa0' }),
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
          [todo, priority, toHast(org.children), tags].filter((x) => x)
        );
      }
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
          return u('raw', org.value);
        }
        return null;
      case 'special-block':
        if (html5Elements.has(org.blockType)) {
          return h(org, org.blockType, toHast(org.children));
        }

        return h(
          org,
          'div',
          { className: ['special-block', `block-${org.blockType}`] },
          toHast(org.children)
        );
      case 'keyword':
        if (org.key === 'HTML') {
          return u('raw', org.value);
        }
        return null;
      case 'horizontal-rule':
        return h(org, 'hr', {});
      case 'diary-sexp':
        return null;
      case 'footnote-reference':
      case 'footnote-definition':
        // TODO: serialize footnotes and footnote definitions.
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
        return org.value;
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
        // TODO: support column groups
        // see https://orgmode.org/manual/Column-Groups.html

        const table = h(org, 'table', {}, []);

        let hasHead = false;
        let group: TableRow[] = [];
        (org.children as TableRow[]).forEach((r) => {
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
                        h(cell, 'th', toHast(cell.children))
                      )
                    )
                  )
                )
              );
              hasHead = true;
            } else {
              table.children.push(h(org, 'tbody', toHast(group)));
            }
            group = [];
          }

          group.push(r);
        });

        if (group.length) {
          table.children.push(h(org, 'tbody', toHast(group)));
        }

        return table;
      }
      case 'table-row':
        if (org.rowType === 'standard') {
          return h(org, 'tr', toHast(org.children));
        } else {
          return null;
        }
      case 'table-cell':
        return h(org, 'td', toHast(org.children));
      default:
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
