import unified from 'unified';
import orgParse from 'uniorg-parse';
import org2rehype from '.';
import raw from 'rehype-raw';
import format from 'rehype-format';
import html from 'rehype-stringify';

const processor = unified()
  .use(orgParse)
  .use(org2rehype)
  .use(raw)
  .use(format)
  .use(html);

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
    'does not export :noexport: headline',
    `* hello
some text
* nope :noexport:
not exported text
`
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

  hastTest(
    'description list',
    `- term1 :: description 1
- term 2 :: description 2`
  );

  hastTest('link', `https://example.com`);

  hastTest('link mixed with text', `hello http://example.com blah`);

  hastTest(
    'escape local link',
    `[[./path with "spaces".org][path with "spaces"]]`
  );

  hastTest(
    'escape local link with percent',
    `[[file:local%2Bpath%2Bwith%2Bpercents.org][local path with percents]]`
  );

  hastTest(
    'do not double-escape urls',
    `[[http://localhost:3000/path%2Bwith%2Bpercents][path with percents]]`
  );

  hastTest(
    'src block',
    `#+begin_src c
,*a = b;
printf("%d\\n", *a);
#+end_src`
  );

  hastTest(
    'verse block',
    `#+BEGIN_VERSE
 Great clouds overhead
 Tiny black birds rise and fall
 Snow covers Emacs

    ---AlexSchroeder
#+END_VERSE`
  );

  hastTest(
    'center block',
    `#+begin_center
hello
#+end_center`
  );

  hastTest(
    'comment block',
    `#+begin_comment
hello
#+end_comment`
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
    'example block',
    `#+begin_example
example
#+end_example`
  );

  hastTest(
    'export block',
    `#+begin_export
export
#+end_export`
  );

  hastTest(
    'export html block',
    `
#+begin_export html
<abbr title="World Health Organization">WHO</abbr> was founded in 1948.
#+end_export
`
  );

  hastTest(
    'export html keyword',
    `hello
#+HTML: <h1>html tag</h1>`
  );

  hastTest(
    'special block',
    `#+begin_blah
hello
#+end_blah`
  );

  hastTest(
    'html5 fancy block',
    `#+begin_aside
hello
#+end_aside`
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

  hastTest('superscript', `hello^there`);

  hastTest('subscript', `hello_there`);

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

  hastTest(
    'table',
    `
| head1  | head2 |
|--------+-------|
| value1 | value2 |
`
  );

  hastTest(
    'table without header',
    `
| value1 | value2 |
| value3 | value4 |
`
  );

  hastTest(
    'table, multiple body',
    `
| head1  | head2 |
|--------+-------|
| value1 | value2 |
| value3 | value4 |
|--------+--------|
| value5 | value6 |
`
  );

  hastTest(
    'comments',
    `hello
# comment
there`
  );

  hastTest('fixed-width', `: hello`);

  hastTest(
    'clock',
    `CLOCK: [2020-12-22 Tue 09:07]--[2020-12-22 Tue 11:10] =>  2:03`
  );

  hastTest(
    `latex environment`,
    `\\begin{hello}
some text
\\end{hello}`
  );

  hastTest('horizontal rule', `-----`);

  hastTest(
    'diary sexp',
    `%%(diary-anniversary 10 31 1948) Arthur's birthday (%d years old)`
  );

  hastTest(
    'latex-fragment',
    `If $a^2=b$ and \\( b=2 \\), then the solution must be
either $$ a=+\\sqrt{2} $$ or \\[ a=-\\sqrt{2} \\].`
  );

  hastTest('entity', `\\Agrave`);

  test('respects hProperties', () => {
    const s = unified()
      .use(orgParse)
      .use(() => (node: any) => {
        const headline = node.children[0];
        headline.data = { hProperties: { id: 'my-custom-id' } };
      })
      .use(org2rehype)
      .use(format)
      .use(html)
      .processSync(`* headline`)
      .toString();

    expect(s).toMatchInlineSnapshot(`

      <h1 id="my-custom-id">headline</h1>

    `);
  });
});
