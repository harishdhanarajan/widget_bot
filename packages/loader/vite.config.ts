import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Builds a single self-contained widget.js file that customers <script src=> in.
// React + ReactDOM + the chat UI are all bundled in. No external dependencies.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // React reads `process.env.NODE_ENV` to switch between dev and prod code
  // paths. Browsers have no `process` global, so we must statically replace
  // this at build time; otherwise the bundle throws ReferenceError on load.
  define: {
    'process.env.NODE_ENV': JSON.stringify(
      mode === 'production' ? 'production' : 'development',
    ),
  },
  build: {
    // Keep package builds inside the package so Vercel finds `dist` when this
    // package is configured as the project root. The root build copies this
    // folder back to ./dist for the demo and root-level static hosting.
    outDir: resolve(__dirname, 'dist'),
    lib: {
      entry: resolve(__dirname, 'src/main.tsx'),
      name: 'WidgetChatbot',
      fileName: () => 'widget.js',
      formats: ['iife'],
    },
    minify: mode === 'production' ? 'esbuild' : false,
    sourcemap: mode !== 'production',
    emptyOutDir: true,
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
}));
