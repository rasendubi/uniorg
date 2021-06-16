import { OrgNode, OrgData, Headline, NodeProperty } from 'uniorg';
import visitParents from 'unist-util-visit-parents';

export function visitIds(
  tree: OrgNode,
  f: (id: string, node: OrgData | Headline) => void
) {
  visitParents(
    tree,
    { type: 'node-property', key: 'ID' },
    (property: NodeProperty, ancestors) => {
      const id = property.value;

      let parent = ancestors.pop();
      while (
        parent &&
        parent.type !== 'headline' &&
        parent.type !== 'org-data'
      ) {
        parent = ancestors.pop();
      }

      if (parent) {
        f(id, parent as OrgData | Headline);
      }
    }
  );
}
