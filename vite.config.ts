// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// CRITICAL: These headers unlock SharedArrayBuffer in the browser.
// Without these, SQLite OPFS and ONNX multi-threading will instantly crash.
const crossOriginHeaders = {
"Cross-Origin-Opener-Policy": "same-origin",
"Cross-Origin-Embedder-Policy": "require-corp",
"Cross-Origin-Resource-Policy": "cross-origin"
};

export default defineConfig({
// FIX: Replaced __dirname with import.meta.dirname for Vite 8 / ESM compatibility
resolve: { alias: { "@/": path.resolve(import.meta.dirname, "./src/") } },
build: {
target: 'esnext',
assetsInlineLimit: 0,
rollupOptions: {
output: {
manualChunks(id) {
if (id.includes('react') || id.includes('framer-motion') || id.includes('gsap')) return 'react-vendor';
if (id.includes('@sqlite.org')) return 'sqlite-vendor';
if (id.includes('@huggingface')) return 'onnx-vendor';
if (id.includes('@wllama')) return 'wllama-vendor';
}
}
}
},
plugins: [
react(),
tailwindcss(),
VitePWA({
strategies: 'injectManifest',
srcDir: 'src',
filename: 'sw.ts',
registerType: 'autoUpdate',
injectManifest: { 
  maximumFileSizeToCacheInBytes: 260000000,
  globIgnores: ['**/*.gguf'] // CRITICAL: Prevent Vite from caching the model
}
})
],
assetsInclude: ['**/*.wasm', '**/*.json', '**/*.onnx'],
server: {
port: 5173,
strictPort: true,
host: 'localhost',
headers: crossOriginHeaders
},
preview: {
headers: crossOriginHeaders
},
worker: {
format: 'es'
},
optimizeDeps: {
// CRITICAL: Do not let Vite pre-bundle WASM libraries, it will corrupt the binaries
exclude: ['@huggingface/transformers', '@sqlite.org/sqlite-wasm', '@wllama/wllama'],
include: ['comlink', 'localforage']
}
});