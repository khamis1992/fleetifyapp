import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  cacheDir: 'node_modules/.vite-lovable',
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
    conditions: ['browser', 'development', 'module']
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'lucide-react'
    ],
    needsInterop: ['react', 'react-dom'],
    force: true,
    esbuildOptions: {
      target: 'es2020',
      mainFields: ['module', 'browser', 'main'],
      conditions: ['browser', 'development', 'module']
    }
  },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true
    },
    target: 'es2020'
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode)
  }
}));