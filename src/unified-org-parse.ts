import { parse } from './parser';

export default function orgParse(this: any) {
  this.Parser = parse;
}
