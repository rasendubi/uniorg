import { unified } from 'unified';
import { readSync } from 'to-vfile';
import uniorgParse from 'uniorg-parse';
import { extractKeywords } from 'uniorg-extract-keywords';
import uniorg2rehype from 'uniorg-rehype';
import html from 'rehype-stringify';

unified()
  .use(uniorgParse)
  .use(extractKeywords)
  .use(uniorg2rehype)
  .use(html)
  .process(readSync('example.org'), function (err, file) {
    console.log(file.toString());
    console.log(file.data);
  });
