import { Root } from 'hast';
import { Node } from 'unist';
import {
  PluggableList,
  Plugin,
  Preset,
  Processor as UnifiedProcessor,
  Transformer,
} from 'unified';
import { OrgData, OrgNode } from 'uniorg';
import { orgToHast, OrgToHastOptions } from './org-to-hast';
type Processor = UnifiedProcessor<any, any, any, any>;
export type { OrgToHastOptions } from './org-to-hast';

type Options = Partial<OrgToHastOptions>;

const org2rehype = function org2rehype(
  options: void | Options | undefined = {}
): Transformer<OrgData, Root> {
  return (node, file) => {
    const result = orgToHast(node, options) as Root;
    return result;
  };
} as Plugin<[Options?] | void[], OrgData, Root>;

export default org2rehype;
