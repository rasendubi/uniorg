import { unified } from 'unified';
import uniorg from 'uniorg-parse';

import YAML from 'yaml';
import { Type } from 'yaml/util';

import uniorgAttach, { idTsFolderFormat, Options } from './';

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

const process = (s: string, options?: Partial<Options>) => {
  const processor = unified()
    .use(uniorg)
    .use(uniorgAttach, options)
    .use(function (this: any) {
      this.Compiler = (x: any) => x;
    });

  return processor.processSync(s).result;
};

const attachmentTest = (s: string, options?: Partial<Options>) => {
  expect(process(s, options)).toMatchSnapshot();
};

describe('uniorg-attach', () => {
  test('leaves non-attachment links as is', () => {
    attachmentTest(`[[file:./file.org][Other file]] https://example.com`);
  });

  describe('without ID or DIR set', () => {
    // All links should resolve relative to current directory

    test('top-level', () => {
      attachmentTest(`[[attachment:hello.org]]`);
    });

    test('inside headline', () => {
      attachmentTest(`* headline
[[attachment:hello.org]]`);
    });

    test('inside headline even if parent headline has an id', () => {
      attachmentTest(`* headline
:PROPERTIES:
:ID: hello
:END:
** nested headline
[[attachment:hello.org]]`);
    });

    test('inside headline even if document has an id', () => {
      attachmentTest(`:PROPERTIES:
:ID: hello
:END:
* headline
[[attachment:hello.org]]`);
    });
  });

  describe('with DIR set', () => {
    test('on top level', () => {
      attachmentTest(`:PROPERTIES:
:DIR: ./attachments
:END:

attachment:hello.jpg`);
    });

    test('on top level (absolute path)', () => {
      attachmentTest(`:PROPERTIES:
:DIR:     /home/user/attachment
:END:

attachment:hello.jpg`);
    });

    test('on top level (absolute link)', () => {
      attachmentTest(`:PROPERTIES:
:DIR:     /home/user/attachment
:END:

attachment:/home/user2/hello.jpg`);
    });

    test('DIR has higher precedence than ID', () => {
      attachmentTest(`:PROPERTIES:
:ID:  hello-id
:DIR:  /directory
:END:
attachment:attach.png`);
    });
  });

  describe('with ID set', () => {
    test('on top level', () => {
      attachmentTest(`:PROPERTIES:
:ID:   ead7b7db-8aac-4b1f-893f-9e7f5ca6ea2c
:END:
attachment:hello.txt
`);
    });
  });

  describe('options', () => {
    describe('idDir', () => {
      test('idDir overrides default id directory', () => {
        attachmentTest(
          `:PROPERTIES:
:ID:   ead7b7db-8aac-4b1f-893f-9e7f5ca6ea2c
:END:
attachment:hello.txt
`,
          {
            idDir: 'attachments',
          }
        );
      });

      test('idDir as absolute directory', () => {
        attachmentTest(
          `:PROPERTIES:
:ID:   ead7b7db-8aac-4b1f-893f-9e7f5ca6ea2c
:END:
attachment:hello.txt
`,
          {
            idDir: '/home/user/data',
          }
        );
      });
    });

    describe('useInheritance', () => {
      test('useInheritance allows looking up DIR', () => {
        attachmentTest(
          `:PROPERTIES:
:DIR:  attach
:END:
* Headline
attachment:text.txt
`,
          { useInheritance: true }
        );
      });
      test('useInheritance allows looking up ID', () => {
        attachmentTest(
          `:PROPERTIES:
:ID:   ead7b7db-8aac-4b1f-893f-9e7f5ca6ea2c
:END:
* Headline
attachment:text.txt
`,
          { useInheritance: true }
        );
      });
      test('DIR takes precedence even it it’s defined higher up', () => {
        attachmentTest(
          `:PROPERTIES:
:DIR:  attach
:END:
* Headline
:PROPERTIES:
:ID:   ead7b7db-8aac-4b1f-893f-9e7f5ca6ea2c
:END:
attachment:text.txt
`,
          { useInheritance: true }
        );
      });
    });

    describe('idToPath', () => {
      test('idTsFolderFormat is better suited for timestamp ids', () => {
        attachmentTest(
          `:PROPERTIES:
:ID:  20210922T144052.487159
:END:
attachment:file.txt
`,
          { idToPath: idTsFolderFormat }
        );
      });
    });
  });
});
