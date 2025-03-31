---
"orgast-util-to-string": minor
"orgast-util-visit-ids": minor
"uniorg": minor
"uniorg-attach": minor
"uniorg-extract-keywords": minor
"uniorg-parse": minor
"uniorg-rehype": minor
"uniorg-slug": minor
"uniorg-stringify": minor
---

Move public-facing type definitions from `devDependencies` to normal `dependencies` to ensure type safety for users without requiring manual installation of types.

TypeScript will now have more complete type information available, which may surface previously hidden type conflicts but leads to more accurate type checking overall.
