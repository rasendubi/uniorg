import { parse } from 'uniorg-parse/lib/parser';

import { StringifyOptions, stringify } from './stringify';

const process = (input: string, options: Partial<StringifyOptions>) => {
  return stringify(parse(input), options);
};

const test = (
  name: string,
  input: string,
  options: Partial<StringifyOptions> = {}
) => {
  it(name, () => {
    const result = process(input, options);
    expect(result).toMatchSnapshot();
  });
  it(name + ' (second pass)', () => {
    const result1 = process(input, options);
    const result2 = process(result1, options);
    expect(result2).toEqual(result1);
  });
};
test.skip = (
  name: string,
  input: string,
  options: Partial<StringifyOptions> = {}
) => {
  it.skip(name, () => {
    const result = process(input, options);
    expect(result).toMatchSnapshot();
  });
  it.skip(name + ' (second pass)', () => {
    const result1 = process(input, options);
    const result2 = process(result1, options);
    expect(result2).toEqual(result1);
  });
};
test.only = (
  name: string,
  input: string,
  options: Partial<StringifyOptions> = {}
) => {
  it.only(name, () => {
    const result = process(input, options);
    expect(result).toMatchSnapshot();
  });
  it.only(name + ' (second pass)', () => {
    const result1 = process(input, options);
    const result2 = process(result1, options);
    expect(result2).toEqual(result1);
  });
};

