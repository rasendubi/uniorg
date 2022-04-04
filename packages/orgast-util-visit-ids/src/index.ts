import { OrgNode, OrgData, Section, NodeProperty } from 'uniorg';
import { visitParents } from 'unist-util-visit-parents';

export function visitIds(
  tree: OrgNode,
  f: (id: string, node: OrgData | Section) => void
) {
  // This issue does not seem fixed
  // 👀https://github.com/syntax-tree/unist-util-visit/issues/33
  // @ts-ignore Incessantly deep type instantiation
  visitParents(
    tree,
    { type: 'node-property', key: 'ID' },
    (property: NodeProperty, ancestors) => {
      const id = property.value;

      let parent = ancestors.pop();
      while (
        parent &&
        parent.type !== 'section' &&
        parent.type !== 'org-data'
      ) {
        parent = ancestors.pop();
      }

      if (parent) {
        f(id, parent as OrgData | Section);
      }
    }
  );
}
