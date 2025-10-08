// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import preact from '@astrojs/preact';
import remarkTableOfContents from "./src/table-of-content-plugin.js";

// https://astro.build/config
export default defineConfig({
  markdown: {
    remarkPlugins: [remarkTableOfContents],
  },
  site: 'https://flyff-u-snapshot-comparisons.com',
  integrations: [mdx(), sitemap(), preact()],
});