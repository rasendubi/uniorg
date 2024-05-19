export interface ParseOptions {
  /**
   * Similar to `org-todo-keywords` in Emacs, but it only accepts a
   * plain list of keywords.
   */
  todoKeywords: string[];
  /**
   * Same as `org-use-sub-superscripts` in Emacs.
   *
   * - `true` (default) - parse sub-/superscripts
   * - `false` - do not parse sub-/superscripts
   * - `'{}'` - only parse sub-/superscripts when enclosed in braces
   */
  useSubSuperscripts: true | false | '{}';
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
}

export const defaultOptions: ParseOptions = {
  todoKeywords: ['TODO', 'DONE'],
  useSubSuperscripts: true,
  // Interestingly enough, zero-width space (\u200b) is not considered
  // a space in unicode but is considered a space by Emacs. This is
  // why we have to add \u200b explicitly after \s in the
  // regex. Otherwise, the suggested use-case of adding ZWSP as a
  // markup border does not work.
  emphasisRegexpComponents: {
    // deviates from org mode default to allow ndash, mdash, and
    // quotes (’“”)
    pre: '-–—\\s\u200b\\(\'’"“”\\{',
    // deviates from org mode default to allow ndash, mdash, and
    // quotes (’“”)
    post: '-–—\\s\u200b.,:!?;\'’"“”\\)\\}\\[',
    border: '\\s\u200b',
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
};
