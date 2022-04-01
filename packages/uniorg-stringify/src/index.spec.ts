import uniorgParse from 'uniorg-parse';
import { unified } from 'unified';

import { uniorgStringify } from './index';

const processor = unified().use(uniorgParse).use(uniorgStringify);

describe('uniorg-stringify', () => {
  it('serializes uniorg', () => {
    const result = processor.processSync('* hello, world!');
    expect(String(result)).toMatchInlineSnapshot(`
      "* hello, world!
      "
    `);
  });
});
