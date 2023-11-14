import * as path from 'path';
import { trough } from 'trough';
import { read } from 'to-vfile';
import { findDownAll } from 'vfile-find-down';
import report from 'vfile-reporter';

import orgToHtml from './orgToHtml.js';
import resolveLinks from './resolveLinks.js';

// We serve posts from "public" directory, so that we don't have to
// copy assets.
//
// If you change this directory, make sure you copy all assets
// (images, linked files) to the public directory, so that next.js
// serves them.
const pagesDirectory = path.join(process.cwd(), 'public');

const processor = trough()
  .use(collectFiles)
  .use(processPosts)
  .use(resolveLinks)
  .use(populateBacklinks);

async function collectFiles(root) {
  const files = await findDownAll('.org', root);
  files.forEach((f) => {
    const slug = '/' + path.relative(root, f.path).replace(/\.org$/, '');
    f.data.slug = slug;
  });
  return files;
}

async function processPosts(files) {
  return Promise.all(files.map(processPost));

  async function processPost(file) {
    try {
      await read(file, 'utf8');
    } catch (e) {
      console.error('Error reading file', file, e);
      throw e;
    }

    file.path = file.data.slug;

    await orgToHtml(file);

    return file;
  }
}

// Assign all collected backlinks to file. This function should be
// called after all pages have been processed---otherwise, it might
// miss backlinks.
function populateBacklinks(files) {
  const backlinks = {};
  files.forEach((file) => {
    file.data.links = file.data.links || new Set();
    file.data.backlinks = backlinks[file.data.slug] =
      backlinks[file.data.slug] || new Set();

    file.data.links.forEach((other) => {
      const decodedOther = decodeURIComponent(other);
      backlinks[decodedOther] = backlinks[decodedOther] || new Set();
      backlinks[decodedOther].add(file.data.slug);
    });
  });
}

const loadPosts = async () => {
  const files = await new Promise((resolve, reject) =>
    processor.run(pagesDirectory, (err, files) => {
      console.error(report(err || files, { quiet: true }));
      if (err) reject(err);
      else resolve(files);
    })
  );
  const posts = Object.fromEntries(files.map((f) => [f.data.slug, f]));
  return posts;
};

const allPosts = async () => {
  const posts = await loadPosts();
  return posts;
};

export async function getAllPaths() {
  const posts = await loadPosts();
  return Object.keys(posts);
}

export async function getPostBySlug(slug) {
  const posts = await allPosts();
  const post = await posts[slug];
  return post;
}

export async function getAllPosts() {
  const posts = await allPosts();
  return await Promise.all(Object.values(posts));
}
