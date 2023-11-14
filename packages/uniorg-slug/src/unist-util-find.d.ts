declare module 'unist-util-find' {
  import { Node } from 'unist';

  export const find: (node: Node, condition: any) => Node | undefined;
}
