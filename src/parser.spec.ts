import { parse } from './parser';
import YAML from 'yaml';
import { Type } from 'yaml/util';

YAML.scalarOptions.str.defaultType = Type.QUOTE_DOUBLE;
YAML.scalarOptions.str.defaultKeyType = Type.PLAIN;

expect.addSnapshotSerializer({
  test(value) {
    try {
      YAML.stringify(value);
      return true;
    } catch (e) {
      return false;
    }
  },
  print(value) {
    return YAML.stringify(value).trimEnd();
  },
});

const itParses = (name: string, input: string) => {
  it(`parses ${name}`, () => {
    const result = parse(input);
    expect(result).toMatchSnapshot();
  });
};
itParses.only = (name: string, input: string) => {
  it.only(`parses ${name}`, () => {
    const result = parse(input);
    expect(result).toMatchSnapshot();
  });
};
itParses.skip = (name: string, input: string) => {
  it.skip(`parses ${name}`, () => {
    const result = parse(input);
    expect(result).toMatchSnapshot();
  });
};
itParses.todo = (name: string, _input?: string) => {
  it.todo(`parses ${name}`);
};

describe('org/parser', () => {
  itParses('empty document', '');

  itParses('single headline', '* Hello');

  itParses(
    'multiple headlines',
    `* Hello
* World
* blah`
  );

  itParses(
    'initial section',
    `hello
* hi`
  );

  itParses(
    'nested headlines',
    `* hi
** there
*** how
* are
*** you
`
  );

  itParses('single-line section', `hi`);

  itParses('single-item list', `- hi`);

  itParses(
    'two-item list',
    `- hi
- there`
  );

  itParses(
    'nested lists',
    `- there
  - nested
  - list`
  );

  itParses(
    'list after paragraph',
    `hello
- list`
  );

  itParses(
    'two empty lines breaking list',
    `- list1


- list 2`
  );

  itParses(
    'empty lines before first paragraph',
    `

hi`
  );

  itParses('link', `http://example.com`);

  itParses('link mixed with text', `hello http://example.com blah`);

  itParses('regular link', `[[link][text]]`);

  itParses('regular link with longer link slash', `[[longlink][text]]`);

  itParses('two links in one line', `[[link1][text1]] [[link2][text2]] `);

  itParses('link after text', `some text [[link][text]]`);

  itParses('link with no text', `[[link]]`);

  itParses(
    'quote block',
    `#+begin_quote
hello
#+end_quote`
  );

  itParses(
    'special block',
    `#+begin_blah
hello
#+end_blah`
  );

  itParses('keyword', `#+title: hi`);
});
