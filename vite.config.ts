import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
      },
    },
  },
  plugins: [
    {
      name: 'copy-static-assets',
      closeBundle() {
        const filesToCopy = ['data.json', 'bbs.json', 'join.json', 'minigame.js', 'robots.txt'];
        for (const file of filesToCopy) {
          if (fs.existsSync(file)) {
            fs.copyFileSync(file, resolve(__dirname, 'dist', file));
          }
        }
        if (fs.existsSync('local')) {
          fs.cpSync('local', resolve(__dirname, 'dist/local'), { recursive: true });
        }
      },
    },
  ],
});
