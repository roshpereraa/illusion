import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { partials } from './src/markup.js';

// Bakes shared markup (header, footer, project grids) into each page at build/dev time,
// so the first paint is complete and nothing shifts when scripts run.
const bakePartials = () => ({
  name: 'illusion-partials',
  transformIndexHtml(html) {
    return html.replace(/<!--@([\w:]+)-->/g, (m, key) => {
      if (!partials[key]) throw new Error(`Unknown partial: ${key}`);
      return partials[key]();
    });
  },
});

export default defineConfig({
  plugins: [bakePartials()],
  server: { watch: { ignored: ['**/.claude/**'] } },
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        about: resolve(import.meta.dirname, 'about.html'),
        projects: resolve(import.meta.dirname, 'projects.html'),
      },
    },
  },
});
