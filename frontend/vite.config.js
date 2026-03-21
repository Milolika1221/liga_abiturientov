import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.svg', '**/*.otf', '**/*.ttf'],
  server: {
    host: '0.0.0.0',
    port: 5173,
    headers: {
      'ngrok-skip-browser-warning': 'true'
    },
    allowedHosts: [
      'stoically-noncaloric-rowan.ngrok-free.dev',
      '.ngrok-free.dev',
      'localhost'
    ]
  }
})
