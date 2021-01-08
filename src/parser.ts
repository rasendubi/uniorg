import u from 'unist-builder';
import {
  defaultOptions,
  linkPlainRe,
  ParseOptions,
  itemRe,
  fullItemRe,
  paragraphSeparateRe,
  restrictionFor,
  listEndRe,
  greaterElements,
  unescapeCodeInString,
  emphRe,
  emphasisRegexpComponents,
  verbatimRe,
  linkTypesRe,
} from './parser/utils';
import { Reader } from './reader';
import {
  NodeProperty,
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
  Bold,
  Underline,
  Italic,
  Code,
  Verbatim,
  StrikeThrough,
  Timestamp,
  Planning,
  PropertyDrawer,
  Drawer,
  Table,
  TableRow,
  TableCell,
  VerseBlock,
  CenterBlock,
  CommentBlock,
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
          structure ?? (element?.structure as ListStructureItem[] | undefined)
        );
        this.r.widen();
      } else {
        this.r.narrow(cbeg, cend);
        element.children = this.parseObjects(restrictionFor(element.type));
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

  private parseElement(
    mode: ParseMode,
    structure?: ListStructureItem[]
  ): GreaterElementType | ElementType {
    // Item.
    if (mode === 'item') return this.parseItem(structure!);

    // Table Row.
    if (mode === 'table-row') return this.parseTableRow();

    // Node Property.
    if (mode === 'node-property') return this.parseNodeProperty();

    // Headline.
    if (this.atHeading()) return this.parseHeadline();

    // Sections (must be checked after headline).
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

    // TODO: Comments.

    // Planning.
    if (
      mode === 'planning' &&
      // TODO: check previous line is headline
      this.r.match(/^[ \t]*(CLOSED:|DEADLINE:|SCHEDULED:)/)
    ) {
      return this.parsePlanning();
    }

    if (
      (mode === 'planning' ||
        // && TODO: check previous line is headline
        ((mode === 'property-drawer' || mode === 'top-comment') &&
          !this.r.lookingAt(/\s*$/m))) &&
      this.r.lookingAt(
        /^[ \t]*:PROPERTIES:[ \t]*\n(?:[ \t]*:\S+:(?: .*)?[ \t]*\n)*?[ \t]*:END:[ \t]*$/m
      )
    ) {
      return this.parsePropertyDrawer();
    }

    // When not at beginning of line, point is at the beginning of an
    // item or a footnote definition: next item is always a paragraph.
    if (
      !(
        this.r.offset() === 0 ||
        this.r.substring(this.r.offset() - 1, this.r.offset()) === '\n'
      )
    ) {
      return this.parseParagraph();
    }

    // TODO: Clock.
    // TODO: Inlinetask.

    // From there, elements can have affiliated keywords.
    // TODO: affiliated keywords

    // TODO: LaTeX Environment.

    // Drawer.
    if (this.r.lookingAt(drawerRe)) {
      return this.parseDrawer();
    }

    // TODO: Fixed width

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
            case 'center':
              return this.parseBlock('center-block', 'center');
            case 'comment':
              return this.parseCommentBlock();
            // TODO: example
            // TODO: export
            case 'quote':
              return this.parseBlock('quote-block', 'quote');
            case 'src':
              return this.parseSrcBlock();
            case 'verse':
              return this.parseBlock('verse-block', 'verse');
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

    // TODO: Footnote Definition.
    // TODO: Horizontal Rule.
    // TODO: Diary Sexp.

    // Table.
    // There is no strict definition of a table.el table. Try to
    // prevent false positive while being quick.
    const ruleRe = /[ \t]*\+(-+\+)+[ \t]*$/;
    if (this.r.lookingAt(/^[ \t]*\|/)) {
      return this.parseTable();
    } else if (this.r.lookingAt(ruleRe)) {
      const offset = this.r.offset();
      const nextLineOffset = offset + this.r.line().length;
      const firstNonTable = this.r.match(/^[ \t]*($|[^|])/m)?.index ?? null;
      this.r.advance(firstNonTable);
      const isTable =
        this.r.offset() > nextLineOffset && this.r.lookingAt(ruleRe);
      this.r.resetOffset(offset);
      if (isTable) {
        return this.parseTable();
      }
      // fallthrough
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

    // Default element: Paragraph.
    return this.parseParagraph();
  }

  private parseObjects(restriction: Set<string>): ObjectType[] {
    const objects: ObjectType[] = [];

    // offset where previously parsed object ends.
    let prevEnd = this.r.offset();

    while (!this.r.eof()) {
      const prevOffset = this.r.offset();
      const mobject = this.parseObject(restriction);
      if (!mobject) break;

      // Handle parseObject returning result without advancing the
      // cursor. This is always a programming error and leads to
      // infinite loop here.
      if (this.r.offset() === prevOffset) {
        throw new Error(
          `no progress (parseObject): ${JSON.stringify(
            mobject
          )}, text: ${JSON.stringify(this.r.rest())}, objects: ${JSON.stringify(
            objects,
            null,
            2
          )}`
        );
      }

      const [objectBegin, o] = mobject;
      if (objectBegin !== prevEnd) {
        // parse text before object
        const value = this.r.substring(prevEnd, objectBegin);
        objects.push(u('text', { value }));
      }

      const cbeg = o.contentsBegin as number | undefined;
      const cend = o.contentsEnd as number | undefined;
      if (cbeg !== undefined && cend !== undefined) {
        this.r.narrow(cbeg, cend);
        o.children = this.parseObjects(restrictionFor(o.type));
        this.r.widen();
      }

      objects.push(o);

      prevEnd = this.r.offset();
    }

    this.r.resetOffset(prevEnd);

    // handle text after the last object
    const text = this.r.rest();
    this.r.advance(text.length);
    if (text.trim().length) {
      objects.push(u('text', { value: text }));
    }

    return objects;
  }

  private parseObject(restriction: Set<string>): [number, ObjectType] | null {
    // table-cell only allowed inside table-row and always succeed.
    if (restriction.has('table-cell')) {
      return [this.r.offset(), this.parseTableCell()];
    }

    // 1. Search for pattern that probably starts an object.
    // 2. Try to parse object at that position.
    // 3. If not a valid object, advance by one char and repeat.

    const objectRe = new RegExp(
      [
        // TODO: Sub/superscript.

        // Bold, code, italic, strike-through, underline
        // and verbatim.
        `[*~=+_/][^${emphasisRegexpComponents.border}]`,

        // Plain links.
        linkPlainRe(),

        // Objects starting with "[": regular link,
        // footnote reference, statistics cookie,
        // timestamp (inactive).
        [
          '\\[(?:',
          // 'fn:',
          // '|',
          '\\[',
          '|',
          '[0-9]{4}-[0-9]{2}-[0-9]{2}',
          // '|',
          // '[0-9]*(?:%|/[0-9]*)\\]',
          ')',
        ].join(''),

        // TODO: Objects starting with "@": export snippets.
        // TODO: Objects starting with "{": macro.

        // Objects starting with "<": timestamp (active, diary),
        // target, radio target and angular links.
        `<(?:%%|<|[0-9]|${linkTypesRe()})`,

        // TODO: Objects starting with "$": latex fragment.

        // TODO: Objects starting with "\": line break, entity, latex
        // fragment.

        // TODO: Objects starting with raw text: inline Babel source
        // block, inline Babel call.
      ].join('|')
    );

    while (!this.r.eof()) {
      const m = this.r.match(objectRe);
      if (!m) return null;

      this.r.advance(m.index);

      const begin = this.r.offset();
      const o = this.tryParseObject(restriction);
      if (o) {
        if (begin === this.r.offset()) {
          throw new Error('no progress (tryParseObject)');
        }
        return [begin, o];
      }

      this.r.resetOffset(begin);

      // Matching objectRegexp does not guarantee that we've found a
      // valid object (e.g., italic without closing /). Advance cursor
      // by one char and try searching for the next object.
      this.r.advance(1);
    }

    return null;
  }

  private tryParseObject(restriction: Set<string>): ObjectType | null {
    const c = this.r.peek(2);
    switch (c[0]) {
      case '_':
        if (restriction.has('underline')) {
          return this.parseUnderline();
        }
        break;
      case '*':
        if (restriction.has('bold')) {
          return this.parseBold();
        }
        break;
      case '/':
        if (restriction.has('italic')) {
          return this.parseItalic();
        }
        break;
      case '~':
        if (restriction.has('code')) {
          return this.parseCode();
        }
        break;
      case '=':
        if (restriction.has('verbatim')) {
          return this.parseVerbatim();
        }
        break;
      case '+':
        if (restriction.has('strike-through')) {
          return this.parseStrikeThrough();
        }
        break;
      case '<':
        if (c[1] === '<') {
          // TODO: radio target / target
        } else {
          const offset = this.r.offset();
          const ts = restriction.has('timestamp') && this.parseTimestamp();
          if (ts) return ts;
          this.r.resetOffset(offset);

          const link = restriction.has('link') && this.parseLink();
          if (link) return link;
          this.r.resetOffset(offset);
        }
        break;
      case '[':
        if (c[1] === '[') {
          // normal link
          if (restriction.has('link')) {
            return this.parseLink();
          }
        } else {
          const offset = this.r.offset();

          const ts = restriction.has('timestamp') && this.parseTimestamp();
          if (ts) return ts;
          this.r.resetOffset(offset);

          // TODO: statistics cookie
        }

        break;
      default:
        // This is probably a plain link.
        if (restriction.has('link')) {
          return this.parseLink();
        }
    }
    return null;
  }

  // Elements parsers

  private parseHeadline(): Headline {
    const stars = this.r.advance(
      this.r.forceMatch(new RegExp(`^(\\*+)[ \\t]+`))
    );
    const level = stars[1].length;

    const todoM = this.r.advance(
      this.r.match(new RegExp('^' + this.options.todoKeywords.join('|')))
    );
    const todoKeyword = todoM?.[0] ?? null;
    this.r.advance(this.r.match(/^[ \t]*/));

    const priorityM = this.r.advance(this.r.match(/^\[#.\]/));
    const priority = priorityM?.[0][2] ?? null;
    this.r.advance(this.r.match(/^[ \t]*/));

    const commented = !!this.r.advance(this.r.match(/^COMMENT/));
    this.r.advance(this.r.match(/^[ \t]*/));

    const titleStart = this.r.offset();

    const tagsM = this.r.match(/^(.*?)[ \t]+:([\w@#%:]+):[ \t]*$/);
    const tags = tagsM?.[2].split(':') ?? [];
    const titleEnd = tagsM
      ? titleStart + tagsM.index + tagsM[1].length
      : titleStart + this.r.match(/.*/)![0].length;

    const rawValue = this.r.substring(titleStart, titleEnd);

    this.r.narrow(titleStart, titleEnd);
    const title = this.parseObjects(restrictionFor('headline'));
    this.r.widen();

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
        todoKeyword,
        priority,
        commented,
        rawValue,
        title,
        tags,
        contentsBegin,
        contentsEnd,
      },
      []
    );
  }

  private parsePlanning(): Planning {
    this.r.narrow(this.r.offset(), this.r.offset() + this.r.line().length);

    let scheduled: Timestamp | null = null;
    let deadline: Timestamp | null = null;
    let closed: Timestamp | null = null;
    while (true) {
      const m = this.r.match(
        /\b(SCHEDULED:|DEADLINE:|CLOSED:) *[\[<]([^\]>]+)[\]>]/
      );
      if (!m) break;

      this.r.advance(m.index + m[1].length);
      this.r.advance(this.r.match(/^[ \t]*/));

      const keyword = m[1];
      const time = this.parseTimestamp();
      if (keyword === 'SCHEDULED:') scheduled = time;
      if (keyword === 'DEADLINE:') deadline = time;
      if (keyword === 'CLOSED:') closed = time;
    }

    this.r.widen(true);
    this.parseEmptyLines();

    return u('planning', { scheduled, deadline, closed });
  }

  private parseSection(): Section {
    const begin = this.r.offset();
    const m = this.r.match(/^\*+[ \\t]/m);
    const end = m ? begin + m.index : this.r.endOffset();
    this.r.resetOffset(end);
    return u('section', { contentsBegin: begin, contentsEnd: end }, []);
  }

  private parseBlock<T extends string>(
    type: T,
    pattern: string
  ):
    | { type: T; contentsBegin: number; contentsEnd: number; children: never[] }
    | Paragraph {
    const endM = this.r.match(
      new RegExp(`^[ \\t]*#\\+end_${pattern}[ \\t]*$`, 'im')
    );
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

    return u(type, { contentsBegin, contentsEnd }, []);
  }

  private parseCommentBlock(): CommentBlock | Paragraph {
    const comment = this.parseBlock('comment-block', 'comment');
    if (comment.type !== 'comment-block') return comment;
    const value = this.r.substring(comment.contentsBegin, comment.contentsEnd);
    return u('comment-block', { value });
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

  private parsePropertyDrawer(): PropertyDrawer {
    this.r.advance(this.r.line());
    const contentsBegin = this.r.offset();
    const endM = this.r.forceMatch(/^[ \t]*:END:[ \t]*$/m);
    this.r.advance(endM.index);
    const contentsEnd = this.r.offset();
    this.r.advance(this.r.line());
    this.parseEmptyLines();
    return u('property-drawer', { contentsBegin, contentsEnd }, []);
  }

  private parseDrawer(): Drawer | Paragraph {
    const endM = this.r.match(/^[ \t]*:END:[ \t]*$/m);
    if (!endM) {
      console.log('incomplete drawer');
      // Incomplete drawer: parse it as a paragraph.
      return this.parseParagraph();
    }
    const contentsEnd = this.r.offset() + endM.index;

    const name = this.r.forceLookingAt(drawerRe)[1];
    this.r.advance(this.r.line());
    const contentsBegin = this.r.offset();
    this.r.resetOffset(contentsEnd);
    this.r.advance(this.r.line());
    this.parseEmptyLines();
    return u('drawer', { name, contentsBegin, contentsEnd }, []);
  }

  private parseNodeProperty(): NodeProperty {
    const propertyRe = /^[ \t]*:(?<key>\S+):(?:(?<value1>$)|[ \t]+(?<value2>.*?))[ \t]*$/m;
    const m = this.r.forceLookingAt(propertyRe)!;
    const key = m.groups!['key'];
    const value = m.groups!['value1'] ?? m.groups!['value2'];
    this.r.advance(this.r.line());
    return u('node-property', { key, value });
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

  private parseTable(): Table {
    const contentsBegin = this.r.offset();
    const tableType: 'org' | 'table.el' = this.r.lookingAt(/^[ \t]*\|/)
      ? 'org'
      : 'table.el';
    const endRe = new RegExp(
      `^[ \\t]*($|[^| \\t${tableType === 'org' ? '' : '+'}])`,
      'm'
    );
    const endM = this.r.match(endRe);
    const contentsEnd = endM ? contentsBegin + endM.index : this.r.endOffset();
    this.r.resetOffset(contentsEnd);
    let tblfm = '';
    while (true) {
      const tblfmM = this.r.lookingAt(/^[ \t]*#\+TBLFM: +(.*?)[ \t]*$/m);
      if (!tblfmM) break;
      tblfm = tblfm + tblfmM[1];
      this.r.advance(this.r.line());
    }
    this.parseEmptyLines();

    if (tableType === 'org') {
      return u('table', { tableType, tblfm, contentsBegin, contentsEnd }, []);
    } else {
      return u(
        'table',
        {
          tableType,
          tblfm,
          value: this.r.substring(contentsBegin, contentsEnd),
        },
        []
      );
    }
  }

  private parseTableRow(): TableRow {
    const rowType: 'rule' | 'standard' = this.r.lookingAt(/^[ \t]*\|-/)
      ? 'rule'
      : 'standard';
    this.r.advance(this.r.forceMatch(/\|/));
    const contentsBegin = this.r.offset();
    this.r.advance(this.r.forceMatch(/^.*?[ \t]*$/m));
    // A table rule has no contents. In that case, ensure
    // contentsBegin matches contentsEnd.
    const contentsEnd = rowType === 'rule' ? contentsBegin : this.r.offset();
    this.r.advance(this.r.line());
    return u('table-row', { rowType, contentsBegin, contentsEnd }, []);
  }

  private parseTableCell(): TableCell {
    this.r.advance(this.r.forceLookingAt(/^[ \t]*/));
    const contentsBegin = this.r.offset();
    const m = this.r.advance(this.r.forceLookingAt(/(.*?)[ \t]*(?:\||$)/m));
    const contentsEnd = contentsBegin + m[1].length;
    return u('table-cell', { contentsBegin, contentsEnd }, []);
  }

  private parseList(structure: ListStructureItem[]): List {
    const contentsBegin = this.r.offset();

    const item = structure.find((x) => x.begin === contentsBegin);
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
    const listType = item.tag
      ? 'descriptive'
      : '-+*'.includes(item.bullet[0])
      ? 'unordered'
      : 'ordered';
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
      { indent, listType, contentsBegin, contentsEnd, structure },
      []
    );
  }

  private parseItem(structure: ListStructureItem[]) {
    const offset = this.r.offset();
    const m = this.r.advance(this.r.forceMatch(fullItemRe()));
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
      {
        indent: item.indent,
        bullet,
        checkbox,
        tag: item.tag,
        contentsBegin,
        contentsEnd,
      },
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

        const fullM = this.r.forceMatch(fullItemRe());
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
      } else if (this.r.match(/^[ \t]*\n/)) {
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

  private parseUnderline(): Underline | null {
    // backoff one char to check border
    this.r.backoff(1);
    const m = this.r.lookingAt(emphRe());
    if (!m) return null;
    const contentsBegin = this.r.offset() + m.index + m[1].length + m[3].length;
    const contentsEnd = contentsBegin + m[4].length;
    this.r.resetOffset(contentsEnd + 1);
    return u('underline', { contentsBegin, contentsEnd }, []);
  }

  private parseBold(): Bold | null {
    // backoff one char to check border
    this.r.backoff(1);
    const m = this.r.lookingAt(emphRe());
    if (!m) return null;
    const contentsBegin = this.r.offset() + m.index + m[1].length + m[3].length;
    const contentsEnd = contentsBegin + m[4].length;
    this.r.resetOffset(contentsEnd + 1);
    return u('bold', { contentsBegin, contentsEnd }, []);
  }

  private parseItalic(): Italic | null {
    // backoff one char to check border
    this.r.backoff(1);
    const m = this.r.lookingAt(emphRe());
    if (!m) return null;
    const contentsBegin = this.r.offset() + m.index + m[1].length + m[3].length;
    const contentsEnd = contentsBegin + m[4].length;
    this.r.resetOffset(contentsEnd + 1);
    return u('italic', { contentsBegin, contentsEnd }, []);
  }

  private parseCode(): Code | null {
    // backoff one char to check border
    this.r.backoff(1);
    const m = this.r.lookingAt(verbatimRe());
    if (!m) return null;
    const value = m[4];
    const contentsBegin = this.r.offset() + m.index + m[1].length + m[3].length;
    const contentsEnd = contentsBegin + m[4].length;
    this.r.resetOffset(contentsEnd + 1);
    return u('code', { value }, []);
  }

  private parseVerbatim(): Verbatim | null {
    this.r.backoff(1);
    const m = this.r.lookingAt(verbatimRe());
    if (!m) return null;
    const value = m[4];
    const contentsBegin = this.r.offset() + m.index + m[1].length + m[3].length;
    const contentsEnd = contentsBegin + m[4].length;
    this.r.resetOffset(contentsEnd + 1);
    return u('verbatim', { value }, []);
  }

  private parseStrikeThrough(): StrikeThrough | null {
    // backoff one char to check border
    this.r.backoff(1);
    const m = this.r.lookingAt(emphRe());
    if (!m) return null;
    const contentsBegin = this.r.offset() + m.index + m[1].length + m[3].length;
    const contentsEnd = contentsBegin + m[4].length;
    this.r.resetOffset(contentsEnd + 1);
    return u('strike-through', { contentsBegin, contentsEnd }, []);
  }

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
          const contents: Pick<Link, 'contentsBegin' | 'contentsEnd'> = {};
          if (m.groups!.text) {
            const contentsBegin = (contents.contentsBegin =
              initialOffset + 2 + m.groups!.link.length + 2);
            contents.contentsEnd = contentsBegin + m.groups!.text.length;
          }

          const linkType = m.groups!.link.match(/(.+?):(.*)/);

          return u(
            'link',
            {
              format: 'bracket' as 'bracket',
              linkType: linkType ? linkType[1] : 'fuzzy',
              rawLink: m.groups!.link,
              path: linkType ? linkType[2] : m.groups!.link,
              ...contents,
            },
            []
          );
        }
        break;
      }

      default: {
        // plain link

        // From: https://stackoverflow.com/a/21396529
        const punctuation =
          '!-#%-\\x2A,-/:;\\x3F@\\x5B-\\x5D_\\x7B}\\u00A1\\u00A7\\u00AB\\u00B6\\u00B7\\u00BB\\u00BF\\u037E\\u0387\\u055A-\\u055F\\u0589\\u058A\\u05BE\\u05C0\\u05C3\\u05C6\\u05F3\\u05F4\\u0609\\u060A\\u060C\\u060D\\u061B\\u061E\\u061F\\u066A-\\u066D\\u06D4\\u0700-\\u070D\\u07F7-\\u07F9\\u0830-\\u083E\\u085E\\u0964\\u0965\\u0970\\u0AF0\\u0DF4\\u0E4F\\u0E5A\\u0E5B\\u0F04-\\u0F12\\u0F14\\u0F3A-\\u0F3D\\u0F85\\u0FD0-\\u0FD4\\u0FD9\\u0FDA\\u104A-\\u104F\\u10FB\\u1360-\\u1368\\u1400\\u166D\\u166E\\u169B\\u169C\\u16EB-\\u16ED\\u1735\\u1736\\u17D4-\\u17D6\\u17D8-\\u17DA\\u1800-\\u180A\\u1944\\u1945\\u1A1E\\u1A1F\\u1AA0-\\u1AA6\\u1AA8-\\u1AAD\\u1B5A-\\u1B60\\u1BFC-\\u1BFF\\u1C3B-\\u1C3F\\u1C7E\\u1C7F\\u1CC0-\\u1CC7\\u1CD3\\u2010-\\u2027\\u2030-\\u2043\\u2045-\\u2051\\u2053-\\u205E\\u207D\\u207E\\u208D\\u208E\\u2329\\u232A\\u2768-\\u2775\\u27C5\\u27C6\\u27E6-\\u27EF\\u2983-\\u2998\\u29D8-\\u29DB\\u29FC\\u29FD\\u2CF9-\\u2CFC\\u2CFE\\u2CFF\\u2D70\\u2E00-\\u2E2E\\u2E30-\\u2E3B\\u3001-\\u3003\\u3008-\\u3011\\u3014-\\u301F\\u3030\\u303D\\u30A0\\u30FB\\uA4FE\\uA4FF\\uA60D-\\uA60F\\uA673\\uA67E\\uA6F2-\\uA6F7\\uA874-\\uA877\\uA8CE\\uA8CF\\uA8F8-\\uA8FA\\uA92E\\uA92F\\uA95F\\uA9C1-\\uA9CD\\uA9DE\\uA9DF\\uAA5C-\\uAA5F\\uAADE\\uAADF\\uAAF0\\uAAF1\\uABEB\\uFD3E\\uFD3F\\uFE10-\\uFE19\\uFE30-\\uFE52\\uFE54-\\uFE61\\uFE63\\uFE68\\uFE6A\\uFE6B\\uFF01-\\uFF03\\uFF05-\\uFF0A\\uFF0C-\\uFF0F\\uFF1A\\uFF1B\\uFF1F\\uFF20\\uFF3B-\\uFF3D\\uFF3F\\uFF5B\\uFF5D\\uFF5F-\\uFF65';
        const linkPlainRe = new RegExp(
          `\\b${linkTypesRe()}:([^\\][ \\t\\n()<>]+(?:([\\w0-9_]+)|([^${punctuation} \\t\\n]|/)))`
        );
        const m = this.r.match(linkPlainRe);
        this.r.advance(m);
        if (m) {
          return u(
            'link',
            {
              format: 'plain' as 'plain',
              linkType: m[1],
              rawLink: m[0],
              path: m[2],
            },
            []
          );
        }
      }
    }
    return null;
  }

  private parseTimestamp(): Timestamp | null {
    const active =
      this.r.substring(this.r.offset(), this.r.offset() + 1) === '<';
    const m = this.r.advance(
      this.r.match(/^([<[](%%)?.*?)[\]>](?:--([<[].*?[\]>]))?/)
    );
    if (!m) return null;
    const rawValue = m[0];
    const dateStart = m[1];
    const dateEnd = m[3];
    const diary = !!m[2];

    let timeRange = null;
    if (!diary) {
      const timeM = dateStart.match(
        /[012]?[0-9]:[0-5][0-9](-([012]?[0-9]):([0-5][0-9]))/
      );
      if (timeM) {
        timeRange = { hour: Number(timeM[2]), minute: Number(timeM[3]) };
      }
    }

    const timestampType:
      | 'active'
      | 'active-range'
      | 'inactive'
      | 'inactive-range'
      | 'diary' = diary
      ? 'diary'
      : active && (dateEnd || timeRange)
      ? 'active-range'
      : active
      ? 'active'
      : dateEnd || timeRange
      ? 'inactive-range'
      : 'inactive';
    // TODO: repeater props
    // TODO: warning props

    const start = Parser.parseDate(dateStart)!;
    const end = dateEnd
      ? Parser.parseDate(dateEnd)
      : timeRange
      ? { ...start, ...timeRange }
      : null;

    return u('timestamp', {
      timestampType,
      rawValue,
      start,
      end,
    });
  }

  // Helpers

  private static parseDate(
    s: string
  ): {
    year: number;
    month: number;
    day: number;
    hour: number | null;
    minute: number | null;
  } | null {
    const m = s.match(
      /(([0-9]{4})-([0-9]{2})-([0-9]{2})( +[^\]+0-9>\r\n -]+)?( +([0-9]{1,2}):([0-9]{2}))?)/
    );
    if (!m) return null;
    return {
      year: Number(m[2]),
      month: Number(m[3]),
      day: Number(m[4]),
      hour: m[7] ? Number(m[7]) : null,
      minute: m[8] ? Number(m[8]) : null,
    };
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

  private atHeading(): boolean {
    return this.r.match(/^\*+ /) !== null;
  }
}

const drawerRe = /^[ \t]*:((?:\w|[-_])+):[ \t]*$/m;
