import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: 'src/popup/popup.html',
        options: 'src/options/options.html',
        background: 'src/background/background.js',
        content: 'src/content/content.js'
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') {
            return 'src/background/background.js'
          }
          if (chunkInfo.name === 'content') {
            return 'src/content/content.js'
          }
          return 'src/[name]/[name].js'
        },
        chunkFileNames: 'src/[name]/[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'src/[name]/[name].css'
          }
          return 'assets/[name].[ext]'
        }
      }
    }
  },
  
  optimizeDeps: {
    include: ['@xenova/transformers']
  },
  
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin'
    }
  }
}) 