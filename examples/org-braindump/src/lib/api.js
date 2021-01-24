import * as path from 'path';
import trough from 'trough';
import toVFile from 'to-vfile';
import findDown from 'vfile-find-down';
import rename from 'vfile-rename';
import report from 'vfile-reporter';

import orgToHtml from './orgToHtml';

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
  .use(populateBacklinks);

function collectFiles(root) {
  return new Promise((resolve, reject) => {
    findDown.all(
      (f, stats) => stats.isFile() && f.basename.endsWith('.org'),
      root,
      (err, files) => {
        if (err) {
          reject(err);
        } else {
          files.forEach((f) => {
            const slug =
              '/' + path.relative(root, f.path).replace(/\.org$/, '');
            f.data.slug = slug;
          });
          resolve(files);
        }
      }
    );
  });
}

async function processPosts(files) {
  return Promise.all(files.map(processPost));

  async function processPost(file) {
    try {
      await toVFile.read(file, 'utf8');
    } catch (e) {
      console.error('Error reading file', file, e);
      throw e;
    }

    rename(file, { path: file.data.slug });

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
      backlinks[other] = backlinks[other] || new Set();
      backlinks[other].add(file.data.slug);
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
