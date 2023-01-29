import { VFile } from 'vfile';
import { createFilter } from 'rollup-pluginutils';
import type { CompileOptions } from '@uniorgjs/orgx';
import { compile } from '@uniorgjs/orgx';

export interface OrgPluginOptions extends CompileOptions {
  include?: string | RegExp | Array<string | RegExp>;
  exclude?: string | RegExp | Array<string | RegExp>;
}

export default ({ include, exclude, ...options }: OrgPluginOptions = {}) => {
  const filter = createFilter(include, exclude);

  return {
    name: 'rollup-plugin-orgx',
    transform: async (value: string, path: string) => {
      const file = new VFile({ value, path });
      if (file.extname === '.org' && filter(file.path)) {
        const compiled = await compile(file, options);
        return { code: String(compiled.value), map: compiled.map };
      }
    },
  };
};
