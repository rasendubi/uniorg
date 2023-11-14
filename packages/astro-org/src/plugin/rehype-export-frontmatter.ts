import type { Options } from 'acorn';
import { parse } from 'acorn';

export const rehypeExportFrontmatter = () => {
  return (tree: any, file: any) => {
    const astro = file.data.astro;

    tree.children.push(
      jsToTreeNode(
        `export const frontmatter = ${JSON.stringify(astro.frontmatter)};`
      )
    );
    tree.children.push(
      jsToTreeNode(`export const ids = ${JSON.stringify(astro.ids)}`)
    );
  };
};

function jsToTreeNode(
  jsString: string,
  acornOpts: Options = {
    ecmaVersion: 'latest',
    sourceType: 'module',
  }
) {
  return {
    type: 'mdxjsEsm',
    value: '',
    data: {
      estree: {
        ...parse(jsString, acornOpts),
        type: 'Program',
        sourceType: 'module',
      },
    },
  };
}
