import fs from 'fs';
import { join } from 'path';
import orgToHtml from './orgToHtml.js';

const postsDirectory = join(process.cwd(), '_posts');

export function getPostSlugs() {
  return fs.readdirSync(postsDirectory);
}

export function getPostBySlug(slug, fields = []) {
  const realSlug = slug.replace(/\.org$/, '');
  const fullPath = join(postsDirectory, `${realSlug}.org`);
  const content = fs.readFileSync(fullPath, 'utf8');
  const org = orgToHtml(content);

  const items = {};

  // Ensure only the minimal needed data is exposed
  fields.forEach((field) => {
    if (field === 'slug') {
      items[field] = realSlug;
    }
    if (field === 'content') {
      items[field] = String(org);
    }
    if (org.data[field]) {
      items[field] = org.data[field];
    }
  });

  return items;
}

export function getAllPosts(fields = []) {
  const slugs = getPostSlugs();
  const posts = slugs
    .map((slug) => getPostBySlug(slug, fields))
    // sort posts by date in descending order
    .sort((post1, post2) => (post1.date > post2.date ? '-1' : '1'));
  return posts;
}
