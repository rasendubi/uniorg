import { unified } from 'unified';
import { stream } from 'unified-stream';
import uniorgParse from 'uniorg-parse';
import uniorg2rehype from 'uniorg-rehype';
import html from 'rehype-stringify';

var processor = unified().use(uniorgParse).use(uniorg2rehype).use(html);

process.stdin.pipe(stream(processor)).pipe(process.stdout);
