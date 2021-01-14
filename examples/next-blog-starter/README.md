# A statically generated blog example using Next.js and Org

This example showcases Next.js's [Static Generation](https://nextjs.org/docs/basic-features/pages) feature using Org files as the data source.

The blog posts are stored in `/_posts` as Org files. Adding a new Org file in there will create a new blog post.

To create the blog posts we use [`uniorg`](https://github.com/rasendubi/uniorg) and [`rehype-stringify`][rehype-stringify] to convert the Org files into an HTML string, and then send it down as a prop to the page. The metadata of every post is handled by `extractExportSettings` unified plugin in [orgToHtml.js](./lib/orgToHtml.js) file.

[rehype-stringify]: https://github.com/rehypejs/rehype/tree/main/packages/rehype-stringify

## Demo

[https://org-blog-starter.vercel.app/](https://org-blog-starter.vercel.app/)

## Deploy your own

Deploy the example using [Vercel](https://vercel.com):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/git/external?repository-url=https://github.com/rasendubi/uniorg/tree/master/examples/next-blog-starter&project-name=org-blog-starter&repository-name=org-blog-starter)

## How to use

Execute [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app) with [npm](https://docs.npmjs.com/cli/init) or [Yarn](https://yarnpkg.com/lang/en/docs/cli/create/) to bootstrap the example:

```bash
npx create-next-app --example https://github.com/rasendubi/uniorg/tree/master/examples/next-blog-starter blog-starter-app
# or
yarn create next-app --example https://github.com/rasendubi/uniorg/tree/master/examples/next-blog-starter blog-starter-app
```

Your blog should be up and running on [http://localhost:3000](http://localhost:3000)! If it doesn't work, post on [GitHub discussions](https://github.com/rasendubi/uniorg/discussions).

Deploy it to the cloud with [Vercel](https://vercel.com/new) ([Documentation](https://nextjs.org/docs/deployment)).

# Notes

This blog-starter uses [Tailwind CSS](https://tailwindcss.com). To control the generated stylesheet's filesize, this example uses Tailwind CSS' v2.0 [`purge` option](https://tailwindcss.com/docs/controlling-file-size/#removing-unused-css) to remove unused CSS.
