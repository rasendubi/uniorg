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
  it(name, () => {
    const result = parse(input);
    expect(result).toMatchSnapshot();
  });
};
itParses.only = (name: string, input: string) => {
  it.only(name, () => {
    const result = parse(input);
    expect(result).toMatchSnapshot();
  });
};
itParses.skip = (name: string, input: string) => {
  it.skip(name, () => {
    const result = parse(input);
    expect(result).toMatchSnapshot();
  });
};
itParses.todo = (name: string, _input?: string) => {
  it.todo(name);
};

describe('org/parser', () => {
  itParses('empty document', '');

  describe('headline', () => {
    itParses('single headline', '* Hello');

    itParses(
      'multiple headlines',
      `* Hello
* World
* blah`
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

    itParses(
      'complex headline',
      `* TODO [#A] COMMENT headline /italic/ title :some:tags:`
    );

    itParses(
      'complex headline + newline',
      `* TODO [#A] COMMENT headline /italic/ title :some:tags:
`
    );

    itParses(
      'DONE from next line should not capture first headline',
      `* Headline 1

* DONE Headline 2`
    );
  });

  describe('section', () => {
    itParses(
      'initial section',
      `hello
* hi`
    );

    itParses('single-line section', `hi`);

    itParses(
      'empty lines before first section',
      `

hi`
    );

    itParses(
      'section in headline',
      `* hello
this is section`
    );
  });

  itParses(
    'paragraph split by empty line',
    `a1
a2

b`
  );

  itParses('keyword', `#+title: hi`);

  itParses(
    'non-dual keyword inside paragraph',
    `hello
#+BLAH[hi]: heh
hi
`
  );
  itParses(
    'dual keyword inside paragraph',
    `hello
#+RESULTS[hi]: hello
there
`
  );

  itParses(
    'planning',
    `* headline
CLOSED: [2019-03-13 Wed 23:48] SCHEDULED: [2019-03-13 Wed] DEADLINE: [2019-03-14 Thu]`
  );

  itParses(
    'property drawer',
    `* headline
:PROPERTIES:
:CREATED: [2019-03-13 Wed 23:57]
:END:`
  );
  itParses(
    'property drawer + section',
    `* headline
:PROPERTIES:
:CREATED: [2019-03-13 Wed 23:57]
:END:
hello`
  );

  itParses(
    'custom drawer',
    `:MYDRAWER:
hello /there/
:END:`
  );

  itParses(
    'incomplete drawer after paragraph',
    `
hello
:NONDRAWER:
hello`
  );

  describe('timestamps', () => {
    itParses('inactive', `[2021-01-07 Thu]`);
    itParses('inactive-range', `[2021-01-07 Thu]--[2021-01-08 Fri]`);
    itParses('active', `<2021-01-07 Thu>`);
    itParses('active-range', `<2021-01-07 Thu>--<2021-01-09 Sat>`);
    itParses('with time', `[2021-01-07 Thu 19:36]`);
    itParses('time range', `[2021-01-07 Thu 19:36-20:38]`);
    itParses.todo('diary');
  });

  describe('list', () => {
    itParses('single-item list', `- hi`);

    itParses(
      'two-item list',
      `- hi
- there`
    );

    itParses(
      'ordered list',
      `1. one
2. two`
    );

    itParses(
      'nested lists',
      `- there
  - nested
  - list`
    );

    itParses(
      'description list',
      `- term1 :: description 1
- term 2 :: description 2`
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
      'empty line between list items',
      `- item 1

- item 2`
    );

    itParses('fake list numbers', `- 1. blah`);

    itParses('checkbox item [ ]', `- [ ] not done`);
    itParses('checkbox item [-]', `- [-] half-done`);
    itParses('checkbox item [x]', `- [x] done`);
    itParses('checkbox item [X]', `- [X] done`);
  });

  describe('links', () => {
    itParses('link', `http://example.com`);

    itParses(
      'plain link does not include trailing punctuation',
      `Example: http://example.com.`
    );

    itParses('link mixed with text', `hello http://example.com blah`);

    itParses('regular link', `[[link][text]]`);

    itParses('regular link with longer link slash', `[[longlink][text]]`);

    itParses('two links in one line', `[[link1][text1]] [[link2][text2]] `);

    itParses('link after text', `some text [[link][text]]`);

    itParses('link with no text', `[[link]]`);

    itParses('./ as start of file link', `[[./file.org]]`);

    itParses('file link with spaces', `[[./file with spaces.org]]`);

    // note that these are actual percents in the file name, not a url-encoded "file with spaces.org"
    itParses('file link with percents', `[[./file%2Bwith%2Bspaces.org]]`);

    itParses('angle link', `<http://example.com>`);
  });

  describe('blocks', () => {
    itParses(
      'src block',
      `#+begin_src
hello
#+end_src`
    );

    itParses(
      'escaper in src block',
      `#+begin_src c
,*a = 0;
#+end_src`
    );

    itParses(
      'src in list',
      `
- example:
  #+begin_src
  blah
  #+end_src`
    );

    itParses(
      'quote block',
      `#+begin_quote
hello
#+end_quote`
    );

    itParses(
      'verse block',
      `#+BEGIN_VERSE
 Great clouds overhead
 Tiny black birds rise and fall
 Snow covers Emacs

    ---AlexSchroeder
#+END_VERSE`
    );

    itParses(
      'center block',
      `#+begin_center
hello
#+end_center`
    );

    itParses(
      'comment block',
      `#+begin_comment
hello
#+end_comment`
    );

    itParses(
      'example block',
      `#+begin_example
hi
#+end_example`
    );

    itParses(
      'export block',
      `#+begin_export
hi
#+end_export`
    );

    itParses(
      'export block with backend',
      `#+begin_export html
hi
#+end_export`
    );

    itParses(
      'special block',
      `#+begin_blah
hello
#+end_blah`
    );

    itParses(
      'incomplete block after paragraph',
      `hello
#+begin_src
not a code`
    );
  });

  describe('emphasis marks', () => {
    itParses('bold', `*hello*`);

    itParses('emphasis', `/Consider/ ~t*h*e~ *following* =example= +strike+`);

    itParses('C++ accidental strike-through', `C++ blah C++`);

    itParses('emphasis boundaries', `a/a/ b*b* c~c~ d=d= e+e+ f_f_`);

    itParses('hanging /', `- hello/other`);
  });

  itParses(
    'table',
    `
| head1  | head2 |
|--------+-------|
| value1 | value2 |
`
  );
  itParses(
    'table.el table',
    `
+--------+--------+
| head1  | head2  |
+--------+--------+
| value1 | value2 |
+--------+--------+`
  );

  itParses(
    'table with format',
    `
| 1 |
| 2 |
#+TBLFM: $2=$1^2::$3=$1^3
`
  );

  describe('comments', () => {
    itParses('empty comment', `#`);
    itParses('single-line comment', `# this is comment`);
    itParses(
      'multi-line comment',
      `# first line
  # second
# third
                    # fourth`
    );
    itParses(
      'no comments in list',
      `
- # not a comment
  # comment`
    );
  });

  describe('fixed-width', () => {
    itParses('empty fixed-width', `:`);
    itParses('single-line fixed-width', `: hello`);
    itParses(
      'multi-line fixed-width',
      `: hello
:   world`
    );
  });

  describe('clock', () => {
    itParses('clock in progress', `CLOCK: [2021-01-10 Sun 14:36]`);
    itParses(
      'finished clock',
      `CLOCK: [2020-12-22 Tue 09:07]--[2020-12-22 Tue 11:10] =>  2:03`
    );
  });

  describe('latex environment', () => {
    itParses(
      'multi-line',
      `\\begin{hello}
some text
\\end{hello}`
    );

    itParses(
      'latex environment after paragraph',
      `hello
\\begin{hello} there \\end{hello}`
    );

    itParses(
      'incomplete latex environment after paragraph',
      `hello
\\begin{hello}
I am incomplete`
    );

    itParses(
      'incomplete latex environment after paragraph (two lines)',
      `hello
there
\\begin{hello}
I am incomplete`
    );
  });

  describe('affiliated keyword', () => {
    itParses(
      'name',
      `#+NAME: source
#+begin_src org
some paragraph
#+end_src`
    );

    itParses(
      'parsed keywords',
      `#+CAPTION: hello *world*
paragraph`
    );

    itParses(
      'multiple keywords',
      `#+NAME: name
#+CAPTION: hi
paragraph`
    );

    itParses(
      'multiple same keywords',
      `
#+NAME: name1
#+NAME: name2
#+CAPTION: caption1
#+CAPTION: caption2
paragraph`
    );

    itParses(
      'keyword renaming',
      `#+srcname: hi
#+begin_src
#+end_src
`
    );

    itParses(
      'dual keywords',
      `
#+RESULTS[A]:
: Hello, world!`
    );
  });

  itParses('horizontal rule', `-----`);

  describe('footnote definition', () => {
    itParses(
      'simple',
      `
[fn:hello] this is footnote definition
`
    );
    itParses(
      'paragraph split',
      `
[fn:hello] hello


next paragraph`
    );
    itParses(
      'starting on next line',
      `
[fn:hello]
footnote
`
    );
    itParses(
      'sequential',
      `
[fn:hello] footnote1
[fn:2] footnote2
`
    );
    itParses(
      'sequential with affiliated keywords',
      `
#+NAME: f1
[fn:hello] footnote1
#+NAME: f2
[fn:2] footnote2
`
    );

    itParses(
      'footnote definition splits paragraph',
      `hello
[fn:1] hello`
    );
  });

  itParses(
    'diary sexp',
    `%%(diary-anniversary 10 31 1948) Arthur's birthday (%d years old)`
  );

  describe('footnote-reference', () => {
    itParses('standard reference', `hello[fn:1]`);
    itParses(
      'inline reference',
      `hello[fn:: this is inline /footnote/ definition]`
    );
    itParses(
      'named inline reference',
      `hello[fn:name: this is inline /footnote/ definition]`
    );
  });

  itParses(
    'latex-fragment',
    `If $a^2=b$ and \\( b=2 \\), then the solution must be
either $$ a=+\\sqrt{2} $$ or \\[ a=-\\sqrt{2} \\].`
  );

  itParses('entity', `\\Agrave`);
});
