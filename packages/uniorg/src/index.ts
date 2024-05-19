import { Parent, Node, Literal } from 'unist';

// SPEC: The paragraph is the unit of measurement. An element defines
// syntactical parts that are at the same level as a paragraph,
// i.e. which cannot contain or be included in a paragraph. An object
// is a part that could be included in an element. Greater elements
// are all parts that can contain an element.
export interface GreaterElement extends Parent {
  contentsBegin: number;
  contentsEnd: number;
  children: Array<GreaterElementType | ElementType>;
}
export interface Element extends Parent {
  contentsBegin?: number;
  contentsEnd?: number;
  children: ObjectType[];
}
export interface RecursiveObject extends Object {
  contentsBegin?: number;
  contentsEnd?: number;
  children: ObjectType[];
}
export interface Object extends Node {}

export type GreaterElementType =
  | OrgData
  | Section
  | PropertyDrawer
  | Drawer
  | List
  | ListItem
  | QuoteBlock
  | VerseBlock
  | CenterBlock
  | SpecialBlock
  | FootnoteDefinition
  | Table;
export type ElementType =
  | Headline
  | Planning
  | NodeProperty
  | ListItemTag
  | CommentBlock
  | SrcBlock
  | ExampleBlock
  | ExportBlock
  | Keyword
  | TableRow
  | Comment
  | FixedWidth
  | Clock
  | LatexEnvironment
  | HorizontalRule
  | DiarySexp
  | Paragraph;
export type ObjectType =
  | Citation
  | CitationCommonPrefix
  | CitationCommonSuffix
  | CitationReference
  | CitationPrefix
  | CitationSuffix
  | CitationKey
  | Link
  | Bold
  | Italic
  | Code
  | Verbatim
  | StrikeThrough
  | StatisticsCookie
  | Underline
  | Superscript
  | Subscript
  | Text
  | Timestamp
  | FootnoteReference
  | LatexFragment
  | Entity
  | ExportSnippet
  | LineBreak
  | TableCell;

export type OrgNode = GreaterElementType | ElementType | ObjectType;

export interface OrgData extends GreaterElement {
  type: 'org-data';
}

export interface Section extends GreaterElement {
  type: 'section';
}

export interface Headline extends Element {
  type: 'headline';
  level: number;
  todoKeyword: string | null;
  priority: string | null;
  commented: boolean;
  rawValue: string;
  tags: string[];
}

export interface Planning extends Node {
  type: 'planning';
  closed: Timestamp | null;
  deadline: Timestamp | null;
  scheduled: Timestamp | null;
}

export interface Drawer extends GreaterElement, WithAffiliatedKeywords {
  type: 'drawer';
  name: string;
}

export interface PropertyDrawer extends GreaterElement {
  type: 'property-drawer';
  children: NodeProperty[];
}

export interface NodeProperty extends Node {
  type: 'node-property';
  key: string;
  value: string;
}

export interface HorizontalRule extends Node, WithAffiliatedKeywords {
  type: 'horizontal-rule';
}

export interface FootnoteDefinition
  extends GreaterElement,
    WithAffiliatedKeywords {
  type: 'footnote-definition';
  label: string;
}

export interface DiarySexp extends Node, WithAffiliatedKeywords {
  type: 'diary-sexp';
  /** Full Sexp */
  value: string;
}

export interface Paragraph extends Element {
  type: 'paragraph';
  contentsBegin: number;
  contentsEnd: number;
}

export interface Comment extends Node {
  type: 'comment';
  /** Comments, without pound signs. */
  value: string;
}

export interface FixedWidth extends Node, WithAffiliatedKeywords {
  type: 'fixed-width';
  /** Contents, without colos prefix. */
  value: string;
}

export interface Clock extends Node {
  type: 'clock';
  // Clock duration for a closed clock
  duration: string | null;
  status: 'closed' | 'running';
  value: Timestamp | null;
}

export interface LatexEnvironment extends Node, WithAffiliatedKeywords {
  type: 'latex-environment';
  /** LaTeX code. */
  value: string;
}

export interface LatexFragment extends Node {
  type: 'latex-fragment';
  /** LaTeX code. */
  value: string;
  /** LaTeX code without inline math delimiters. */
  contents: string;
}

export interface Entity extends Node {
  type: 'entity';
  name: string;
  useBrackets: boolean;
  latex: string;
  requireLatexMath: boolean;
  html: string;
  ascii: string;
  latin1: string;
  utf8: string;
}

export interface ExportSnippet extends Node {
  type: 'export-snippet';
  backEnd: string;
  value: string;
}

export interface LineBreak extends Node {
  type: 'line-break';
}

export interface List extends GreaterElement {
  type: 'plain-list';
  listType: 'ordered' | 'unordered' | 'descriptive';
  indent: number;
  children: ListItem[];
}

