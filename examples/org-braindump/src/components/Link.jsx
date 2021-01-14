import React from 'react';
import NextLink from 'next/link';

const MyLink = ({ href, ...props }) => {
  return (
    <NextLink href={href} passHref={true}>
      <a href={href} {...props} />
    </NextLink>
  );
};

export default MyLink;
