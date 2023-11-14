import React from 'react';

import { unified } from 'unified';
import rehype2react from 'rehype-react';
import * as prod from 'react/jsx-runtime';

import Link from './Link.jsx';

// we use rehype-react to process hast and transform it to React
// component, which allows as replacing some of components with custom
// implementation. e.g., we can replace all <a> links to use
// `next/link`.
const processor = unified().use(rehype2react, {
  jsx: prod.jsx,
  jsxs: prod.jsxs,
  Fragment: prod.Fragment,
  // createElement: React.createElement,
  // Fragment: React.Fragment,
  components: {
    a: Link,
  },
});

const Rehype = ({ hast }) => {
  return <>{processor.stringify(hast)}</>;
};

export default Rehype;
