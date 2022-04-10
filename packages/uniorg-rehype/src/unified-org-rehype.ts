import type { Root } from 'hast';
import type { Plugin } from 'unified';
import type { OrgData } from 'uniorg';

import { orgToHast, type OrgToHastOptions } from './org-to-hast.js';

export type Options = Partial<OrgToHastOptions>;

const org2rehype: Plugin<[Options?], OrgData, Root> = function org2rehype(
  options: Options = {}
) {
  return (node, _file) => {
    return orgToHast(node, options) as Root;
  };
};

export default org2rehype;
