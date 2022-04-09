import { unified } from 'unified';
import uniorg from 'uniorg-parse';
import { VFile } from 'vfile';

import extractKeywords, { Options } from './';

const process = (s: string, options?: Options): VFile => {
  const processor = unified().use(uniorg).use(extractKeywords, options);

  // not interested in result
  const f = new VFile(s);
  processor.runSync(processor.parse(f), f);

  return f;
};

describe('uniorg-extract-keywords', () => {
  test('does not crash on empty document', () => {
    const document = ``;

    process(document);
  });

  test('exports title', () => {
    const document = `#+TITLE: hello, there!`;

    const f = process(document);

    const data = f.data as any;
    expect(data.title).toBe('hello, there!');
  });

  test('exports custom keyword', () => {
    const document = `#+MY_KEYWORD: blah`;

    const f = process(document);

    const data = f.data as any;
    expect(data.my_keyword).toBe('blah');
  });

  test('allows custom `name`', () => {
    const document = `#+AUTHOR: my name`;

    const f = process(document, { name: 'keywords' });

    const data = f.data as any;
    expect(data.author).toBeUndefined();
    expect(data.keywords.author).toBe('my name');
  });

  test('allows preserving case', () => {
    const document = `#+AUTHOR: my name`;

    const f = process(document, { preserveCase: true });

    const data = f.data as any;
    expect(data.AUTHOR).toBe('my name');
  });
});
