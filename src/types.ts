import { Parent, Node, Literal } from 'unist';

// SPEC: The paragraph is the unit of measurement. An element defines
// syntactical parts that are at the same level as a paragraph,
// i.e. which cannot contain or be included in a paragraph. An object
// is a part that could be included in an element. Greater elements
// are all parts that can contain an element.
export interface GreaterElement extends Parent {
  children: Array<GreaterElementType | ElementType>;
}
export interface Element extends Parent {
  children: Array<ObjectType>;
}
export interface Object extends Node {}

export type GreaterElementType = Root | Headline | Section | List | Item;
export type ElementType = Paragraph | List;
export type ObjectType = Text | Link;

export type OrgNode =
  | Root
  | Headline
  | Section
  | Paragraph
  | List
  | Item
  | Text
  | Link;

export interface Root extends GreaterElement {
  type: 'root';
  children: Array<Section | Headline>;
}

export interface Headline extends GreaterElement {
  type: 'headline';
  level: number;
  title: ObjectType[];
  children: Array<Section | Headline>;
}

export interface Section extends GreaterElement {
  type: 'section';
}

export interface Paragraph extends Parent {
  type: 'paragraph';
}

export interface List extends GreaterElement {
  type: 'plain-list';
  indent: number;
  children: Item[];
}

export interface Item extends GreaterElement {
  type: 'item';
  indent: number;
}

export interface Text extends Object, Literal {
  type: 'text';
  value: string;
}

export interface Link extends Object {
  type: 'link';
  linkType: string;
  rawLink: string;
  children: ObjectType[];
}
