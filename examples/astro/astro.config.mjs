import { defineConfig } from 'astro/config';
import org from 'astro-org';
import rehypeShiftHeading from 'rehype-shift-heading';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
	site: 'https://example.com',
	integrations: [
		org({
			rehypePlugins: [[rehypeShiftHeading, { shift: 1 }]],
		}),
		sitemap(),
	],
});
