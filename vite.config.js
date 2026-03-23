import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { ttsProxyPlugin } from './server/ttsProxy.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), ttsProxyPlugin()],
})
