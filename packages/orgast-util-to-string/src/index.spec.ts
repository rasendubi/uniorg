import toString from './';

import { parse } from 'uniorg-parse/lib/parser';
import { Headline, Link } from 'uniorg';

describe('orgast-util-to-string', () => {
  test('empty', () => {
    const node = parse(``);

    const s = toString(node);

    expect(s).toBe('');
  });

  test('emphasis', () => {
    const node = parse(`Some /emphasis/, *importance*, and ~code~.`);

    const s = toString(node);

    expect(s).toBe('Some emphasis, importance, and code.');
  });

  test('headline', () => {
    const document = parse(`* some text`);
    const headline = document.children[0] as Headline;
    expect(headline.type).toBe('headline');

    const s = toString(headline.title);

    expect(s).toBe('some text');
  });

  test('link', () => {
    const tree = parse(`[[https://example.com][example link]]`);

    const s = toString(tree);

    expect(s).toBe('example link');
  });
});
