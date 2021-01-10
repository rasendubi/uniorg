export interface ParseOptions {
  todoKeywords: string[];
  emphasisRegexpComponents: {
    pre: string;
    post: string;
    border: string;
    body: string;
    newline: number;
  };
  linkTypes: string[];
}

export const defaultOptions: ParseOptions = {
  todoKeywords: ['TODO', 'DONE'],
  emphasisRegexpComponents: {
    pre: '-–—\\s\\(\'"\\{',
    post: '-–—\\s.,:!?;\'"\\)\\}\\[',
    border: '\\s',
    body: '.',
    newline: 1,
  },
  linkTypes: [
    'eww',
    'rmail',
    'mhe',
    'irc',
    'info',
    'gnus',
    'docview',
    'bbdb',
    'w3m',
    'printindex',
    'index',
    'bibentry',
    'Autocites',
    'autocites',
    'supercites',
    'Textcites',
    'textcites',
    'Smartcites',
    'smartcites',
    'footcitetexts',
    'footcites',
    'Parencites',
    'parencites',
    'Cites',
    'cites',
    'fnotecite',
    'Pnotecite',
    'pnotecite',
    'Notecite',
    'notecite',
    'footfullcite',
    'fullcite',
    'citeurl',
    'citedate*',
    'citedate',
    'citetitle*',
    'citetitle',
    'Citeauthor*',
    'Autocite*',
    'autocite*',
    'Autocite',
    'autocite',
    'supercite',
    'parencite*',
    'cite*',
    'Smartcite',
    'smartcite',
    'Textcite',
    'textcite',
    'footcitetext',
    'footcite',
    'Parencite',
    'parencite',
    'Cite',
    'Citeauthor',
    'Citealp',
    'Citealt',
    'Citep',
    'Citet',
    'citeyearpar',
    'citeyear*',
    'citeyear',
    'citeauthor*',
    'citeauthor',
    'citetext',
    'citenum',
    'citealp*',
    'citealp',
    'citealt*',
    'citealt',
    'citep*',
    'citep',
    'citet*',
    'citet',
    'nocite',
    'cite',
    'Cref',
    'cref',
    'autoref',
    'eqref',
    'nameref',
    'pageref',
    'ref',
    'label',
    'list-of-tables',
    'list-of-figures',
    'addbibresource',
    'bibliographystyle',
    'printbibliography',
    'nobibliography',
    'bibliography',
    'Acp',
    'acp',
    'Ac',
    'ac',
    'acrfull',
    'acrlong',
    'acrshort',
    'glslink',
    'glsdesc',
    'glssymbol',
    'Glspl',
    'Gls',
    'glspl',
    'gls',
    'bibtex',
    'roam',
    'notmuch-tree',
    'notmuch-search',
    'notmuch',
    'attachment',
    'id',
    'file+sys',
    'file+emacs',
    'shell',
    'news',
    'mailto',
    'https',
    'http',
    'ftp',
    'help',
    'file',
    'elisp',
    'do',
  ],
};

export const {
  todoKeywords,
  emphasisRegexpComponents,
  linkTypes,
} = defaultOptions;

export function linkPlainRe(): string {
  return `${linkTypesRe()}:([^\\]\\[ \t\\n()<>]+(?:\\([\\w0-9_]+\\)|([^\\W \t\\n]|/)))`;
}

export function linkTypesRe(): string {
  const linkTypes = defaultOptions.linkTypes;
  return '(' + linkTypes.map((t) => t.replace(/\*/g, '\\*')).join('|') + ')';
}

export function paragraphSeparateRe(): RegExp {
  const listAllowAlphabetical = true;
  const plainListOrderedItemTerminator = [')', '.'];

  const term = `[${plainListOrderedItemTerminator.join('')}]`;
  const alpha = listAllowAlphabetical ? '|[A-Za-z]' : '';

  return new RegExp(
    [
      '^(?:',
      [
        // Headlines, inlinetasks.
        '\\*+ ',
        // TODO: Footnote definitions.
        // TODO: Diary sexps.
        '[ \\t]*(?:' +
          [
            // Empty lines.
            '$',
            // Tables (any type).
            '\\|',
            '\\+(?:-+\\+)+[ \t]*$',
            // Comments, keyword-like or block-like constructs.
            // Blocks and keywords with dual values need to be
            // double-checked.
            '#(?: |$|\\+(?:begin_\\S+|\\S+(?:\\[.*\\])?:[ \\t]*))',
            // Drawers (any type) and fixed-width areas. Drawers need
            // to be double-checked.
            ':(?: |$|[-_\\w]+:[ \\t]*$)',
            // TODO: Horizontal rules.
            // LaTeX environments.
            `\\\\begin\\{([A-Za-z0-9*]+)\\}`,
            // Clock lines.
            `CLOCK:`,
            // Lists.
            `(?:[-+*]|(?:[0-9]+${alpha})${term})(?:[ \\t]|$)`,
          ].join('|') +
          ')',
      ].join('|'),
      ')',
    ].join(''),
    'mi'
  );
}

