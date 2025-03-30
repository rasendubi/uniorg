import type { Parser, Processor } from 'unified';

import { parse } from './parser.js';
import type { OrgData } from 'uniorg';
import type { ParseOptions } from './parse-options.js';

export default function orgParse(this: Processor, options: Partial<ParseOptions> = {}): void {
  const parser: Parser<OrgData> = (_doc, file) => {
    return parse(file, options);
  };

  Object.assign(this, { Parser: parser });
}
