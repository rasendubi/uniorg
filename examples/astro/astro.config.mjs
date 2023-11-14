import { defineConfig } from 'astro/config';
import org from 'astro-org'

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
	site: 'https://example.com',
	integrations: [org(), sitemap()],
});