export interface ListItem extends GreaterElement {
  type: 'list-item';
  indent: number;
  bullet: string;
  counter: string | null;
  checkbox: 'on' | 'off' | 'trans' | null;
}

/** If present, must always be the first child of `ListItem`. */
export interface ListItemTag extends Element {
  type: 'list-item-tag';
}

export interface SrcBlock extends Node, WithAffiliatedKeywords {
  type: 'src-block';
  language?: string;
  value: string;
}
export interface ExampleBlock extends Node, WithAffiliatedKeywords {
  type: 'example-block';
  value: string;
}
export interface ExportBlock extends Node, WithAffiliatedKeywords {
  type: 'export-block';
  backend: string | null;
  value: string;
}
export interface QuoteBlock extends GreaterElement, WithAffiliatedKeywords {
  type: 'quote-block';
}
export interface VerseBlock extends GreaterElement, WithAffiliatedKeywords {
  type: 'verse-block';
}
export interface CenterBlock extends GreaterElement, WithAffiliatedKeywords {
  type: 'center-block';
}
export interface CommentBlock extends Node, WithAffiliatedKeywords {
  type: 'comment-block';
  value: string;
}
export interface SpecialBlock extends GreaterElement, WithAffiliatedKeywords {
  type: 'special-block';
  blockType: string;
}

export type Table = TableOrg | TableTableEl;
export interface TableOrg extends GreaterElement {
  type: 'table';
  /** Formulas associated to the table, if any. */
  tblfm: string | null;
  tableType: 'org';
  children: TableRow[];
}
export interface TableTableEl extends Node {
  type: 'table';
  /** Formulas associated to the table, if any. */
  tblfm: string | null;
  tableType: 'table.el';
  /** Raw `table.el` table. */
  value: string;
}

export interface TableRow extends Element {
  type: 'table-row';
  rowType: 'standard' | 'rule';
  children: TableCell[];
}

export interface TableCell extends RecursiveObject {
  type: 'table-cell';
}

export interface Keyword extends Node, WithAffiliatedKeywords {
  type: 'keyword';
  key: string;
  value: string;
}

export interface Text extends Object, Literal {
  type: 'text';
  value: string;
}

export interface Bold extends RecursiveObject {
  type: 'bold';
}

export interface Italic extends RecursiveObject {
  type: 'italic';
}

export interface Code extends Object {
  type: 'code';
  value: string;
}

export interface Verbatim extends Object {
  type: 'verbatim';
  value: string;
}

export interface StrikeThrough extends RecursiveObject {
  type: 'strike-through';
}

export interface StatisticsCookie extends Object {
  type: 'statistics-cookie';
  value: string;
  postBlank: number;
}

export interface Underline extends RecursiveObject {
  type: 'underline';
}

export interface Superscript extends RecursiveObject {
  type: 'superscript';
}

export interface Subscript extends RecursiveObject {
  type: 'subscript';
}

export interface Citation extends RecursiveObject {
  type: 'citation';
  style: string;
  prefix: string | null;
  suffix: string | null;
  begin: number;
  end: number;
}

export interface CitationReference extends RecursiveObject {
  type: 'citation-reference';
  key: string;
  begin: number;
  end: number;
}

export interface CitationCommonPrefix extends RecursiveObject {
  type: 'citation-common-prefix';
}
export interface CitationCommonSuffix extends RecursiveObject {
  type: 'citation-common-suffix';
}
export interface CitationPrefix extends RecursiveObject {
  type: 'citation-prefix';
}
export interface CitationSuffix extends RecursiveObject {
  type: 'citation-suffix';
}
export interface CitationKey extends Object {
  type: 'citation-key';
  key: string;
}

export interface Link extends RecursiveObject {
  type: 'link';
  format: 'plain' | 'bracket' | 'angle';
  linkType: string;
  rawLink: string;
  path: string;
}

export interface Timestamp extends Object {
  type: 'timestamp';
  timestampType:
    | 'active'
    | 'active-range'
    | 'diary'
    | 'inactive'
    | 'inactive-range';
  rawValue: string;
  start: {
    year: number;
    month: number;
    day: number;
    hour: number | null;
    minute: number | null;
  } | null;
  end: {
    year: number;
    month: number;
    day: number;
    hour: number | null;
    minute: number | null;
  } | null;
}

export interface FootnoteReference extends RecursiveObject {
  type: 'footnote-reference';
  label: string;
  footnoteType: 'inline' | 'standard';
}

type AffiliatedValue =
  | string
  | [string, string]
  | ObjectType[]
  | [ObjectType[], ObjectType[]];
export type AffiliatedKeywords = Record<
  string,
  AffiliatedValue | AffiliatedValue[]
>;
export interface WithAffiliatedKeywords {
  affiliated: AffiliatedKeywords;
}
