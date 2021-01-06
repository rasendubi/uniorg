import u from 'unist-builder';
import {
  defaultOptions,
  linkPlainRe,
  ParseOptions,
  itemRe,
  fullItemRe,
  paragraphSeparateRe,
  restriction,
  listEndRe,
  greaterElements,
  unescapeCodeInString,
} from './parser/utils';
import { Reader } from './reader';
import {
  Headline,
  List,
  OrgData,
  Section,
  Paragraph,
  ElementType,
  ObjectType,
  Link,
  GreaterElementType,
  ListStructureItem,
  QuoteBlock,
  SpecialBlock,
  Keyword,
  SrcBlock,
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

type ParseMode =
  | 'first-section'
  | 'item'
  | 'node-property'
  | 'planning'
  | 'property-drawer'
  | 'section'
  | 'table-row'
  | 'top-comment'
  | null;

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

  public parse(): OrgData {
    this.parseEmptyLines();
    const children = this.parseElements('first-section');
    return u(
      'org-data',
      { contentsBegin: 0, contentsEnd: this.r.endOffset() },
      children as any
    );
  }

  // General parsing structure

  private parseElements(mode: ParseMode, structure?: ListStructureItem[]) {
    const elements = [];
    let prevOffset = -1;
    while (!this.r.eof()) {
      const offset = this.r.offset();
      if (offset === prevOffset) {
        console.log(
          'elements:',
          elements,
          'rest:',
          JSON.stringify(this.r.rest())
        );
        throw new Error('no progress (elements)');
      }
      prevOffset = offset;

      const element = this.parseElement(mode, structure);
      const type = element.type;
      const cbeg = element.contentsBegin as number | undefined;
      const cend = element.contentsEnd as number | undefined;

      if (cbeg === undefined || cend === undefined) {
        // do nothing
      } else if (greaterElements.has(type)) {
        this.r.narrow(cbeg, cend);
        element.children = this.parseElements(
          Parser.nextMode(mode, type, true),
          structure ?? element?.structure
        );
        this.r.widen();
      } else {
        this.r.narrow(cbeg, cend);
        element.children = this.parseObjects(restriction(element.type));
        this.r.widen();
      }

      elements.push(element);

      mode = Parser.nextMode(mode, type, false);
    }

    return elements;
  }

  private static nextMode(
    mode: ParseMode,
    type: string,
    parent: boolean
  ): ParseMode {
    if (parent) {
      if (type === 'headline') return 'section';
      if (mode === 'first-section' && type === 'section') return 'top-comment';
      if (type === 'inlinetask') return 'planning';
      if (type === 'plain-list') return 'item';
      if (type === 'property-drawer') return 'node-property';
      if (type === 'section') return 'planning';
      if (type === 'table') return 'table-row';
    } else {
      if (mode === 'item') return 'item';
      if (mode === 'node-property') return 'node-property';
      if (mode === 'planning' && type === 'planning') return 'property-drawer';
      if (mode === 'table-row') return 'table-row';
      if (mode === 'top-comment' && type === 'comment')
        return 'property-drawer';
    }
    return null;
  }

  private parseObjects(restriction: Set<string>): ObjectType[] {
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
        linkPlainRe(),
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

      // TODO: handle parseObject returning null. (Process text before
      // object after object is found.)
      const o = this.parseObject(restriction);
      if (o) {
        objects.push(o);
      }
    }

    const text = this.r.rest();
    this.r.advance(text.length);
    if (text.trim().length) {
      objects.push(u('text', { value: text }));
    }

    return objects;
  }

  private parseElement(
    mode: ParseMode,
    structure?: ListStructureItem[]
  ): GreaterElementType | ElementType {
    if (mode === 'item') return this.parseItem(structure!);
    if (this.atHeading()) return this.parseHeadline();
    if (mode === 'section') return this.parseSection();
    if (mode === 'first-section') {
      const nextHeading = this.r.match(/^\*+[ \t]/m);
      this.r.narrow(
        this.r.offset(),
        nextHeading ? this.r.offset() + nextHeading.index : this.r.endOffset()
      );
      const result = this.parseSection();
      this.r.widen(true);
      return result;
    }

    // TODO: affiliated keywords

    // Inline Comments, Blocks, Babel Calls, Dynamic Blocks and
    // Keywords.
    {
      const offset = this.r.offset();
      if (this.r.advance(this.r.match(/^[ \t]*#\+/))) {
        const blockM = this.r.match(/^begin_(\S+)/i);
        if (blockM) {
          this.r.resetOffset(offset);
          const blockType = blockM[1].toLowerCase();
          switch (blockType) {
            case 'quote':
              return this.parseQuoteBlock();
            case 'src':
              return this.parseSrcBlock();
            default:
              return this.parseSpecialBlock();
          }
        }

        if (this.r.match(/\S+:/)) {
          this.r.resetOffset(offset);
          return this.parseKeyword();
        }

        // fallback: parse as paragraph
        console.log('fallback parse as paragraph');
        this.r.resetOffset(offset);
        return this.parseParagraph();
      }
    }

    // List.
    if (this.r.match(itemRe())) {
      if (structure === undefined) {
        const offset = this.r.offset();
        structure = this.parseListStructure();
        this.r.resetOffset(offset);
      }
      return this.parseList(structure);
    }

    return this.parseParagraph();
  }

  private parseObject(restriction: Set<string>): ObjectType | null {
    const c = this.r.peek(2);
    switch (c[0]) {
      case '[':
        if (c[1] === '[') {
          // normal link
          if (restriction.has('link')) {
            return this.parseLink();
          }
        }
        break;
      default:
        // probably a plain link
        if (restriction.has('link')) {
          return this.parseLink();
        }
    }
    return null;
  }

  // Elements parsers

  private parseHeadline(): Headline {
    const stars = this.r.match(new RegExp(`^(\\*+)[ \\t]+`))!;
    this.r.advance(stars);
    const level = stars[1].length;

    // TODO: keyword
    // TODO: priority

    const titleMatch = this.r.match(/^.*/)!;
    const titleStart = this.r.offset();
    const titleEnd = titleStart + titleMatch[0].length;
    const rawValue = this.r.substring(titleStart, titleEnd);
    this.r.advance(titleMatch);

    this.r.narrow(titleStart, titleEnd);
    const title = this.parseObjects(restriction('headline'));
    this.r.widen();

    // TODO: tags

    this.r.advance(this.r.line());
    this.parseEmptyLines();
    const contentsBegin = this.r.offset();

    const endOfSubtree = this.r.match(
      new RegExp(`^\\*{1,${level}}[ \\t]`, 'm')
    );
    const contentsEnd = endOfSubtree
      ? contentsBegin + endOfSubtree.index
      : this.r.endOffset();
    this.r.resetOffset(contentsEnd);

    return u(
      'headline',
      {
        level,
        rawValue,
        title,
        contentsBegin,
        contentsEnd,
      },
      []
    );
  }

  private parseSection(): Section {
    const begin = this.r.offset();
    const m = this.r.match(/^\*+[ \\t]/m);
    const end = m ? begin + m.index : this.r.endOffset();
    this.r.resetOffset(end);
    return u('section', { contentsBegin: begin, contentsEnd: end }, []);
  }

  private parseQuoteBlock(): QuoteBlock | Paragraph {
    const endM = this.r.match(/^[ \t]*#\+end_quote[ \t]*$/im);
    if (!endM) {
      // Incomplete block: parse it as a paragraph.
      return this.parseParagraph();
    }

    const begin = this.r.offset();
    const contentsBegin = begin + this.r.line().length;
    const contentsEnd = begin + endM.index;
    this.r.resetOffset(contentsEnd);
    this.r.advance(this.r.line());
    this.parseEmptyLines();
    const _end = this.r.offset();

    return u('quote-block', { contentsBegin, contentsEnd }, []);
  }

  private parseSrcBlock(): SrcBlock | Paragraph {
    const endM = this.r.match(/^[ \t]*#\+end_src[ \t]*$/im);
    if (!endM) {
      // Incomplete block: parse it as a paragraph.
      return this.parseParagraph();
    }

    const headerM = this.r.forceMatch(
      /^[ \t]*#\+begin_src(?: +(?<language>\S+))?(?<switches>(?: +(?:-(?:l ".+"|[ikr])|[-+]n(?: *[0-9]+)?))+)?(?<parameters>.*)[ \t]*$/im
    );
    const { language, switches, parameters } = headerM.groups as Record<
      string,
      string
    >;

    const begin = this.r.offset();
    const contentsBegin = begin + this.r.line().length;
    const contentsEnd = begin + endM.index;
    const value = unescapeCodeInString(
      this.r.substring(contentsBegin, contentsEnd)
    );
    this.r.resetOffset(contentsEnd);
    this.r.advance(this.r.line());
    this.parseEmptyLines();
    const _end = this.r.offset();

    return u('src-block', { language, value });
  }

  private parseSpecialBlock(): SpecialBlock | Paragraph {
    const blockType = this.r.match(/[ \t]*#\+begin_(\S+)/i)![1];
    const endM = this.r.match(
      // TODO: regexp-quote blockType
      new RegExp(`^[ \\t]*#\\+end_${blockType}[ \\t]*$`, 'im')
    );
    if (!endM) {
      console.log('incomplete block', blockType, this.r.rest());
      // Incomplete block: parse it as a paragraph.
      return this.parseParagraph();
    }

    const begin = this.r.offset();
    const contentsBegin = begin + this.r.line().length;
    const contentsEnd = begin + endM.index;
    this.r.resetOffset(contentsEnd);
    this.r.advance(this.r.line());
    this.parseEmptyLines();
    const _end = this.r.offset();

    return u('special-block', { blockType, contentsBegin, contentsEnd }, []);
  }

  private parseKeyword(): Keyword {
    const m = this.r.match(/[ \t]*#\+(\S+):(.*)/)!;
    const key = m[1].toUpperCase();
    const value = m[2].trim();
    this.r.advance(this.r.line());
    this.parseEmptyLines();
    return u('keyword', { key, value });
  }

  private parseParagraph(): Paragraph {
    const contentsBegin = this.r.offset();
    this.r.advance(this.r.line());
    const next = this.r.match(paragraphSeparateRe());
    const contentsEnd = next
      ? this.r.offset() + next.index
      : this.r.endOffset();
    this.r.resetOffset(contentsEnd);
    this.parseEmptyLines();

    return u('paragraph', { contentsBegin, contentsEnd }, []);
  }

  private parseList(structure: ListStructureItem[]): List {
    const contentsBegin = this.r.offset();

    const item = structure.find((x) => x.begin === contentsBegin)!;
    if (!item) {
      throw new Error(
        `parseList: cannot find item. contentsBegin: ${contentsBegin}, structure: ${JSON.stringify(
          structure,
          null,
          2
        )}`
      );
    }
    const indent = item.indent;
    let pos = item.end;
    while (true) {
      const next = structure.find(
        (x) => x.begin === pos && x.indent === indent
      );
      if (!next) break;
      pos = next.end;
    }
    const contentsEnd = pos;

    this.r.resetOffset(contentsEnd);

    return u(
      'plain-list',
      { indent, contentsBegin, contentsEnd, structure },
      []
    );
  }

  private parseItem(structure: ListStructureItem[]) {
    const offset = this.r.offset();
    const m = this.r.match(fullItemRe());
    this.r.advance(m);
    if (!m) {
      throw new Error('parseItem: fullItemRe failed');
    }
    const bullet = m.groups!.bullet;
    const checkbox =
      m.groups!.checkbox === '[ ]'
        ? 'off'
        : m.groups!.checkbox?.toLowerCase() === '[x]'
        ? 'on'
        : m.groups!.checkbox === '[-]'
        ? 'trans'
        : null;
    const item = structure.find((x) => x.begin === offset)!;
    const contentsBegin = this.r.offset();
    const contentsEnd = item.end;
    this.r.resetOffset(contentsEnd);
    return u(
      'item',
      { indent: item.indent, bullet, checkbox, contentsBegin, contentsEnd },
      []
    );
  }

  private parseListStructure(): ListStructureItem[] {
    const items: ListStructureItem[] = [];
    const struct: ListStructureItem[] = [];
    while (true) {
      if (this.r.eof() || this.r.match(listEndRe())?.index === 0) {
        break;
      }

      const m = this.r.match(itemRe());
      if (m) {
        const indent = m.groups!.indent.length;
        // end previous siblings
        while (items.length && items[items.length - 1].indent >= indent) {
          const item = items.pop()!;
          item.end = this.r.offset();
          struct.push(item);
        }

        const fullM = this.r.match(fullItemRe());
        if (!fullM) {
          throw new Error(`fullItemRe didn't match: ${this.r.rest()}`);
        }
        const { bullet, counter, checkbox, tag } = fullM.groups as Record<
          string,
          string
        >;

        const item = {
          begin: this.r.offset(),
          indent,
          bullet,
          counter: counter ?? null,
          checkbox: checkbox ?? null,
          tag: tag ?? null,
          // will be overwritten later
          end: this.r.offset(),
        };
        items.push(item);

        this.r.advance(this.r.line());
      } else if (this.r.match(/^[ \t]*$/)) {
        // skip empty lines
        this.r.advance(this.r.line());
      } else {
        // At some text line. Check if it ends any previous item.
        const indent = this.r.match(/^[ \t]*/)![0].length;

        while (items.length && items[items.length - 1].indent >= indent) {
          const item = items.pop()!;
          item.end = this.r.offset();
          struct.push(item);
        }
        if (!items.length) {
          // closed full list
          break;
        }

        // TODO: skip blocks

        this.r.advance(this.r.line());
      }
    }

    this.parseEmptyLines();

    // list end: close all items
    const end = this.r.offset();
    items.forEach((item) => {
      item.end = end;
    });
    struct.push(...items);
    return struct.sort((a, b) => a.begin - b.begin);
  }

  // Object parsers.

  private parseLink(): Link | null {
    const initialOffset = this.r.offset();

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
            const contentStart = initialOffset + 2 + m.groups!.link.length + 2;
            const contentEnd = contentStart + m.groups!.text.length;
            this.r.narrow(contentStart, contentEnd);
            children = this.parseObjects(restriction('link'));
            this.r.widen();
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

  // Helpers

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

  private atHeading(): boolean {
    return this.r.match(/^\*+ /) !== null;
  }
}
