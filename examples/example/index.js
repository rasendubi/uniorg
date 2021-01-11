var unified = require('unified');
var createStream = require('unified-stream');
var uniorgParse = require('uniorg-parse');
var uniorg2rehype = require('uniorg-rehype');
var html = require('rehype-stringify');

var processor = unified().use(uniorgParse).use(uniorg2rehype).use(html);

process.stdin.pipe(createStream(processor)).pipe(process.stdout);
