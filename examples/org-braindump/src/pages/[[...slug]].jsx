import { join } from 'path';
import Head from 'next/head';

import { getAllPaths, getPostBySlug } from '../lib/api.js';

import Link from '../components/Link.jsx';
import Rehype from '../components/Rehype.jsx';

const Note = ({ title, hast, backlinks }) => {
  return (
    <main>
      <Head>
        <title>{title}</title>
      </Head>
      <h1>{title}</h1>
      <Rehype hast={hast} />
      {!!backlinks.length && (
        <section>
          <h2>{'Backlinks'}</h2>
          <ul>
            {backlinks.map((b) => (
              <li key={b.path}>
                <Link href={b.path}>{b.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
};
export default Note;

export const getStaticPaths = async () => {
  const paths = await getAllPaths();
  // add '/' which is synonymous to '/index'
  paths.push('/');

  return {
    paths,
    fallback: false,
  };
};

export const getStaticProps = async ({ params }) => {
  const path = '/' + join(...(params.slug || ['index']));
  const post = await getPostBySlug(path);
  const data = post.data;
  const backlinks = await Promise.all([...data.backlinks].map(getPostBySlug));
  return {
    props: {
      title: data.title || post.basename,
      hast: post.result,
      backlinks: backlinks.map((b) => ({
        path: b.path,
        title: b.data.title || b.basename,
      })),
    },
  };
};
