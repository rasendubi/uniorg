import { Node } from 'unist';
import find from 'unist-util-find';
import unified from 'unified';
import uniorg from 'uniorg-parse';
import vfile from 'vfile';
import uniorg2rehype from 'uniorg-rehype';
import html from 'rehype-stringify';

import { uniorgSlug, Options } from './';

const process = (s: string, options?: Options): Node => {
  const processor = unified().use(uniorg).use(uniorgSlug, options);

  const f = vfile(s);

  return processor.runSync(processor.parse(f), f);
};

describe('uniorg-extract-keywords', () => {
  test('does not crash on empty document', () => {
    const document = ``;

    process(document);
  });

  test('simple header', () => {
    const document = `* some headline`;

    const n = process(document);

    const h: any = find(n, { type: 'headline' });

    expect(h.data.hProperties.id).toBe('some-headline');
  });

  test('header with formatting', () => {
    const document = `* some /emphasis/ and [[https://example.com][link]]`;

    const n = process(document);

    const h: any = find(n, { type: 'headline' });

    expect(h.data.hProperties.id).toBe('some-emphasis-and-link');
  });

  test('respects CUSTOM_ID', () => {
    const document = `* headline
:PROPERTIES:
:CUSTOM_ID: blah
:END:`;

    const n = process(document);

    const h: any = find(n, { type: 'headline' });

    expect(h.data.hProperties.id).toBe('blah');
  });

  test('with uniorg-rehype', () => {
    const processor = unified()
      .use(uniorg)
      .use(uniorgSlug)
      .use(uniorg2rehype)
      .use(html);

    const s = processor
      .processSync(
        `* headline
** nested headline
:PROPERTIES:
:CUSTOM_ID: blah
:END:
** headline
:PROPERTIES:
:ID: my-id
:END:
~id~ property is ignored.`
      )
      .toString();

    expect(s).toMatchInlineSnapshot(
      `"<div><h1 id=\\"headline\\">headline</h1><h2 id=\\"blah\\">nested headline</h2><h2 id=\\"headline-1\\">headline</h2><p><code class=\\"inline-code\\">id</code> property is ignored.</p></div>"`
    );
  });
});