describe('stringify', () => {
  test('empty input', '');

  test('paragraph', 'hello, world!');
  test(
    'two paragraphs',
    `first paragraph

second paragraph`
  );

  describe('headline', () => {
    test('simple headline', '* Hello');
    test(
      'complex headline',
      `* TODO [#A] COMMENT headline /italic/ title :some:tags:`
    );
    test(
      'nested headline',
      `* level 1
** level 2

* level 1
*** level 3`
    );
    test(
      'nested simple headlines separated by new-lines',
      `* level 1

** level 2

*** level 3

**** level 4`,
      {
        handlers: {
          headline: (org, options) => {
            const components = [
              '*'.repeat(org.level),
              stringify(org.children, options),
            ].filter((x) => x !== null);
            return `${components.join(' ')}\n\n`;
          },
        },
      }
    );

    test('statistics cookie', `* [115%]  headline`);
  });

  test(
    'planning',
    `* headline
CLOSED: [2019-03-13 Wed 23:48] SCHEDULED: [2019-03-13 Wed] DEADLINE: [2019-03-14 Thu]`
  );
  test(
    'mixed good and fake planning',
    `* headline
CLOSED: SCHEDULED: [2021-05-31 Mon]
`
  );

  test(
    'property drawer',
    `* headline
:PROPERTIES:
:CREATED: [2019-03-13 Wed 23:57]
:END:`
  );
  test(
    'property drawer forced to lower-case',
    `* headline
:PROPERTIES:
:CREATED: [2019-03-13 Wed 23:57]
:END:`,
    {
      handlers: {
        'property-drawer': (org, options) => {
          return (
            [
              ':properties:\n',
              ...org.children.map((c) => stringify(c, options)),
              ':end:',
            ].join('') + `\n`
          );
        },
        'node-property': (org) => {
          return [':', org.key.toLowerCase(), ': ', org.value].join('') + '\n';
        },
      },
    }
  );
  test(
    'file property drawer',
    `:PROPERTIES:
:ID:       01c7615e-d792-4d06-995b-19a2c046c055
:END:`
  );

  test(
    'custom drawer',
    `:MYDRAWER:
hello /there/
:END:`
  );

  describe('list', () => {
    test('single-item list', `- hi`);
    test(
      'ordered list',
      `1. one
2. two`
    );
    test(
      'nested lists',
      `- there
  - nested
  - list`
    );
    test(
      'description list',
      `- term1 :: description 1
- term 2 :: description 2`
    );
    test(
      'maintains indentation in list',
      `
- list item 1
  more nesting
  - list 1.1
    :DRAWER:
    hello
    :END:
    more text
  - list 1.2

    still in 1.2`
    );

    test('checkbox list', `- [ ] hello`);
  });

  describe('links', () => {
    test('link', `http://example.com`);

    test('regular link', `[[link][text]]`);

    test('link with no text', `[[link]]`);

    test('file link with spaces', `[[./file with spaces.org]]`);

    // note that these are actual percents in the file name, not a url-encoded "file with spaces.org"
    test('file link with percents', `[[./file%2Bwith%2Bspaces.org]]`);

    test('angle link', `<http://example.com>`);

    test('https link', `[[https://example.com/hello]]`);

    test(
      'multiline description',
      `[[www.something.com][line1
line2]]`
    );
  });

  describe('blocks', () => {
    test(
      'src block',
      `#+begin_src
hello
#+end_src`
    );

    test(
      'escaper in src block',
      `#+begin_src c
,*a = 0;
#+end_src`
    );

    test(
      'headline escaper in src block',
      `#+begin_src org
,* not a headline;
#+end_src`
    );

    test(
      'comma escaper in src block',
      `#+begin_src org
,,,* two commas escaped
#+end_src`
    );

    test(
      '#+ escaper in src block',
      `#+begin_src org
,#+ escaped
#+end_src`
    );

    test(
      'fake escaper',
      `#+begin_src org
,# nont escaped
#+end_src`
    );

    test(
      'src in list',
      `
- example:
  #+begin_src
  blah
  #+end_src`
    );

    test(
      'quote block',
      `#+begin_quote
hello
#+end_quote`
    );

    test(
      'verse block',
      `#+BEGIN_VERSE
 Great clouds overhead
 Tiny black birds rise and fall
 Snow covers Emacs

    ---AlexSchroeder
#+END_VERSE`
    );

    test(
      'center block',
      `#+begin_center
hello
#+end_center`
    );

    test(
      'comment block',
      `#+begin_comment
hello
#+end_comment`
    );

    test(
      'example block',
      `#+begin_example
hi
#+end_example`
    );

    test(
      'export block',
      `#+begin_export
hi
#+end_export`
    );

    test(
      'export block with backend',
      `#+begin_export html
hi
#+end_export`
    );

    test(
      'special block',
      `#+begin_blah
hello
#+end_blah`
    );
  });

  describe('timestamps', () => {
    test('inactive', `[2021-01-07 Thu]`);
    test('inactive-range', `[2021-01-07 Thu]--[2021-01-08 Fri]`);
    test('active', `<2021-01-07 Thu>`);
    test('active-range', `<2021-01-07 Thu>--<2021-01-09 Sat>`);
    test('with time', `[2021-01-07 Thu 19:36]`);
    test('time range', `[2021-01-07 Thu 19:36-20:38]`);
  });

  describe('keyword', () => {
    test('keyword', `#+title: hi`);
    test(
      'multiple keywords',
      `
#+title: hi
#+author: me`
    );
    test(
      'dual keyword',
      `#+RESULTS[hi]: hello
there`
    );
    test(
      'multiple affiliated keywords',
      `
#+name: name
#+caption: caption
paragraph
`
    );
  });

  test('horizontal rule', `------`);

  describe('footnotes', () => {
    test(
      'footnote definition',
      `[fn:hello] this is footnote definition
`
    );
    test(
      'starting on next line',
      `
[fn:hello]
footnote
`
    );
    test(
      'sequential',
      `
[fn:hello] footnote1
[fn:2] footnote2
`
    );

    // note that footnote content is ": footnote", not "footnote".
    test('footnote definition with : following', `[fn:1]: footnote`);

    test('standard reference', `hello[fn:1]`);
    test(
      'inline reference',
      `hello[fn:: this is inline /footnote/ definition]`
    );
    test(
      'named inline reference',
      `hello[fn:name: this is inline /footnote/ definition]`
    );
  });

  test(
    'diary sexp',
    `%%(diary-anniversary 10 31 1948) Arthur's birthday (%d years old)`
  );

  describe('emphasis marks', () => {
    test('bold', '*hello*');
    test('bold with custom char', '*hello*', {
      handlers: {
        bold: (org, options) => {
          return `$${stringify(org.children, options)}$`;
        },
      },
    });
    test('emphasis', `/Consider/ ~t*h*e~ *following* =example= +strike+`);
    test('underline', `_hello_`);
  });

  describe('superscript', () => {
    test('simple', 'hello^world');
    test('with braces', `H^{+}`);
    test('nested braces', `H^{{x}}`);
  });
  describe('subscript', () => {
    test('simple', 'hello_world');
    test('with braces', `H_{+}`);
    test('nested braces', `H_{{x}}`);
  });

  test(
    'latex-fragment',
    `If $a^2=b$ and \\( b=2 \\), then the solution must be
either $$ a=+\\sqrt{2} $$ or \\[ a=-\\sqrt{2} \\].`
  );

  test('entity', `\\Aggrave`);

  test(
    'table',
    `
| head1  | head2 |
|--------+-------|
| value1 | value2 |
`
  );
  test(
    'table.el table',
    `
+--------+--------+
| head1  | head2  |
+--------+--------+
| value1 | value2 |
+--------+--------+`
  );

  test(
    'table with format',
    `
| 1 |
| 2 |
#+TBLFM: $2=$1^2::$3=$1^3
`
  );

  test('single-line comment', `# this is comment`);
  test(
    'multi-line comment',
    `# first line
  # second
# third
                    # fourth`
  );

  test(
    'multi-line fixed-width',
    `: hello
:   world`
  );

  describe('clock', () => {
    test('clock in progress', `CLOCK: [2021-01-10 Sun 14:36]`);
    test(
      'finished clock',
      `CLOCK: [2020-12-22 Tue 09:07]--[2020-12-22 Tue 11:10] =>  2:03`
    );
  });

  test(
    'multi-line latex environment',
    `\\begin{hello}
some text
\\end{hello}`
  );

  test(
    'citation',
    `[cite/style:common prefix; prefix @key suffix; @key2; common suffix]`
  );
});
