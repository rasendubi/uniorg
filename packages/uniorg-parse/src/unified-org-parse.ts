import type { ParserFunction } from 'unified';

import { parse } from './parser.js';
import type { OrgNode } from 'uniorg';

export default function orgParse(this: any) {
  const parser: ParserFunction<OrgNode> = (_doc, file) => parse(file);
  Object.assign(this, { Parser: parser });
}
