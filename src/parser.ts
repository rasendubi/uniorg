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
  CommentBlock,
  Comment,
  FixedWidth,
  Clock,
  LatexEnvironment,
  AffiliatedKeywords,
  ExampleBlock,
  FootnoteReference,
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

    // Comments.
    if (this.r.lookingAt(/^[ \t]*#(?: |$)/m)) {
      return this.parseComment();
    }

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
      return this.parseParagraph({});
    }

    // Clock.
    if (this.r.lookingAt(/^[ \t]*CLOCK:/)) {
      return this.parseClock();
    }

    // TODO: Inlinetask.

    // From there, elements can have affiliated keywords.
    const affiliated = this.parseAffiliatedKeywords();

    // LaTeX Environment.
    if (this.r.lookingAt(latexBeginEnvironmentRe)) {
      return this.parseLatexEnvironment(affiliated);
    }

    // Drawer.
    if (this.r.lookingAt(drawerRe)) {
      return this.parseDrawer(affiliated);
    }

    // Fixed width
    if (this.r.lookingAt(/[ \t]*:( |$)/m)) {
      return this.parseFixedWidth(affiliated);
    }

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
              return this.parseBlock('center-block', 'center', affiliated);
            case 'comment':
              return this.parseCommentBlock(affiliated);
            case 'example':
              return this.parseExampleBlock(affiliated);
            case 'export':
              return this.parseExportBlock(affiliated);
            case 'quote':
              return this.parseBlock('quote-block', 'quote', affiliated);
            case 'src':
              return this.parseSrcBlock(affiliated);
            case 'verse':
              return this.parseBlock('verse-block', 'verse', affiliated);
            default:
              return this.parseSpecialBlock(affiliated);
          }
        }

        // TODO: parse babel-call
        // TODO: parse dynamic-block

        if (this.r.match(/\S+:/)) {
          this.r.resetOffset(offset);
          return this.parseKeyword(affiliated);
        }

        // fallback: parse as paragraph
        this.r.resetOffset(offset);
        return this.parseParagraph(affiliated);
      }
    }

    // Footnote Definition.
    if (this.r.lookingAt(footnoteDefinitionRe)) {
      return this.parseFootnoteDefinition(affiliated);
    }

    // Horizontal Rule.
    if (this.r.lookingAt(/^[ \t]*-{5,}[ \t]*$/)) {
      return this.parseHorizontalRule(affiliated);
    }
    // Diary Sexp.
    if (this.r.lookingAt(/^%%\(/)) {
      return this.parseDiarySexp();
    }

    // Table.
    // There is no strict definition of a table.el table. Try to
    // prevent false positive while being quick.
    const ruleRe = /[ \t]*\+(-+\+)+[ \t]*$/;
    if (this.r.lookingAt(/^[ \t]*\|/)) {
      return this.parseTable(affiliated);
    } else if (this.r.lookingAt(ruleRe)) {
      const offset = this.r.offset();
      const nextLineOffset = offset + this.r.line().length;
      const firstNonTable = this.r.match(/^[ \t]*($|[^|])/m)?.index ?? null;
      this.r.advance(firstNonTable);
      const isTable =
        this.r.offset() > nextLineOffset && this.r.lookingAt(ruleRe);
      this.r.resetOffset(offset);
      if (isTable) {
        return this.parseTable(affiliated);
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
      return this.parseList(structure, affiliated);
    }

    // Default element: Paragraph.
    return this.parseParagraph(affiliated);
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
        // Sub/superscript.
        '(?:[_^][-{(*+.,\\p{Letter}\\p{Number}])',
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
          'fn:',
          '|',
          '\\[',
          '|',
          '[0-9]{4}-[0-9]{2}-[0-9]{2}',
          '|',
          '[0-9]*(?:%|/[0-9]*)\\]',
          ')',
        ].join(''),
        // Objects starting with "@": export snippets.
        '@@',
        // Objects starting with "{": macro.
        '{{{',
        // Objects starting with "<": timestamp (active, diary),
        // target, radio target and angular links.
        `<(?:%%|<|[0-9]|${linkTypesRe()})`,
        // Objects starting with "$": latex fragment.
        '\\$',
        // Objects starting with "\": line break, entity, latex
        // fragment.
        '\\\\(?:[a-zA-Z\\[\\(]|\\\\[ \\t]*$|_ +)',
        // Objects starting with raw text: inline Babel source block,
        // inline Babel call.
        '(?:call|src)_',
      ].join('|'),
      'm'
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
      case '$':
        if (restriction.has('latex-fragment')) {
          return this.parseLatexFragment();
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
      case '\\':
        if (c[1] === '\\') {
          // TODO: line break parser
        } else {
          const offset = this.r.offset();
          const entity = null;
          // TODO: const entity = restriction.has('entity') && this.parseEntity();
          if (entity) return entity;
          this.r.resetOffset(offset);

          const fragment =
            restriction.has('latex-fragment') && this.parseLatexFragment();
          if (fragment) return fragment;
          this.r.resetOffset(offset);
        }
        break;
      case '[':
        if (c[1] === '[') {
          // normal link
          if (restriction.has('link')) {
            return this.parseLink();
          }
        } else if (c[1] === 'f') {
          if (restriction.has('footnote-reference')) {
            return this.parseFootnoteReference();
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
    pattern: string,
    affiliated: AffiliatedKeywords
  ):
    | {
        type: T;
        affiliated: AffiliatedKeywords;
        contentsBegin: number;
        contentsEnd: number;
        children: never[];
      }
    | Paragraph {
    const endM = this.r.match(
      new RegExp(`^[ \\t]*#\\+end_${pattern}[ \\t]*$`, 'im')
    );
    if (!endM) {
      // Incomplete block: parse it as a paragraph.
      return this.parseParagraph(affiliated);
    }

    const begin = this.r.offset();
    const contentsBegin = begin + this.r.line().length;
    const contentsEnd = begin + endM.index;
    this.r.resetOffset(contentsEnd);
    this.r.advance(this.r.line());
    this.parseEmptyLines();
    const _end = this.r.offset();

    return u(type, { affiliated, contentsBegin, contentsEnd }, []);
  }

  private parseComment(): Comment {
    let valueLines = [];
    while (true) {
      const m = this.r.lookingAt(/^[ \t]*# ?(.*)$/m);
      if (!m) break;
      this.r.advance(this.r.line());

      valueLines.push(m[1]);
    }
    const value = valueLines.join('\n');

    return u('comment', { value });
  }

  private parseFixedWidth(affiliated: AffiliatedKeywords): FixedWidth {
    let valueLines = [];
    while (true) {
      const m = this.r.lookingAt(/^[ \t]*: ?(.*)$/m);
      if (!m) break;
      this.r.advance(this.r.line());

      valueLines.push(m[1]);
    }
    const value = valueLines.join('\n');

    return u('fixed-width', { affiliated, value });
  }

  private parseCommentBlock(
    affiliated: AffiliatedKeywords
  ): CommentBlock | Paragraph {
    const comment = this.parseBlock('comment-block', 'comment', affiliated);
    if (comment.type !== 'comment-block') {
      // parsed as paragraph
      return comment;
    }
    const value = this.r.substring(comment.contentsBegin, comment.contentsEnd);
    return u('comment-block', { affiliated, value });
  }

  private parseSrcBlock(affiliated: AffiliatedKeywords): SrcBlock | Paragraph {
    const endM = this.r.match(/^[ \t]*#\+end_src[ \t]*$/im);
    if (!endM) {
      // Incomplete block: parse it as a paragraph.
      return this.parseParagraph(affiliated);
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

    return u('src-block', { affiliated, language, value });
  }

  private parseExampleBlock(
    affiliated: AffiliatedKeywords
  ): ExampleBlock | Paragraph {
    // TODO: parse switches
    const block = this.parseBlock('example-block', 'example', affiliated);
    if (block.type !== 'example-block') {
      // parsed as paragraph
      return block;
    }
    const value = this.r.substring(block.contentsBegin, block.contentsEnd);
    return u('example-block', { affiliated, value });
  }

  private parseExportBlock(
    affiliated: AffiliatedKeywords
  ): ExampleBlock | Paragraph {
    const endM = this.r.match(/^[ \t]*#\+end_export[ \t]*$/im);
    if (!endM) {
      // Incomplete block: parse it as a paragraph.
      return this.parseParagraph(affiliated);
    }

    const headerM = this.r.forceMatch(
      /^[ \t]*#\+begin_export(?:[ \t]+(\S+))?[ \t]*$/im
    );
    const backend = headerM[1] ?? null;

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

    return u('export-block', { affiliated, backend, value });
  }

  private parseSpecialBlock(
    affiliated: AffiliatedKeywords
  ): SpecialBlock | Paragraph {
    const blockType = this.r.match(/[ \t]*#\+begin_(\S+)/i)![1];
    const endM = this.r.match(
      // TODO: regexp-quote blockType
      new RegExp(`^[ \\t]*#\\+end_${blockType}[ \\t]*$`, 'im')
    );
    if (!endM) {
      console.log('incomplete block', blockType, this.r.rest());
      // Incomplete block: parse it as a paragraph.
      return this.parseParagraph(affiliated);
    }

    const begin = this.r.offset();
    const contentsBegin = begin + this.r.line().length;
    const contentsEnd = begin + endM.index;
    this.r.resetOffset(contentsEnd);
    this.r.advance(this.r.line());
    this.parseEmptyLines();
    const _end = this.r.offset();

    return u(
      'special-block',
      { affiliated, blockType, contentsBegin, contentsEnd },
      []
    );
  }

  private parseAffiliatedKeywords(): AffiliatedKeywords {
    const offset = this.r.offset();

    const result: AffiliatedKeywords = {};
    while (!this.r.eof()) {
      const keywordM = this.r.lookingAt(affiliatedRe);
      if (!keywordM) break;

      const rawKeyword = (
        keywordM.groups!.dualKeyword ??
        keywordM.groups!.regularKeyword ??
        keywordM.groups!.attributeKeyword
      ).toUpperCase();
      const keyword = keywordTranslationTable[rawKeyword] ?? rawKeyword;

      // true if keyword should have its value parsed
      const isParsed = parsedKeywords.has(keyword);

      this.r.advance(keywordM);
      this.r.narrow(this.r.offset(), this.r.offset() + this.r.line().length);
      const mainValue = isParsed
        ? this.parseObjects(restrictionFor('keyword'))
        : this.r.rest().trim();
      this.r.widen();
      this.r.advance(this.r.line());

      const isDual = dualKeywords.has(keyword);
      const dualValue = isDual ? keywordM.groups!.dualValue ?? null : null;

      const value = dualValue === null ? mainValue : [mainValue, dualValue];

      if (
        multipleKeywords.has(keyword) ||
        // Attributes can always appear on multiple lines.
        keyword.match(/^ATTR_/)
      ) {
        result[keyword] = result[keyword] || [];
        (result[keyword] as any[]).push(value);
      } else {
        result[keyword] = value;
      }
    }

    // If affiliated keywords are orphaned: move back to first one.
    // They will be parsed as a paragraph.
    if (this.r.lookingAt(/^[ \t]*$/m)) {
      this.r.resetOffset(offset);
      return {};
    }

    return result;
  }

  private parseKeyword(affiliated: AffiliatedKeywords): Keyword {
    const m = this.r.match(/[ \t]*#\+(\S+):(.*)/)!;
    const key = m[1].toUpperCase();
    const value = m[2].trim();
    this.r.advance(this.r.line());
    this.parseEmptyLines();
    return u('keyword', { affiliated, key, value });
  }

  private parseLatexEnvironment(
    affiliated: AffiliatedKeywords
  ): LatexEnvironment | Paragraph {
    const beginOffset = this.r.offset();
    const beginM = this.r.advance(
      this.r.forceLookingAt(latexBeginEnvironmentRe)
    );
    const name = beginM[1];
    const endM = this.r.match(latexEndEnvironmentRe(name));
    if (!endM) {
      // Incomplete latex environment: parse it as a paragraph.
      this.r.resetOffset(beginOffset);
      return this.parseParagraph(affiliated);
    }
    this.r.advance(endM);
    const endOffset = this.r.offset();
    this.parseEmptyLines();

    const value = this.r.substring(beginOffset, endOffset);

    return u('latex-environment', { affiliated, value });
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

  private parseDrawer(affiliated: AffiliatedKeywords): Drawer | Paragraph {
    const endM = this.r.match(/^[ \t]*:END:[ \t]*$/m);
    if (!endM) {
      console.log('incomplete drawer');
      // Incomplete drawer: parse it as a paragraph.
      return this.parseParagraph(affiliated);
    }
    const contentsEnd = this.r.offset() + endM.index;

    const name = this.r.forceLookingAt(drawerRe)[1];
    this.r.advance(this.r.line());
    const contentsBegin = this.r.offset();
    this.r.resetOffset(contentsEnd);
    this.r.advance(this.r.line());
    this.parseEmptyLines();
    return u('drawer', { affiliated, name, contentsBegin, contentsEnd }, []);
  }

  private parseClock(): Clock {
    this.r.advance(this.r.forceMatch(/^[ \t]*CLOCK:[ \t]*/));
    const value = this.parseTimestamp();

    this.r.advance(this.r.match(/^[ \t]+=>[ \t]*/));
    const durationM = this.r.advance(this.r.lookingAt(/^(\S+)[ \t]*$/m));
    const duration = durationM ? durationM[1] : null;

    const status: 'closed' | 'running' = duration ? 'closed' : 'running';

    this.parseEmptyLines();

    return u('clock', { value, duration, status });
  }

  private parseNodeProperty(): NodeProperty {
    const propertyRe = /^[ \t]*:(?<key>\S+):(?:(?<value1>$)|[ \t]+(?<value2>.*?))[ \t]*$/m;
    const m = this.r.forceLookingAt(propertyRe)!;
    const key = m.groups!['key'];
    const value = m.groups!['value1'] ?? m.groups!['value2'];
    this.r.advance(this.r.line());
    return u('node-property', { key, value });
  }

  private parseParagraph(affiliated: AffiliatedKeywords): Paragraph {
    const contentsBegin = this.r.offset();
    this.r.advance(this.r.line());

    let next = null;
    while ((next = this.r.match(paragraphSeparateRe()))) {
      this.r.advance(next.index);

      // A matching `paragraphSeparateRe` is not necessarily the end
      // of the paragraph. In particular, drawers, blocks or LaTeX
      // environments opening lines must be closed.  Moreover keywords
      // with a secondary value must belong to "dual keywords".

      const blockBeginM = this.r.lookingAt(/[ \t]*#\+begin_(\S+)/i);
      if (blockBeginM) {
        const blockEndM = this.r.match(
          new RegExp(`^[ \\t]*#\\+end_${blockBeginM[1]}[ \\t]*$`, 'im')
        );
        if (!blockEndM) {
          this.r.advance(this.r.line());
          continue;
        }
        break;
      }

      const drawerM = this.r.lookingAt(drawerRe);
      if (drawerM) {
        const endM = this.r.match(/^[ \t]*:END:[ \t]*$/m);
        if (!endM) {
          this.r.advance(this.r.line());
          continue;
        }
        break;
      }

      const latexEnvironmentM = this.r.lookingAt(latexBeginEnvironmentRe);
      if (latexEnvironmentM) {
        const name = latexEnvironmentM[1];
        const endM = this.r.match(latexEndEnvironmentRe(name));
        if (!endM) {
          this.r.advance(this.r.line());
          continue;
        }
        break;
      }

      const dualKeywordM = this.r.lookingAt(/[ \t]*#\+(\S+)\[.*\]:/);
      if (dualKeywordM) {
        if (!dualKeywords.has(dualKeywordM[1].toLowerCase())) {
          this.r.advance(this.r.line());
          continue;
        }
        break;
      }

      // Everything else unambigously ends paragraph.
      break;
    }

    const contentsEnd = next
      ? this.r.offset() + next.index
      : this.r.endOffset();

    this.r.resetOffset(contentsEnd);
    this.parseEmptyLines();

    return u('paragraph', { affiliated, contentsBegin, contentsEnd }, []);
  }

  private parseFootnoteDefinition(
    affiliated: AffiliatedKeywords
  ): FootnoteDefinition {
    const m = this.r.forceLookingAt(footnoteDefinitionRe);
    const label = m[1];

    const begin = this.r.offset();

    this.r.advance(this.r.line());
    const endM = this.r.match(footnoteDefinitionSeparatorRe);
    this.r.advance(endM?.index);
    let contentsEnd = endM ? this.r.offset() : this.r.endOffset();
    if (endM && endM[0][0] === '[') {
      // At a new footnote definition, make sure we end before any
      // affiliated keyword above.
      let lines = this.r.substring(begin, this.r.offset()).split('\n');
      // drop first line because this is the line definition starts,
      // drop last line because it is empty.
      lines = lines.slice(1, lines.length - 1);
      while (lines.length) {
        const line = lines.pop()!;
        if (line.match(affiliatedRe)?.index === 0) {
          // -1 to compensate for \n
          this.r.advance(-line.length - 1);
        } else {
          break;
        }
      }
      contentsEnd = this.r.offset();
    }

    this.r.narrow(begin, contentsEnd);
    this.r.advance(this.r.forceMatch(/\][ \r\t\n]/m));
    const contentsBegin = this.r.offset();
    this.r.widen();
    this.r.resetOffset(contentsEnd);
    this.parseEmptyLines();

    return u(
      'footnote-definition',
      { affiliated, label, contentsBegin, contentsEnd },
      []
    );
  }

  private parseHorizontalRule(affiliated: AffiliatedKeywords): HorizontalRule {
    this.r.advance(this.r.line());
    this.parseEmptyLines();
    return u('horizontal-rule', {});
  }

  private parseDiarySexp(affiliated: AffiliatedKeywords): DiarySexp {
    const value = this.r.forceLookingAt(/(%%\(.*)[ \t]*$/)[1];
    this.r.advance(this.r.line());
    this.parseEmptyLines();
    return u('diary-sexp', { affiliated, value });
  }

  private parseTable(affiliated: AffiliatedKeywords): Table {
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
          affiliated,
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

  private parseList(
    structure: ListStructureItem[],
    affiliated: AffiliatedKeywords
  ): List {
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
      { affiliated, indent, listType, contentsBegin, contentsEnd, structure },
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

  private parseLatexFragment(): LatexFragment | null {
    const begin = this.r.offset();
    const prefix = this.r.peek(2);
    if (prefix[0] !== '$') {
      switch (prefix[1]) {
        case '(':
          this.r.advance(this.r.match(/\)/));
          break;
        case '[':
          this.r.advance(this.r.match(/\]/));
          break;
        default: {
          // Macro.
          const m = this.r.advance(
            this.r.lookingAt(
              /^\\[a-zA-Z]+\*?((\[[^\]\[\n{}]*\])|(\{[^{}\n]*\}))*/
            )
          );
        }
      }
    } else if (prefix[1] === '$') {
      this.r.advance(this.r.match(/\$\$.*?\$\$/));
    } else {
      const charBefore = this.r.substring(this.r.offset() - 1, this.r.offset());
      if (
        charBefore !== '$' &&
        !' \t\n,.;'.includes(prefix[1]) &&
        this.r.advance(this.r.match(/\$.*?\$/)) &&
        !' \t\n,.'.includes(
          this.r.substring(this.r.offset() - 1, this.r.offset())
        ) &&
        this.r.lookingAt(
          /^(\p{Punctuation}|\p{White_Space}|\p{Open_Punctuation}|\p{Close_Punctuation}|\\"|'|$)/mu
        )
      ) {
        // we've found the end
        // ...wow
      } else {
        return null;
      }
    }
    const end = this.r.offset();
    if (begin === end) return null;

    const value = this.r.substring(begin, end);
    return u('latex-fragment', { value });
  }

  private parseFootnoteReference(): FootnoteReference | null {
    const begin = this.r.offset();
    const m = this.r.match(footnoteRe);
    if (!m) return null;

    // return true if match is found
    const advanceToClosingBracket = (): boolean => {
      while (true) {
        const m = this.r.advance(this.r.match(/[\[\]]/));
        if (!m) return false;
        if (m[0] == '[') {
          const closed = advanceToClosingBracket();
          if (!closed) return false;
        }
        return true;
      }
    };

    const closed = advanceToClosingBracket();
    if (!closed) return null;
    const end = this.r.offset();

    const contentsBegin = begin + m.index + m[0].length;
    const contentsEnd = end - 1;
    const footnoteType = m.groups!.inline ? 'inline' : 'standard';
    const label =
      footnoteType === 'inline'
        ? m.groups!.label_inline ?? null
        : m.groups!.label;
    if (footnoteType === 'inline') {
      return u(
        'footnote-reference',
        {
          label,
          footnoteType,
          contentsBegin,
          contentsEnd,
        },
        []
      );
    } else {
      return u('footnote-reference', { label, footnoteType });
    }
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
        const linkPlainRe = new RegExp(
          `\\b${linkTypesRe()}:([^\\][ \\t\\n()<>]+(?:([\\w0-9_]+)|([^\\p{Punctuation} \\t\\n]|/)))`,
          'u'
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

    const start = diary ? null : Parser.parseDate(dateStart)!;
    const end = diary
      ? null
      : dateEnd
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

const latexBeginEnvironmentRe = /^[ \t]*\\begin\{([A-Za-z0-9*]+)\}/i;
const latexEndEnvironmentRe = (name: string) =>
  new RegExp(`\\\\end\\{${name}\\}[ \\t]*$`, 'mi');

const affiliatedKeywords = [
  'CAPTION',
  'DATA',
  'HEADER',
  'HEADERS',
  'LABEL',
  'NAME',
  'PLOT',
  'RESNAME',
  'RESULT',
  'RESULTS',
  'SOURCE',
  'SRCNAME',
  'TBLNAME',
];
const dualKeywords = new Set(['RESULTS', 'CAPTION']);
const parsedKeywords = new Set(['CAPTION']);
const multipleKeywords = new Set(['CAPTION', 'HEADER']);

const keywordTranslationTable: Record<string, string> = {
  DATA: 'NAME',
  LABEL: 'NAME',
  RESNAME: 'NAME',
  SOURCE: 'NAME',
  SRCNAME: 'NAME',
  TBLNAME: 'NAME',
  RESULT: 'RESULTS',
  HEADERS: 'HEADER',
};

const affiliatedRe = new RegExp(
  [
    '[ \\t]*#\\+(?:',
    [
      // Dual affiliated keywords.
      `(?<dualKeyword>${[...dualKeywords].join(
        '|'
      )})(?:\\[(?<dualValue>.*)\\])?`,
      // Regular affiliated keywords.
      `(?<regularKeyword>${affiliatedKeywords
        .filter((x) => !dualKeywords.has(x))
        .join('|')})`,
      // Export attributes.
      `(?<attributeKeyword>ATTR_[-_A-Za-z0-9]+)`,
    ].join('|'),
    '):[ \\t]*',
  ].join(''),
  'i'
);

const footnoteRe = /\[fn:(?:(?<label_inline>[-_\w]+)?(?<inline>:)|(?<label>[-_\w]+)\])/;
const footnoteDefinitionRe = /^\[fn:([-_\w]+)\]/;
const footnoteDefinitionSeparatorRe = /^\*|^\[fn:([-_\w]+)\]|^([ \t]*\n){2,}/m;
