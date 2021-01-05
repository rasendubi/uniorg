import { orgToHast } from './org-to-hast';

export default function org2rehype() {
  return transformer;

  function transformer(org: any) {
    return orgToHast(org);
  }
}
