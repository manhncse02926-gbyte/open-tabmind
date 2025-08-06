import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { viteStaticCopy } from 'vite-plugin-static-copy'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: 'manifest.json',
          dest: '.',
        },
        {
          src: 'background.js',
          dest: '.',
        },
        {
          src: 'public/icons',
          dest: '.',
        },
      ],
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        page: resolve(__dirname, 'page.html'),
        content: resolve(__dirname, 'src/content-src/index.js'),
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === 'content') return 'content-src.js'; 
          return '[name].js';
        },
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
    assetsDir: "assets",
  },
})
