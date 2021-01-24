import { VFile } from 'vfile';

import { parse } from './parser';

export default function orgParse(this: any) {
  this.Parser = (_contents: string, file: VFile) => parse(file);
}
