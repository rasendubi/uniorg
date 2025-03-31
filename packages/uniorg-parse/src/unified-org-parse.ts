import type { Parser, Processor, Plugin } from 'unified';

import { parse } from './parser.js';
import type { OrgData } from 'uniorg';
import type { ParseOptions } from './parse-options.js';

const orgParse: Plugin<[Partial<ParseOptions>?], string, OrgData> = function orgParse(
  options: Partial<ParseOptions> = {}
): void {
  const parser: Parser<OrgData> = (_doc, file) => {
    return parse(file, options);
  };

  Object.assign(this, { Parser: parser });
}

export default orgParse;
