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
  | Headline
  | PropertyDrawer
  | Section
  | Drawer
  | List
  | Item
  | QuoteBlock
  | SpecialBlock
  | Table;
export type ElementType =
  | Planning
  | NodeProperty
  | SrcBlock
  | Keyword
  | TableRow
  | Paragraph;
export type ObjectType =
  | Link
  | Bold
  | Italic
  | Code
  | Verbatim
  | StrikeThrough
  | Underline
  | Text
  | Timestamp
  | TableCell;

export type OrgNode = GreaterElementType | ElementType | ObjectType;

export interface OrgData extends GreaterElement {
  type: 'org-data';
  children: Array<Section | Headline>;
}

export interface Headline extends GreaterElement {
  type: 'headline';
  level: number;
  todoKeyword: string | null;
  priority: string | null;
  commented: boolean;
  rawValue: string;
  title: ObjectType[];
  tags: string[];
  children: Array<Section | Headline>;
}

export interface Planning extends Node {
  type: 'planning';
  closed: Timestamp | null;
  deadline: Timestamp | null;
  scheduled: Timestamp | null;
}

export interface Drawer extends GreaterElement {
  type: 'drawer';
  name: string;
}

export interface PropertyDrawer extends GreaterElement {
  type: 'property-drawer';
}

export interface NodeProperty extends Node {
  type: 'node-property';
  key: string;
  value: string;
}

export interface Section extends GreaterElement {
  type: 'section';
}

export interface Paragraph extends Parent {
  type: 'paragraph';
}

export interface List extends GreaterElement {
  type: 'plain-list';
  listType: 'ordered' | 'unordered' | 'descriptive';
  indent: number;
  children: Item[];
  structure: ListStructureItem[];
}

export type ListStructureItem = {
  begin: number;
  indent: number;
  bullet: string;
  counter: string | null;
  checkbox: string | null;
  tag: string | null;
  end: number;
};

export interface Item extends GreaterElement {
  type: 'item';
  indent: number;
  tag: string | null;
}

export interface SrcBlock extends Node {
  type: 'src-block';
  language?: string;
  value: string;
}

export interface QuoteBlock extends GreaterElement {
  type: 'quote-block';
}

export interface SpecialBlock extends GreaterElement {
  type: 'special-block';
  blockType: string;
}

export type Table = TableOrg | TableTableEl;
export interface TableOrg extends GreaterElement {
  type: 'table';
  /** Formulas associated to the table, if any. */
  tblfm: string | null;
  tableType: 'org';
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
}

export interface TableCell extends RecursiveObject {
  type: 'table-cell';
}

export interface Keyword extends Node {
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

export interface Underline extends RecursiveObject {
  type: 'underline';
}

export interface Link extends RecursiveObject {
  type: 'link';
  format: 'plain' | 'bracket';
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
  };
  end: {
    year: number;
    month: number;
    day: number;
    hour: number | null;
    minute: number | null;
  } | null;
}
