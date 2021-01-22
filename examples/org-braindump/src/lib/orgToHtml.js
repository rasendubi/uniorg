import unified from 'unified';
import visit from 'unist-util-visit';
import inspectUrls from 'rehype-url-inspector';

import orgParse from 'uniorg-parse';
import org2rehype from 'uniorg-rehype';

const processor = unified()
  .use(orgParse)
  .use(extractExportSettings)
  .use(org2rehype)
  .use(inspectUrls, { inspectEach: processUrl })
  .use(toJson);

export default async function orgToHtml(file) {
  try {
    return await processor.process(file);
  } catch (e) {
    console.error('failed to process file', file.path, e);
    throw e;
  }
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

/**
 * Process each link to:
 * 1. Convert file:// links to path used by blog. file://file.org -> /file.org
 * 2. Collect all links to file.data.links, so they can be used later
 * to calculate backlinks.
 */
function processUrl({ url: urlString, propertyName, node, file }) {
  // next/link does not handle relative urls properly. Use file.path
  // (the slug of the file) to normalize link against.
  try {
    let url = new URL(urlString, 'file://' + file.path);

    if (url.protocol === 'file:') {
      let href = url.pathname.replace(/\.org$/, '');
      node.properties[propertyName] = href;

      file.data.links = file.data.links || [];
      file.data.links.push(href);
    }
  } catch (e) {
    // This can happen if org file contains an invalid string, that
    // looks like URL string (e.g., "http://example.com:port/" passes
    // regexes, but fails to parse as URL).
    console.warn('Failed to process URL', urlString, e);
    // No re-throwing: the issue is not critical enough to stop
    // processing. The document is still valid, it's just link that
    // isn't.
  }
}

/** A primitive compiler to return node as is without stringifying. */
function toJson() {
  this.Compiler = (node) => {
    return node;
  };
}
