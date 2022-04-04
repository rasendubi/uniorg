import { VFile } from 'vfile';
import { ParserFunction } from 'unified';

import { parse } from './parser';
import { OrgNode } from 'uniorg';

export default function orgParse(this: any) {
  const parser: ParserFunction<OrgNode> = (doc, file) => parse(file);
  this.Parser = parser;
}
