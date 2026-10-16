import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Dùng path tương đối cho asset khi build production để file dist/index.html
  // có thể mở trực tiếp qua file:// (cần cho bản đóng gói Electron desktop).
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    open: false,
    // Bỏ watch các thư mục build/đóng gói để tránh crash dev server
    // khi Inno Setup / electron-builder tạo file tạm trong release/.
    watch: {
      ignored: ['**/release/**', '**/dist/**'],
    },
    proxy: {

      '/gemini-proxy': {
        target: 'https://generativelanguage.googleapis.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/gemini-proxy/, ''),
      },
      '/api-proxy/aivideoauto': {
        target: 'https://api.aivideoauto.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api-proxy\/aivideoauto/, ''),
      },
      '/api-proxy/gommo': {
        target: 'https://api.gommo.net',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api-proxy\/gommo/, ''),
      },
      // Proxy cho RunningHub và các nhà cung cấp API tương thích chuẩn OpenAI
      // để né lỗi CORS khi gọi trực tiếp từ localhost trong lúc dev.
      '/runninghub-proxy': {
        target: 'https://www.runninghub.ai',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/runninghub-proxy/, ''),
      },
      '/openai-proxy': {
        target: 'https://api.laozhang.ai',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/openai-proxy/, ''),
      }
    }
  },
});





