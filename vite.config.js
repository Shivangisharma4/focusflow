import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// onnxruntime-web's .mjs files were lost to an ENOSPC error during install.
// Alias both packages to their surviving .js CJS builds so Vite can resolve
// them without hitting the broken exports → .mjs path.
const ONNX_WEB   = path.resolve(__dirname, 'node_modules/onnxruntime-web/dist/ort.all.min.js')
const ONNX_COMMON = path.resolve(
  __dirname,
  'node_modules/onnxruntime-web/node_modules/onnxruntime-common/dist/cjs/index.js'
)

export default defineConfig({
  plugins: [react()],

  server: {
    port: parseInt(process.env.PORT) || 5173,
  },

  resolve: {
    alias: {
      'onnxruntime-web':    ONNX_WEB,
      'onnxruntime-common': ONNX_COMMON,
    },
  },

  optimizeDeps: {
    // Do not pre-bundle; let Vite serve the files directly via the aliases above.
    exclude: ['@huggingface/transformers', 'onnxruntime-web', 'onnxruntime-common'],
  },

  worker: {
    format: 'es',
  },
})
