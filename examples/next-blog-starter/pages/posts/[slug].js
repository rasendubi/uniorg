import { useRouter } from 'next/router';
import ErrorPage from 'next/error';
import Container from '../../components/container.js';
import PostBody from '../../components/post-body.js';
import Header from '../../components/header.js';
import PostHeader from '../../components/post-header.js';
import Layout from '../../components/layout.js';
import { getPostBySlug, getAllPosts } from '../../lib/api.js';
import PostTitle from '../../components/post-title.js';
import Head from 'next/head';
import { CMS_NAME } from '../../lib/constants.js';

export default function Post({ post, morePosts, preview }) {
  const router = useRouter();
  if (!router.isFallback && !post?.slug) {
    return <ErrorPage statusCode={404} />;
  }
  return (
    <Layout preview={preview}>
      <Container>
        <Header />
        {router.isFallback ? (
          <PostTitle>Loading…</PostTitle>
        ) : (
          <>
            <article className="mb-32">
              <Head>
                <title>
                  {post.title} | Next.js Blog Example with {CMS_NAME}
                </title>
                <meta property="og:image" content={post.og_image} />
              </Head>
              <PostHeader
                title={post.title}
                coverImage={post.cover_image}
                date={post.date}
                author={post.author}
                authorPicture={post.author_picture}
              />
              <PostBody content={post.content} />
            </article>
          </>
        )}
      </Container>
    </Layout>
  );
}

export async function getStaticProps({ params }) {
  const post = getPostBySlug(params.slug, [
    'title',
    'date',
    'slug',
    'author',
    'author_picture',
    'og_image',
    'cover_image',
    'content',
  ]);

  return {
    props: {
      post,
    },
  };
}

export async function getStaticPaths() {
  const posts = getAllPosts(['slug']);

  return {
    paths: posts.map((post) => {
      return {
        params: {
          slug: post.slug,
        },
      };
    }),
    fallback: false,
  };
}
