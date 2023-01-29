import { ParseOptions } from './parse-options.js';

export class OrgRegexUtils {
  private options: ParseOptions;

  constructor(options: ParseOptions) {
    this.options = options;
  }

  /**
   * Regexp matching a citation key. Key is located in match group “key”.
   */
  public citationKeyRe(): RegExp {
    return /@(?<key>[-.:?!`'/*@+|(){}<>&_^$#%~\w]+)/g;
  }

  /**
   * Regexp matching a citation prefix. Style, if any, is located in
   * matching group “style”.
   */
  public citationPrefixRe(): RegExp {
    return /\[cite(?:\/(?<style>[/_a-z0-9-]+))?:[\t\n ]*/gm;
  }

  public linkPlainRe(): string {
    return `${this.linkTypesRe()}([^\\]\\[ \t\\n()<>]+(?:\\([\\w0-9_]+\\)|([^\\W \t\\n]|/)))`;
  }

  public linkTypesRe(): string {
    return '(' + this.options.linkTypes.map(escapeRegExp).join('|') + '):';
  }

  /**
   * Regexp possibly matching the beginning of an object. This regexp
   * allows false positives. Dedicated parser (e.g.,
   * Parser.parseBold()) will take care of further filtering. Radio
   * links are not matched by this regexp, as they are treated
   * specially in Parser.parseElement().
   */
  public objectRe(): RegExp {
    return new RegExp(
      [
        // Sub/superscript.
        '(?:[_^][-{(*+.,\\p{Letter}\\p{Number}])',
        // Bold, code, italic, strike-through, underline
        // and verbatim.
        `[*~=+_/][^${this.options.emphasisRegexpComponents.border}]`,
        // Plain links.
        this.linkPlainRe(),
        // Objects starting with "[": citations,
        // footnote reference, statistics cookie,
        // timestamp (inactive) and regular link.
        [
          '\\[(?:',
          ['cite[:/]', 'fn:', '(?:[0-9]|(?:%|/[0-9]*)\\])', '\\['].join('|'),
          ')',
        ].join(''),
        // Objects starting with "@": export snippets.
        '@@',
        // Objects starting with "{": macro.
        '\\{\\{\\{',
        // Objects starting with "<": timestamp (active, diary),
        // target, radio target and angular links.
        `<(?:%%|<|[0-9]|${this.linkTypesRe()})`,
        // Objects starting with "$": latex fragment.
        '\\$',
        // Objects starting with "\": line break, entity, latex
        // fragment.
        '\\\\(?:[a-zA-Z\\[\\(]|\\\\[ \\t]*$|_ +)',
        // Objects starting with raw text: inline Babel source block,
        // inline Babel call.
        '(?:call|src)_',
      ].join('|'),
      'mu'
    );
  }

  // see (org-item-re)
  public listItemRe(): RegExp {
    return new RegExp(
      `^((?<indent1>[ \\t]+)\\*|(?<indent2>[ \\t]*)(-|\\+|\\d+\\.|\\d+\\)|\\w\\.|\\w\\)))([ \\t]|\\n)`
    );
  }

  /// Matches a list item and puts everything into groups:
  /// - indent
  /// - bullet
  /// - counter
  /// - checkbox
  /// - tag (description tag)
  // see org-list-full-item-re
  public fullListItemRe(): RegExp {
    return /^(?<indent>[ \t]*)(?<bullet>(?:[-+*]|(?:[0-9]+|[A-Za-z])[.)])(?:[ \t]+|$))(?<counter_group>\[@(?:start:)?(?<counter>[0-9]+|[A-Za-z])\][ \t]*)?(?<checkbox_group>(?<checkbox>\[[ X-]\])(?:[ \t]+|$))?(?:(?<tag>.*?)[ \t]+::(?:[ \t]+|$))?/im;
  }

  public listEndRe(): RegExp {
    return /^[ \t]*\n[ \t]*\n/m;
  }

  public paragraphSeparateRe(): RegExp {
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
          // Footnote definitions.
          '\\[fn:[-_\\w]+\\]',
          // Diary sexps.
          '%%\\(',
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
              // Horizontal rules.
              '-{5,}[ \\t]*$',
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

  /** The regular expression matching a sub- or superscript. */
  // Using \p{L}|\d instead of \w because js's \w matches underscore and
  // Emacs's doesn't.
  //
  // Adapted from `org-match-substring-regexp`.
  public matchSubstringRegex(): RegExp {
    return new RegExp(
      `(\\S)([_^])((?:${this.multibraceRe(
        '\\{',
        '\\}',
        this.options.matchSexpDepth,
        'inBraces'
      )})|(?:${this.multibraceRe(
        '\\(',
        '\\)',
        this.options.matchSexpDepth,
        'inBrackets'
      )})|(?:\\*|[+-]?[\\p{L}\\d.,\\\\]*(?:\\p{L}|\\d)))`,
      'u'
    );
  }

  /** A regular expression matching a sub- or superscript, forcing braces. */
  // Using \p{L}|\d instead of \w because js's \w matches underscore and
  // Emacs's doesn't.
  //
  // Adapted from `org-match-substring-with-braces-regexp`.
  public matchSubstringWithBracesRegex(): RegExp {
    return new RegExp(
      `(\\S)([_^])(${this.multibraceRe(
        '\\{',
        '\\}',
        this.options.matchSexpDepth,
        'inBraces'
      )})`,
      'u'
    );
  }

  /**
   * Compile a regex that matches up to `n` nested groups delimited
   * with `left` and `right`. The content of the outermost group is
   * captured in the regex group `name`.
   *
   * Adapted from `org-create-multibrace-regexp` emacs function.
   */
  multibraceRe(left: string, right: string, n: number, name = ''): string {
    const nothing = `[^${left}${right}]*?`;

    let next = `(?:${nothing}${left}${nothing}${right})+${nothing}`;
    let result = nothing;
    for (let i = 1; i < n; i++) {
      result = `${result}|${next}`;
      next = `(?:${nothing}${left}${next}${right})+${nothing}`;
    }

    const nameRe = name ? `?<${name}>` : '';
    return `${left}(${nameRe}${result})${right}`;
  }

  public emphRe() {
    return this.emphTemplate('*/_+');
  }
  public verbatimRe() {
    return this.emphTemplate('=~');
  }
  private emphTemplate(s: string) {
    const {
      pre,
      post,
      border,
      newline,
      body: b,
    } = this.options.emphasisRegexpComponents;
    const body = newline <= 0 ? b : `${b}*?(?:\\n${b}*?){0,${newline}}`;
    return new RegExp(
      [
        `([${pre}]|^)`, // before markers
        `(([${s}])([^${border}]|[^${border}]${body}[^${border}])\\3)`,
        `([${post}]|$)`, // after markers
      ].join('')
    );
  }
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
    'citation',
    'citation-reference',
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
  standardSet.delete('citation-reference');

  const standardSetNoLineBreak = new Set(standardSet);
  standardSetNoLineBreak.delete('line-break');

  const keywordSet = new Set(standardSet);
  keywordSet.delete('footnote-reference');

  const objectRestrictions: Record<string, Set<string>> = {
    bold: standardSet,
    citation: new Set(['citation-reference']),
    'citation-reference': minimalSet,

    'footnote-reference': standardSet,
    headline: standardSetNoLineBreak,

    inlinetask: standardSetNoLineBreak,
    italic: standardSet,
    'list-item': standardSetNoLineBreak,
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
      'citation',
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
  'inlinetask',
  'list-item',
  'plain-list',
  'property-drawer',
  'quote-block',
  'section',
  'special-block',
  'table',
]);

export function unescapeCodeInString(s: string) {
  return s.replace(/^[ \t]*,(,*)(\*|#\+)/gm, '$1$2');
}

/**
 * Escape characters that have special meaning in the regex. This
 * function returns a regex string that matches `s` literally.
 */
export function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
