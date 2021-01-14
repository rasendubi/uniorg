import * as path from 'path';
import toVFile from 'to-vfile';
import findDown from 'vfile-find-down';
import rename from 'vfile-rename';

import orgToHtml from './orgToHtml';

// We serve posts from "public" directory, so that we don't have to
// copy assets.
//
// If you change this directory, make sure you copy all assets
// (images, linked files) to the public directory, so that next.js
// serves them.
const pagesDirectory = path.join(process.cwd(), 'public');

const getFiles = (root) =>
  new Promise((resolve, reject) => {
    findDown.all('.org', root, (err, files) => {
      if (err) {
        reject(err);
      } else {
        files.forEach((f) => {
          const slug = '/' + path.relative(root, f.path).replace(/\.org$/, '');
          f.data.slug = slug;
        });
        resolve(files);
      }
    });
  });

const backlinks = {};
const processPost = async (file) => {
  await toVFile.read(file, 'utf8');

  rename(file, { path: file.data.slug });

  file.data.links = [];
  await orgToHtml(file);

  file.data.links.forEach((other) => {
    backlinks[other] = backlinks[other] || new Set();
    backlinks[other].add(file.data.slug);
  });

  return file;
};
// Assign all collected backlinks to file. This function should be
// called after all pages have been processed---otherwise, it might
// miss backlinks.
const populateBacklinks = async (file) => {
  const links = backlinks[file.data.slug] ?? new Set();
  file.data.backlinks = [...links];
};

const loadPosts = async () => {
  const files = await getFiles(pagesDirectory);
  const posts = Object.fromEntries(
    files.map((f) => [f.data.slug, processPost(f)])
  );
  return posts;
};

const allPosts = async () => {
  const posts = await loadPosts();
  const allPosts = await Promise.all(Object.values(posts));
  allPosts.forEach(populateBacklinks);
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
