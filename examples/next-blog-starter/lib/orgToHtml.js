import unified from 'unified';
import html from 'rehype-stringify';

import uniorg from 'uniorg-parse';
import uniorg2rehype from 'uniorg-rehype';
import extractKeywords from 'uniorg-extract-keywords';

const processor = unified()
  .use(uniorg)
  .use(extractKeywords)
  .use(uniorg2rehype)
  .use(html);

export default function orgToHtml(org) {
  const result = processor.processSync(org);
  return result;
}
