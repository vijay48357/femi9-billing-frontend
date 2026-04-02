import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 8001,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/storage': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/image': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router',
      'react-router-dom',
      'react-redux',
      '@reduxjs/toolkit',
      'axios',
      'antd',
      '@ant-design/icons',
      'moment',
      'primereact/api',
      'primereact/utils',
    ],
  },
  css: {
    devSourcemap: false,
    preprocessorOptions: {
      scss: {
        quietDeps: true,
      },
    },
  },
})
