import { ParserFunction } from 'unified';

import { parse } from './parser';
import { OrgNode } from 'uniorg';

export default function orgParse(this: any) {
  const parser: ParserFunction<OrgNode> = (doc, file) => parse(file);
  Object.assign(this, { Parser: parser });
}
