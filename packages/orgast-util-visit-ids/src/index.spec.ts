import { visitIds } from './';

import { parse } from 'uniorg-parse/lib/parser';

describe('orgast-util-to-string', () => {
  test('empty', () => {
    const tree = parse(``);

    const f = jest.fn();
    visitIds(tree, f);

    expect(f).not.toBeCalled();
  });

  test('top-level id', () => {
    const tree = parse(`:PROPERTIES:
:ID: hello-page
:END:

hi there`);

    const f = jest.fn();
    visitIds(tree, f);

    expect(f).toBeCalledTimes(1);
    const [id, node] = f.mock.calls[0];
    expect(id).toBe('hello-page');
    expect(node.type).toBe('org-data');
  });

  test('headline', () => {
    const tree = parse(`
* hi, there!
:PROPERTIES:
:ID: hi-there
:END:

hi there`);

    const f = jest.fn();
    visitIds(tree, f);

    expect(f).toBeCalledTimes(1);
    const [id, node] = f.mock.calls[0];
    expect(id).toBe('hi-there');
    expect(node.type).toBe('section');
    const headline = node.children[0];
    expect(headline.type).toBe('headline');
    expect(headline.level).toBe(1);
    expect(headline.rawValue).toBe('hi, there!');
  });

  test('ignores CUSTOM_ID', () => {
    const tree = parse(`:PROPERTIES:
:CUSTOM_ID: hello
:END:

* headline
:PROPERTIES:
:CUSTOM_ID: headline
:END:`);

    const f = jest.fn();
    visitIds(tree, f);

    expect(f).not.toBeCalled();
  });

  test('multiple and nested', () => {
    const tree = parse(`
:PROPERTIES:
:ID: id-org-data
:END:

* headline
:PROPERTIES:
:ID: id-headline
:END:
** headline 2
:PROPERTIES:
:ID: id-headline-2
:END:`);

    const f = jest.fn();
    visitIds(tree, f);

    expect(f).toBeCalledTimes(3);

    const [id1, node1] = f.mock.calls[0];
    expect(id1).toBe('id-org-data');
    expect(node1.type).toBe('org-data');

    const [id2, node2] = f.mock.calls[1];
    expect(id2).toBe('id-headline');
    expect(node2.type).toBe('section');
    const headline2 = node2.children[0];
    expect(headline2.type).toBe('headline');
    expect(headline2.level).toBe(1);

    const [id3, node3] = f.mock.calls[2];
    expect(id3).toBe('id-headline-2');
    expect(node3.type).toBe('section');
    const headline3 = node3.children[0];
    expect(headline3.type).toBe('headline');
    expect(headline3.level).toBe(2);
  });
});
