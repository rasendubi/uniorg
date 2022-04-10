import { Root } from 'hast';
import { Plugin, Transformer } from 'unified';
import { OrgData } from 'uniorg';
import { orgToHast, OrgToHastOptions } from './org-to-hast.js';
export type { OrgToHastOptions } from './org-to-hast.js';

type Options = Partial<OrgToHastOptions>;

const org2rehype = function org2rehype(
  options: void | Options | undefined = {}
): Transformer<OrgData, Root> {
  return (node, _file) => {
    const result = orgToHast(node, options) as Root;
    return result;
  };
} as Plugin<[Options?] | void[], OrgData, Root>;

export default org2rehype;
