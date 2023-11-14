import type { Parser } from 'unified';

import { parse } from './parser.js';
import type { OrgNode } from 'uniorg';

export default function orgParse(this: any) {
  const parser: Parser<OrgNode> = (_doc, file) => parse(file);
  Object.assign(this, { Parser: parser });
}
