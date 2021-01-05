import u from 'unist-builder';
import { Reader } from './reader';
import {
  Headline,
  Item,
  List,
  Root,
  Section,
  Paragraph,
  ElementType,
  ObjectType,
  Link,
} from './types';

/*
(defun rasen/org-debug ()
  "Show org AST for the current buffer."
  (interactive)
  (let ((document (org-element-parse-buffer)))
    (with-current-buffer-window "*org-elements*" nil nil
      (emacs-lisp-mode)
      (pp (cddr document)))))
 */

export interface ParseOptions {
  todoKeywords: string[];
  linkTypes: string[];
}

const defaultOptions: ParseOptions = {
  todoKeywords: ['TODO', 'DONE'],
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

export function parse(text: string, options?: Partial<ParseOptions>) {
  return new Parser(text, options).parse();
}

class Parser {
  private readonly r: Reader;
  private readonly options: ParseOptions;

  public constructor(text: string, options: Partial<ParseOptions> = {}) {
    this.r = new Reader(text);
    this.options = { ...defaultOptions, ...options };
  }

  public parse(): Root {
    this.parseEmptyLines();

    const children = [];

    const section = this.parseSection();
    if (section) {
      children.push(section);
    }

    for (
      let headline = this.parseHeadline(1);
      headline;
      headline = this.parseHeadline(1)
    ) {
      children.push(headline);
    }

    return u('root', {}, children);
  }

  private parseHeadline(level: number): Headline | null {
    const stars = this.r.match(new RegExp(`^(\\*{${level},}) `));
    if (!stars) {
      return null;
    }
    this.r.advance(stars);
    const actualLevel = stars[1].length;

    // TODO: keyword
    // TODO: priority

    const titleStart = this.r.offset();
    const titleEnd = titleStart + this.r.match(/^.*/)![0].length;
    this.r.narrow(titleStart, titleEnd);
    const title = this.parseObjects();
    this.r.widen();
    this.r.resetOffset(titleEnd);

    // TODO: tags

    this.r.advance('\n');

    const children = this.parseHeadlineChildren(level);

    return u('headline', { level: actualLevel, title }, children);
  }

  private parseObjects(): ObjectType[] {
    const objects: ObjectType[] = [];

    const emphasisRegexpComponents = {
      pre: '-–—\\s\\(\'"\\{',
      post: '-–—\\s.,:!?;\'"\\)\\}\\[',
      border: '\\s',
      body: '.',
      newline: 1,
    };

    const objectRegexp = new RegExp(
      [
        // Bold, code, italic, strike-through, underline
        // and verbatim.
        // `[*~=+_/][^${emphasisRegexpComponents.border}]`,

        // Objects starting with "[": regular link,
        // footnote reference, statistics cookie,
        // timestamp (inactive).
        [
          '\\[(?:',
          // 'fn:',
          // '|',
          '\\[',
          // '|',
          // '[0-9]\\{4\\}-[0-9]\\{2\\}-[0-9]\\{2\\}',
          // '|',
          // '[0-9]*\\(?:%\\|/[0-9]*\\)\\]',
          ')',
        ].join(''),

        // Plain link
        this.linkPlainRe(),
      ].join('|')
    );

    let prevOffset = -1;
    while (true) {
      const offset = this.r.offset();
      if (prevOffset === offset) {
        throw new Error('no progress');
      }
      prevOffset = offset;

      const match = this.r.match(objectRegexp);
      if (!match) {
        break;
      }

      if (match.index !== 0) {
        // parse text before object
        const text = this.r.peek(match.index);
        this.r.advance(match.index);
        objects.push(u('text', { value: text }));
      }

      const o = this.parseObject();
      if (o) {
        objects.push(o);
      }
    }

    const text = this.r.text();
    this.r.advance(text.length);
    if (text.trim().length) {
      objects.push(u('text', { value: text }));
    }

    return objects;
  }

  private parseObject(): ObjectType | null {
    const c = this.r.peek(2);
    switch (c[0]) {
      case '[':
        if (c[1] === '[') {
          // normal link
          return this.parseLink();
        }
        break;
      default:
        // probably link
        return this.parseLink();
    }
    return null;
  }

  private parseLink(): Link | null {
    const initialOffset = this.r.offset();

    const linkPlainRe = new RegExp(this.linkPlainRe());
    const linkBracketRe = /\[\[(?<link>([^\[\]]|\\(\\\\)*[\[\]]|\\+[^\[\]])+)\](\[(?<text>.+?)\])?\]/;

    const c = this.r.peek(1);
    switch (c) {
      case '[': {
        // normal link [[http://example.com][text]]
        const m = this.r.match(linkBracketRe);
        this.r.advance(m);
        if (m) {
          let children: ObjectType[] = [];
          if (m.groups!.text) {
            const offset = this.r.offset();

            const contentStart = initialOffset + 2 + m.groups!.link.length + 2;
            const contentEnd = contentStart + m.groups!.text.length;
            this.r.resetOffset(contentStart);
            this.r.narrow(contentStart, contentEnd);
            children = this.parseObjects();
            this.r.widen();

            this.r.resetOffset(offset);
          }

          const linkType = m.groups!.link.match(/(.+?):/);

          return u(
            'link',
            {
              linkType: linkType ? linkType[1] : 'fuzzy',
              rawLink: m.groups!.link,
            },
            children
          );
        }
        break;
      }

      default: {
        // plain link
        const m = this.r.match(/^(\S+):\S+/);
        this.r.advance(m);
        if (m) {
          return u('link', { linkType: m[1], rawLink: m[0] }, []);
        }
      }
    }
    return null;
  }

  private parseHeadlineChildren(level: number): (Section | Headline)[] {
    const children = [];
    const section = this.parseSection();
    if (section) {
      children.push(section);
    }

    for (
      let headline = this.parseHeadline(level + 1);
      headline;
      headline = this.parseHeadline(level + 1)
    ) {
      children.push(headline);
    }

    return children;
  }

  private parseSection(): Section | null {
    const children = this.parseElements();
    return children.length ? u('section', children) : null;
  }

  private parseElements(): ElementType[] {
    return Parser.parseMulti(this.parseElement.bind(this));
  }

  private parseElement(): ElementType | null {
    // The paragraph is the unit of measurement. An element defines
    // syntactical parts that are at the same level as a paragraph,
    // i.e. which cannot contain or be included in a paragraph.
    if (this.r.match(/^\*+ /)) {
      // matches headline
      return null;
    }
    // TODO: detect other greater elements?

    const element = this.parseNonParagraphElement();
    if (element) {
      return element;
    }

    const paragraph = this.parseParagraph();
    if (paragraph) {
      return paragraph;
    }

    return null;
  }

  private parseNonParagraphElement(): Exclude<ElementType, Paragraph> | null {
    const list = this.parseList(0);
    if (list) {
      return list;
    }

    return null;
  }

  private parseParagraph(): Paragraph | null {
    const initialOffset = this.r.offset();

    while (!this.r.eof() && !this.r.match(/^\*+ /)) {
      const offset = this.r.offset();
      const empties = this.parseEmptyLines();
      if (empties.length >= 1) {
        // backtrace
        this.r.resetOffset(offset);
        break;
      }

      const element = this.parseNonParagraphElement();
      if (element) {
        // Found other element
        this.r.resetOffset(offset);
        break;
      }

      this.r.advance(this.r.line());
    }

    const endOffset = this.r.offset();
    if (initialOffset === endOffset) {
      return null;
    }

    this.r.resetOffset(initialOffset);
    this.r.narrow(initialOffset, endOffset);
    const children = this.parseObjects();
    this.r.widen();
    this.r.resetOffset(endOffset);

    this.parseEmptyLines();

    return u('paragraph', children);
  }

  // TODO: greater blocks
  // TODO: drawers
  // TODO: dynamic blocks

  private parseList(indent: number): List | null {
    const children = [];

    for (
      let item = this.parseItem(indent);
      item;
      item = this.parseItem(children[0].indent)
    ) {
      children.push(item);
    }

    if (children.length) {
      this.parseEmptyLines();
      return u('plain-list', { indent: children[0].indent }, children);
    } else {
      return null;
    }
  }

  private parseItem(indent: number): Item | null {
    const bullet = this.r.match(
      new RegExp(
        `^( {${indent},})(\\*|-|\\+|\\d+\\.|\\d+\\)|\\w\\.|\\w\\))( |\\n)`
      )
    );
    if (!bullet) {
      return null;
    }
    this.r.advance(bullet);

    const actualIndent = bullet[1].length;

    // TODO: counter-set
    // TODO: check-box
    // TODO: tag

    const children = this.parseItemChildren(actualIndent);

    return u('item', { indent: actualIndent }, children);
  }

  private parseItemChildren(indent: number): ElementType[] {
    // find boundary
    const startOffset = this.r.offset();
    this.r.advance(this.r.line()); // first line is always part of item

    // SPEC: An item ends before the next item, the first line less or
    // equally indented than its starting line, or two consecutive
    // empty lines.
    while (true) {
      const offset = this.r.offset();
      let empties = this.parseEmptyLines();
      if (empties.length >= 2) {
        // backtrace
        this.r.resetOffset(offset);
        break;
      }

      const line = this.r.line();
      if (!line.match(new RegExp(`^ {${indent + 1},}`))) {
        break;
      }
      this.r.advance(line.length);
    }
    const boundary = this.r.offset();

    // parse within boundary
    this.r.resetOffset(startOffset);
    this.r.narrow(startOffset, boundary);
    const children = this.parseElements();

    // restore boundary
    this.r.widen();
    this.r.resetOffset(boundary);

    return children;
  }

  private parseEmptyLines(): string[] {
    return Parser.parseMulti(() => {
      const line = this.r.line();
      if (line.trim().length === 0) {
        this.r.advance(line.length);
        return line;
      }
      return null;
    });
  }

  private static parseMulti<T>(parse: () => T | null): T[] {
    const result: T[] = [];
    for (let x = parse(); x; x = parse()) {
      result.push(x);
    }
    return result;
  }

  private linkPlainRe(): string {
    return `${this.linkTypesRe()}:([^\\]\\[ \t\\n()<>]+(?:\\([\\w0-9_]+\\)|([^\\W \t\\n]|/)))`;
  }

  private linkTypesRe(): string {
    return (
      '(' +
      this.options.linkTypes.map((t) => t.replace(/\*/g, '\\*')).join('|') +
      ')'
    );
  }
}
