import { orgToHast, OrgToHastOptions } from './org-to-hast';

export type { OrgToHastOptions } from './org-to-hast';

export default function org2rehype(options?: Partial<OrgToHastOptions>) {
  return transformer;

  function transformer(org: any) {
    return orgToHast(org, options);
  }
}
