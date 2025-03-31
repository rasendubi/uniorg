import type { Root } from 'hast';
import type { Plugin } from 'unified';
import type { OrgData } from 'uniorg';

import { orgToHast, type OrgToHastOptions } from './org-to-hast.js';

export type Options = Partial<OrgToHastOptions>;

const org2rehype: Plugin<[Options?], OrgData, Root> = function org2rehype(
  options: Options = {}
) {
  return (node: OrgData, _file: unknown) => {
    return orgToHast(node, options);
  };
};

export default org2rehype;
