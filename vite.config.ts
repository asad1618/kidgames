import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (id.includes('node_modules/phaser')) return 'phaser'
          return undefined
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
  },
})
