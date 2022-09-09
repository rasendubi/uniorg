export interface ParseOptions {
  /**
   * Similar to `org-todo-keywords` in Emacs, but it only accepts a
   * plain list of keywords.
   */
  todoKeywords: string[];
  /**
   * Allows overriding parameters for emphasis regex. Corresponds to
   * `org-emphasis-regex-components` in Emacs.
   */
  emphasisRegexpComponents: {
    pre: string;
    post: string;
    border: string;
    body: string;
    newline: number;
  };
  /**
   * A list of allowed URI schemes that are recognized as URLs. You
   * can get this list in emacs by calling `(org-link-types)`.
   */
  linkTypes: string[];
  /**
   * Number of stacked braces for sub/superscript
   * matching. Corresponds to `org-match-sexp-depth` in Emacs.
   */
  matchSexpDepth: number;
  /**
   * Add begin/end properties to primitive nodes
   */
  positions: boolean;
}

export const defaultOptions: ParseOptions = {
  todoKeywords: ['TODO', 'DONE'],
  emphasisRegexpComponents: {
    // deviates from org mode default to allow ndash, mdash, and
    // quotes (’“”)
    pre: '-–—\\s\\(\'’"“”\\{',
    // deviates from org mode default to allow ndash, mdash, and
    // quotes (’“”)
    post: '-–—\\s.,:!?;\'’"“”\\)\\}\\[',
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
  matchSexpDepth: 3,
  positions: true,
};
