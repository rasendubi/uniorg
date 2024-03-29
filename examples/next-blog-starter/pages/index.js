import Container from '../components/container.js';
import MoreStories from '../components/more-stories.js';
import HeroPost from '../components/hero-post.js';
import Intro from '../components/intro.js';
import Layout from '../components/layout.js';
import { getAllPosts } from '../lib/api.js';
import Head from 'next/head';
import { CMS_NAME } from '../lib/constants.js';

export default function Index({ allPosts }) {
  const heroPost = allPosts[0];
  const morePosts = allPosts.slice(1);
  return (
    <>
      <Layout>
        <Head>
          <title>Next.js Blog Example with {CMS_NAME}</title>
        </Head>
        <Container>
          <Intro />
          {heroPost && (
            <HeroPost
              title={heroPost.title}
              coverImage={heroPost.cover_image}
              date={heroPost.date}
              author={heroPost.author}
              authorPicture={heroPost.author_picture}
              slug={heroPost.slug}
              excerpt={heroPost.excerpt}
            />
          )}
          {morePosts.length > 0 && <MoreStories posts={morePosts} />}
        </Container>
      </Layout>
    </>
  );
}

export async function getStaticProps() {
  const allPosts = getAllPosts([
    'title',
    'date',
    'slug',
    'author',
    'author_picture',
    'cover_image',
    'excerpt',
  ]);

  return {
    props: { allPosts },
  };
}
