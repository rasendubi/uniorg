import YAML from 'yaml';

import { parse } from './parser';
import { ParseOptions } from './parse-options';

const yamlOptions = {
  defaultStringType: 'QUOTE_DOUBLE' as const,
  defaultKeyType: 'PLAIN' as const,
};

expect.addSnapshotSerializer({
  test(value) {
    try {
      YAML.stringify(value, yamlOptions);
      return true;
    } catch (e) {
      return false;
    }
  },
  print(value) {
    return YAML.stringify(value, yamlOptions).trimEnd();
  },
});

const itParses = (
  name: string,
  input: string,
  options?: Partial<ParseOptions>
) => {
  it(name, () => {
    const result = parse(input, options);
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

    itParses('custom todo keywords', '* NEXT my custom todo keyword', {
      todoKeywords: ['TODO', 'NEXT', 'DONE'],
    });

    itParses(
      'DONE from next line should not capture first headline',
      `* Headline 1

* DONE Headline 2`
    );

    describe('statistics-cookie', () => {
      itParses(
        'headline starting with fraction statistics-cookie',
        `* [1/100] Something`
      );

      itParses(
        'complex headline with empty percentage statistics-cookie',
        `* TODO [#A] [%] COMMENT headline /italic/ title :some:tags:`
      );

      itParses(
        'complex headline with empty fraction statistics-cookie',
        `* TODO [#A] [/] COMMENT headline /italic/ title :some:tags:`
      );

      itParses(
        'complex headline with defined percentage statistics-cookie',
        `* TODO [#A] [50%] COMMENT headline /italic/ title :some:tags:`
      );

      itParses(
        'complex headline with defined fraction statistics-cookie',
        `* TODO [#A] [1/2] COMMENT headline /italic/ title :some:tags:`
      );

      itParses(
        'complex headline with defined fraction statistics-cookie',
        `* TODO [#A] COMMENT headline /italic/ title :some:tags: [1/3]`
      );

      itParses('statistics cookie without trailing space', `* [/]hello`);

      itParses('statistics cookie with long trailing space', `* [/]    hello`);
    });
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

    itParses(
      'first top-level headline after list',
      `- list
* headline`
    );
  });

  itParses(
    'paragraph split by empty line',
    `a1
a2

b`
  );

  itParses('keyword', `#+title: hi`);

  itParses('fake keyword', `#+ title: hi`);

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

  describe('planning', () => {
    itParses(
      'normal planning',
      `* headline
CLOSED: [2019-03-13 Wed 23:48] SCHEDULED: [2019-03-13 Wed] DEADLINE: [2019-03-14 Thu]`
    );

    itParses(
      'fake planning',
      `* headline
CLOSED:`
    );

    itParses(
      'mixed good and fake planning',
      `* headline
CLOSED: SCHEDULED: [2021-05-31 Mon]
`
    );

    itParses(
      'paragraph after planning',
      `* headline
CLOSED: [2021-05-31 Mon]
this is paragraph`
    );

    itParses(
      'planning before property drawer',
      `* headline
CLOSED: [2021-05-31 Mon]
:PROPERTIES:
:END:
this is paragraph`
    );

    itParses(
      'fake planning after property drawer',
      `* headline
:PROPERTIES:
:END:
CLOSED: [2021-05-31 Mon]
this is paragraph`
    );

    itParses(
      'fake planning over multiple lines',
      `* headline
CLOSED: [2021-05-31 Mon]
SCHEDULED: [2021-05-31 Mon]
this is paragraph`
    );
  });

  itParses(
    'property drawer',
    `* headline
:PROPERTIES:
:CREATED: [2019-03-13 Wed 23:57]
:END:`
  );
  itParses(
    'lowercase property drawer',
    `* headline
:properties:
:created: [2019-03-13 Wed 23:57]
:end:`
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
    'file property drawer',
    `:PROPERTIES:
:ID:       01c7615e-d792-4d06-995b-19a2c046c055
:END:`
  );

  itParses(
    'custom drawer',
    `:MYDRAWER:
hello /there/
:END:`
  );

  itParses(
    'lowercase custom drawer',
    `:mydrawer:
hello /there/
:end:`
  );

  itParses(
    'incomplete drawer after paragraph',
    `
hello
:NONDRAWER:
hello`
  );

  itParses(
    'complete drawer after paragraph',
    `
hello
:DRAWER:
hello
:END:`
  );

  itParses(
    'complete lowercase drawer after paragraph',
    `
hello
:drawer:
hello
:end:`
  );

  itParses(
    'incomplete drawer',
    `:NONDRAWER:
I have no :END:`
  );

  describe('timestamps', () => {
    itParses('inactive', `[2021-01-07 Thu]`);
    itParses('inactive-range', `[2021-01-07 Thu]--[2021-01-08 Fri]`);
    itParses('active', `<2021-01-07 Thu>`);
    itParses('active-range', `<2021-01-07 Thu>--<2021-01-09 Sat>`);
    itParses('with time', `[2021-01-07 Thu 19:36]`);
    itParses('time range', `[2021-01-07 Thu 19:36-20:38]`);
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
      'description list > skips trailing spaces after tag',
      `- term    :: description`
    );

    // See https://github.com/rasendubi/uniorg/issues/15
    itParses(
      'formatting in description list tags',
      `
- [[https://example.com][Example]] :: Hello there!
- [[https://github.com][GitHub]] :: This is GitHub, your hub for Git repos.
- *Gitlab* :: Alternative to GitHub
- /Sourcehut/ :: Another alternative to GitHub that primarily uses email-based workflows.
- /Codeberg/ :: *ANOTHER ALTERNATIVE*
- /*self-hosting Git server*/ :: /*The ultimate Git solution for privacy-oriented individuals!*/
`
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

    // two empty lines finish lists but not if inside a block
    itParses(
      'long blocks in lists',
      `
- list
  #+begin_src c
  x


  y
  #+end_src
`
    );

    // two empty lines finish lists but not if inside a drawer
    itParses(
      'long drawer in list',
      `
- list
  :DRAWER:
  x


  y
  :END:
`
    );

    itParses(
      'list inside quite inside list',
      `
- list 1
  #+begin_quote
  - list 2
  #+end_quote`
    );
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

    itParses('https link', `[[https://example.com/hello]]`);

    itParses(
      'multiline description',
      `[[www.something.com][line1
line2]]`
    );
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
      'headline escaper in src block',
      `#+begin_src org
,* not a headline;
#+end_src`
    );

    itParses(
      'comma escaper in src block',
      `#+begin_src org
,,,* two commas escaped
#+end_src`
    );

    itParses(
      '#+ escaper in src block',
      `#+begin_src org
,#+ escaped
#+end_src`
    );

    itParses(
      'fake escaper',
      `#+begin_src org
,# nont escaped
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

    itParses(
      'fake block',
      `#+nonblock
#+begin_block
hello
#+end_block`
    );

    itParses(
      'fake block 2',
      `#+ begin_src
not a block
#+end_src`
    );
  });

  describe('emphasis marks', () => {
    itParses('bold', `*hello*`);

    itParses('emphasis', `/Consider/ ~t*h*e~ *following* =example= +strike+`);

    itParses('C++ accidental strike-through', `C++ blah C++`);

    itParses('emphasis boundaries', `a/a/ b*b* c~c~ d=d= e+e+ f_f_`);

    itParses('hanging /', `- hello/other`);
  });

  describe('superscript', () => {
    itParses('simple', `hello^world`);
    itParses('braces', `H^{+}`);
    itParses('nested braces', `H^{{x}}`);
    itParses('nested braces, 3 levels', `H^{hello{hi{there}}}`);
    itParses('spaces in braces', `H^{hello world}`);
    itParses('multiple nesting groups', `H^{hello{there}and{there}}`);

    describe('no superscript', () => {
      itParses('begginning of line', `^hello`);
      itParses('pre whitespace', `hello ^there`);
      itParses('post whitespace', `hello^ there`);
      itParses('unbalanced braces', `H^{{+}`);
      // replicating emacs +bugs+ limitations
      itParses('too many nested braces', `H^{hello{hi{there{hello?}}}}`);
      itParses(
        'multiple 2-level nesting groups',
        `H^{hello{there{}}and{there}}`
      );
    });
  });

  describe('subscript', () => {
    itParses('simple', `hello_world`);
    itParses('braces', `H_{+}`);
    itParses('nested braces', `H_{{x}}`);
    itParses('nested braces, 3 levels', `H_{hello{hi{there}}}`);
    itParses('spaces in braces', `H_{hello world}`);
    itParses('multiple nesting groups', `H_{hello{there}and{there}}`);

    itParses('after superscript', `H^12_22`);
    itParses('after subscript', `H_12_22`);

    itParses('trailing _', `f_f_`);

    describe('no superscript', () => {
      itParses('begginning of line', `_hello`);
      itParses('pre whitespace', `hello _there`);
      itParses('post whitespace', `hello_ there`);
      itParses('unbalanced braces', `H_{{+}`);
      // replicating emacs +bugs+ limitations
      itParses('too many nested braces', `H_{hello{hi{there{hello?}}}}`);
      itParses(
        'multiple 2-level nesting groups',
        `H_{hello{there{}}and{there}}`
      );
    });
  });

  describe('options.useSubSuperscript', () => {
    describe('= true', () => {
      itParses('parses superscript with number', 'x^2', {
        useSubSuperscripts: true,
      });
      itParses('parses subscript with number', 'x_2', {
        useSubSuperscripts: true,
      });
      itParses('parses superscript with braces', 'x^{2}', {
        useSubSuperscripts: true,
      });
      itParses('parses subscript with braces', 'x_{2}', {
        useSubSuperscripts: true,
      });
    });

    describe('= false', () => {
      itParses('ignores superscript with number', 'x^2', {
        useSubSuperscripts: false,
      });
      itParses('ignores subscript with number', 'x_2', {
        useSubSuperscripts: false,
      });
      itParses('ignores superscript with braces', 'x^{2}', {
        useSubSuperscripts: false,
      });
      itParses('ignores subscript with braces', 'x_{2}', {
        useSubSuperscripts: false,
      });
    });

    describe('= {}', () => {
      itParses('ignores superscript with number', 'x^2', {
        useSubSuperscripts: '{}',
      });
      itParses('ignores subscript with number', 'x_2', {
        useSubSuperscripts: '{}',
      });
      itParses('parses superscript with braces', 'x^{2}', {
        useSubSuperscripts: '{}',
      });
      itParses('parses subscript with braces', 'x_{2}', {
        useSubSuperscripts: '{}',
      });
    });
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

    itParses(
      'does not eat keyword',
      `# this is comment
#+title: hello`
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

    itParses(
      'environment with star',
      `
\\begin{equation*}
blah
\\end{equation*}
`
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

  itParses(
    'horizontal rule between paragraphs (#11)',
    `Hello

-----

World`
  );

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

    // note that footnote content is ": footnote", not "footnote".
    itParses('footnote definition with : following', `[fn:1]: footnote`);
  });

  itParses(
    'diary sexp',
    `%%(diary-anniversary 10 31 1948) Arthur's birthday (%d years old)`
  );

  itParses('diary sexp with newline following', `%%(diary-anniversaries)\n`);

  itParses('non-closing diary sexp', `%%(I am still a diary-sexp`);

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

  itParses(
    'multiline latex fragment',
    `$$2+
2$$`
  );

  itParses(
    'multiline latex fragment (3 lines)',
    `$$2
2
2$$`
  );

  itParses(
    'multiline latex fragment (4 lines)',
    `$$2
2
2
2$$`
  );

  itParses(
    'multiline single-$ fragment',
    `hello $2
2
2
2$ world`
  );

  itParses(
    'multiline \\[ \\] fragment',
    `\\[2
2
2
2\\]`
  );

  itParses(
    'multiline \\( \\) fragment',
    `\\(2
2
2
2\\)`
  );

  itParses(
    'fake multiline fragment',
    `hello $2
2
2
2 world`
  );

  itParses('entity', `\\Agrave`);

  itParses('entity in parentheses', `(\\leq)`);

  // See https://github.com/rasendubi/uniorg/issues/34
  itParses(
    'single asterisk',
    `text
*

more text
`
  );

  // See https://github.com/rasendubi/uniorg/issues/57
  itParses('\\_<SPC>', '\\_ a');

  describe('citations', () => {
    itParses('simple citation', '[cite:@hello]');

    itParses('multiple citation keys', '[cite:@hello;@world]');

    itParses('simple with style', `[cite/s:@hello]`);
    itParses('simple with style and variant', `[cite/s/v:@hello]`);
  });
});
