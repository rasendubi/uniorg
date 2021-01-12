import unified from 'unified';
import uniorg from 'uniorg-parse';
import uniorg2rehype from 'uniorg-rehype';
import html from 'rehype-stringify';
import visit from 'unist-util-visit';

const processor = unified()
  .use(uniorg)
  .use(extractExportSettings)
  .use(uniorg2rehype)
  .use(html);

export default function orgToHtml(org) {
  const result = processor.processSync(org);
  return result;
}

/**
 * Extract all `#+KEYWORD`'s from org post and attach them to
 * `file.data`.
 */
function extractExportSettings() {
  return transformer;

  function transformer(node, file) {
    // Visit every keyword in the org file and copy its value to the
    // file. file is then returned from processor.process, so all
    // keywords are available outside.
    visit(node, 'keyword', function (kw) {
      file.data[kw.key.toLowerCase()] = kw.value;
    });
  }
}
