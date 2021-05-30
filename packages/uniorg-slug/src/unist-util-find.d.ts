declare module 'unist-util-find' {
  import { Node } from 'unist';

  const find: (node: Node, condition: any) => Node | undefined;

  export = find;
}
