import YAML from 'yaml';
import { Type } from 'yaml/util';

import unified from 'unified';
import orgParse from './unified-org-parse';
import org2rehype from './unified-org-rehype';
import format from 'rehype-format';
import html from 'rehype-stringify';

const processor = unified().use(orgParse).use(org2rehype).use(format).use(html);

YAML.scalarOptions.str.defaultType = Type.QUOTE_DOUBLE;
YAML.scalarOptions.str.defaultKeyType = Type.PLAIN;

expect.addSnapshotSerializer({
  test(value) {
    return typeof value === 'string';
  },
  print(value) {
    return value as string;
  },
});

const hastTest = (name: string, input: string) => {
  it(name, () => {
    const result = processor.processSync(input).contents;
    expect(result).toMatchSnapshot();
  });
};
hastTest.skip = (name: string, input: string) => {
  it.skip(name, () => {
    const result = processor.processSync(input).contents;
    expect(result).toMatchSnapshot();
  });
};
hastTest.only = (name: string, input: string) => {
  it.only(name, () => {
    const result = processor.processSync(input).contents;
    expect(result).toMatchSnapshot();
  });
};
hastTest.todo = (name: string, _input?: string) => {
  it.todo(name);
};

describe('org/org-to-hast', () => {
  hastTest('empty', ``);

  hastTest('paragraph', `hello`);

  hastTest('headline', `* hi`);

  hastTest(
    'multiple headlines',
    `* hi
** there
* hello
*** world
`
  );

  hastTest(
    'complex headline',
    `* TODO [#A] headline /italic/ title :some:tags:`
  );

  hastTest(
    'headline with sections',
    `hello
* hi
section
** hello
another section`
  );

  hastTest(
    'planning',
    `* headline
CLOSED: [2019-03-13 Wed 23:48] SCHEDULED: [2019-03-13 Wed] DEADLINE: [2019-03-14 Thu]`
  );

  hastTest(
    'property drawer',
    `* headline
:PROPERTIES:
:CREATED: [2019-03-13 Wed 23:57]
:END:`
  );

  hastTest(
    'custom drawer',
    `:MYDRAWER:
hello /there/
:END:`
  );

  hastTest('list', `- hello`);

  hastTest('ordered list', `1. one`);

  hastTest(
    'nested list',
    `
- hello
  - world
  - blah
- hi
`
  );

  hastTest('link', `https://example.com`);

  hastTest('link mixed with text', `hello http://example.com blah`);

  hastTest(
    'src block',
    `#+begin_src c
,*a = b;
printf("%d\\n", *a);
#+end_src`
  );

  hastTest(
    'remove common src block offset',
    `
  #+begin_src
    hello
      world
  #+end_src`
  );

  hastTest(
    'special block',
    `#+begin_blah
hello
#+end_blah`
  );

  hastTest(
    'blockquote',
    `#+begin_quote
hello, world!
#+end_quote`
  );

  hastTest('keywords', `#+TITLE: blah`);

  hastTest(
    'emphasis',
    `/Consider/ ~t*h*e~ *following* =example= +strike+ _under_`
  );

  hastTest('images', `[[./image.png]]`);

  describe('timestamps', () => {
    hastTest('inactive', `[2021-01-07 Thu]`);
    hastTest('inactive-range', `[2021-01-07 Thu]--[2021-01-08 Fri]`);
    hastTest('active', `<2021-01-07 Thu>`);
    hastTest('active-range', `<2021-01-07 Thu>--<2021-01-09 Sat>`);
    hastTest('with time', `[2021-01-07 Thu 19:36]`);
    hastTest('time range', `[2021-01-07 Thu 19:36-20:38]`);
    hastTest.todo('diary');
  });
});