export function itemRe(): RegExp {
  return new RegExp(
    `^(?<indent> *)(\\*|-|\\+|\\d+\\.|\\d+\\)|\\w\\.|\\w\\))( |\\n)`
  );
}

/// Matches a list item and puts everything into groups:
/// - indent
/// - bullet
/// - counter
/// - checkbox
/// - tag (description tag)
export function fullItemRe(): RegExp {
  return /^(?<indent>[ \t]*)(?<bullet>(?:[-+*]|(?:[0-9]+|[A-Za-z])[.)])(?:[ \t]+|$))(?:\[@(?:start:)?(?<counter>[0-9]+|[A-Za-z])\][ \t]*)?(?:(?<checkbox>\[[ X-]\])(?:[ \t]+|$))?(?:(?<tag>.*)[ \t]+::(?:[ \t]+|$))?/m;
}

export function listEndRe(): RegExp {
  return /^[ \t]*\n[ \t]*\n/m;
}

export function restrictionFor(type: string) {
  const allObjects = new Set([
    'bold',
    'code',
    'entity',
    'export-snippet',
    'footnote-reference',
    'inline-babel-call',
    'inline-src-block',
    'italic',
    'line-break',
    'latex-fragment',
    'link',
    'macro',
    'radio-target',
    'statistics-cookie',
    'strike-through',
    'subscript',
    'superscript',
    'table-cell',
    'target',
    'timestamp',
    'underline',
    'verbatim',
  ]);

  const minimalSet = new Set([
    'bold',
    'code',
    'entity',
    'italic',
    'latex-fragment',
    'strike-through',
    'subscript',
    'superscript',
    'underline',
    'verbatim',
  ]);

  const standardSet = new Set(allObjects);
  standardSet.delete('table-cell');

  const standardSetNoLineBreak = new Set(standardSet);
  standardSetNoLineBreak.delete('line-break');

  const keywordSet = new Set(standardSet);
  keywordSet.delete('footnote-reference');

  const objectRestrictions: Record<string, Set<string>> = {
    bold: standardSet,
    'footnote-reference': standardSet,
    headline: standardSetNoLineBreak,

    inlinetask: standardSetNoLineBreak,
    italic: standardSet,
    item: standardSetNoLineBreak,
    keyword: keywordSet,
    // Ignore all links in a link description.  Also ignore
    // radio-targets and line breaks.
    link: new Set([
      'export-snippet',
      'inline-babel-call',
      'inline-src-block',
      'macro',
      'statistics-cookie',
      ...minimalSet,
    ]),
    paragraph: standardSet,
    // Remove any variable object from radio target as it would
    // prevent it from being properly recognized.
    'radio-target': minimalSet,
    'strike-through': standardSet,
    subscript: standardSet,
    superscript: standardSet,
    // Ignore inline babel call and inline source block as formulas
    // are possible.  Also ignore line breaks and statistics
    // cookies.
    'table-cell': new Set([
      'export-snippet',
      'footnote-reference',
      'link',
      'macro',
      'radio-target',
      'target',
      'timestamp',
      ...minimalSet,
    ]),
    'table-row': new Set(['table-cell']),
    underline: standardSet,
    'verse-block': standardSet,
  };

  return objectRestrictions[type];
}

export const greaterElements = new Set([
  'center-block',
  'drawer',
  'dynamic-block',
  'footnote-definition',
  'headline',
  'inlinetask',
  'item',
  'plain-list',
  'property-drawer',
  'quote-block',
  'section',
  'special-block',
  'table',
]);

export function unescapeCodeInString(s: string) {
  return s.replace(/^[ \t]*,*(,)(?:\*|#\+)/gm, '');
}

function emphTemplate(s: string) {
  const { pre, post, border, newline, body: b } = emphasisRegexpComponents;
  const body = newline <= 0 ? b : `${b}*?(?:\\n${b}*?){0,${newline}}`;
  return new RegExp(
    [
      `([${pre}]|^)`, // before markers
      `(([${s}])([^${border}]|[^${border}]${body}[^${border}])\\3)`,
      `([${post}]|$)`, // after markers
    ].join('')
  );
}

export function emphRe() {
  return emphTemplate('*/_+');
}
export function verbatimRe() {
  return emphTemplate('=~');
}
