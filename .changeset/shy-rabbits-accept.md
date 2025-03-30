---
'rollup-plugin-orgx': major
'astro-org': major
'@uniorgjs/orgx': major
---

Move uniorg-parse and uniorg-rehype into peer dependencies.

This is done to give you precise control over your versions of uniorg-parse and uniorg-rehype, so you can account for any quirks or specific needs.

This shall also allow us to maintain core uniorg packages and integrations independently, so you will be able to use newer integration packages with having to upgrade the parser or vice versa.

This is a breaking change because you now need to explicitly install uniorg-parse and uniorg-rehype as dependencies in your projects. Previously, these were included as direct dependencies of the packages.
