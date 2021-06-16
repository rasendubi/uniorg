import unified from 'unified';
import inspectUrls from 'rehype-url-inspector';

export default function resolveLinks(files) {
  // map from id -> { path, url }
  const idMap = {};
  files.forEach((file) => {
    Object.entries(file.data.ids).forEach(([id, anchor]) => {
      idMap[id] = { path: file.path, anchor };
    });
  });

  const processor = unified()
    .use(fromJson)
    .use(inspectUrls, { inspectEach: processUrl })
    .use(toJson);

  return Promise.all(files.map((file) => processor.process(file)));

  /**
   * Process each link to:
   * 1. Resolve id links.
   * 2. Convert relative file:// links to path used by
   *    blog. file://file.org -> /file.org
   * 3. Collect all links to file.data.links, so they can be used later
   *    to calculate backlinks.
   */
  function processUrl({ url: urlString, propertyName, node, file }) {
    // process id links
    if (urlString.startsWith('#')) {
      const id = urlString.slice(1);

      const target = idMap[id];
      if (target) {
        node.properties[propertyName] = target.path + target.anchor;

        file.data.links = file.data.links || [];
        file.data.links.push(target.path);
      } else {
        console.warn(`${file.path}: Unresolved id link`, urlString);
      }

      return;
    }

    try {
      // next/link does not handle relative urls properly. Use
      // file.path (the slug of the file) to normalize link against.
      let url = new URL(urlString, 'file://' + file.path);

      if (url.protocol === 'file:') {
        let href = url.pathname.replace(/\.org$/, '');
        node.properties[propertyName] = href;

        file.data.links = file.data.links || [];
        file.data.links.push(href);
      }
    } catch (e) {
      // This can happen if org file contains an invalid string, that
      // looks like URL string (e.g., "http://example.com:blah/"
      // passes regexes, but fails to parse as URL).
      console.warn(`${file.path}: Failed to process URL`, urlString, e);
      // No re-throwing: the issue is not critical enough to stop
      // processing. The document is still valid, it's just link that
      // isn't.
    }
  }
}

function fromJson() {
  this.Parser = (node, file) => {
    return file.result || JSON.parse(node);
  };
}

function toJson() {
  this.Compiler = (node) => {
    return node;
  };
}
