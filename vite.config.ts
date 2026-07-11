import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => ({
  cacheDir: 'node_modules/.vite-fleetify-clean',
  server: {
    host: "localhost",
    port: 8080,
    // Fix HMR issues with React hooks and WebSocket connection
    hmr: {
      overlay: true,
      // Remove explicit host/port — let Vite auto-derive from server config
      // Explicit port=8080 causes WebSocket 400 errors when query params present
    },
    // Prevent hanging on page refresh
    middlewareMode: false,
    // Better handling of file changes
    watch: {
      usePolling: false,
      interval: 100,
    },
  },
  plugins: [
    command === 'build' && react(),
    mode === 'development' && componentTagger(),
    mode === 'production' && visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ].filter(Boolean),
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      // CRITICAL: Force single React instance to prevent "useState is null" errors
      { find: /^react$/, replacement: path.resolve(__dirname, './node_modules/react/index.js') },
      { find: /^react\/jsx-runtime$/, replacement: path.resolve(__dirname, './node_modules/react/jsx-runtime.js') },
      { find: /^react\/jsx-dev-runtime$/, replacement: path.resolve(__dirname, './node_modules/react/jsx-dev-runtime.js') },
      { find: /^react-dom$/, replacement: path.resolve(__dirname, './node_modules/react-dom/index.js') },
      { find: /^react-dom\/client$/, replacement: path.resolve(__dirname, './node_modules/react-dom/client.js') },
    ],
    dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
  },
  optimizeDeps: {
    force: true,
    exclude: [
      'playwright',
      'playwright-core',
      'chromium-bidi',
    ],
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'react-router-dom',
      '@tanstack/react-query',
    ],
  },
  build: {
    // Performance optimizations
    target: 'esnext',
    minify: 'terser',
    // Web Worker configuration - bundle as separate files
    worker: {
      format: 'es',
      plugins: [],
    },
    terserOptions: {
      compress: {
        drop_console: ['log', 'debug', 'info'], // Drop console.log/debug/info in production, keep error/warn
        drop_debugger: mode === 'production',
        pure_funcs: mode === 'production' ? ['console.log', 'console.debug', 'console.info'] : [],
      },
    },
    // Code splitting strategy - simplified to avoid bundling issues
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          const normalizedId = id.replace(/\\/g, '/');
          // CRITICAL: Keep React & ReactDOM in main bundle to prevent createContext errors
          // Do NOT split React into a separate chunk - it must load first
          if (normalizedId.includes('node_modules/react/') ||
              normalizedId.includes('node_modules/react-dom/') ||
              normalizedId.includes('node_modules/scheduler/')) {
            return undefined; // Keep in main entry
          }

          // Keep react-router-dom in main entry for routing stability
          if (normalizedId.includes('react-router-dom')) {
            return undefined;
          }

          // PDF libraries - split out safely
          if (normalizedId.includes('node_modules/pdfjs-dist/')) {
            return 'pdf';
          }

          // OCR library - only for invoice scanning
          if (normalizedId.includes('node_modules/tesseract.js/')) {
            return 'ocr';
          }

          // Heavy libraries - group together to avoid circular dependencies
          if (normalizedId.includes('node_modules/recharts/') ||
              normalizedId.includes('node_modules/leaflet/') ||
              normalizedId.includes('node_modules/framer-motion/')) {
            return 'heavy-vendor';
          }

          // Query library
          if (normalizedId.includes('node_modules/@tanstack/react-query/')) {
            return 'query-vendor';
          }

          // Supabase client
          if (normalizedId.includes('node_modules/@supabase/supabase-js/')) {
            return 'supabase';
          }

          // Date handling library
          if (normalizedId.includes('node_modules/date-fns/') ||
              normalizedId.includes('node_modules/dayjs/')) {
            return 'date-utils';
          }

          // Document generation libraries
          if (normalizedId.includes('node_modules/docx/') ||
              normalizedId.includes('node_modules/file-saver/')) {
            return 'document-utils';
          }

          // Radix UI - keep together for consistency
          if (normalizedId.includes('node_modules/@radix-ui/')) {
            return 'ui';
          }

          // Icons library
          if (normalizedId.includes('node_modules/lucide-react/')) {
            return 'icons';
          }

          // i18n library
          if (normalizedId.includes('node_modules/i18next/') ||
              normalizedId.includes('node_modules/react-i18next/')) {
            return 'i18n';
          }

          // Form validation
          if (normalizedId.includes('node_modules/react-hook-form/') ||
              normalizedId.includes('node_modules/@hookform/')) {
            return 'forms';
          }

          // Table library
          if (normalizedId.includes('node_modules/@tanstack/react-table/')) {
            return 'tables';
          }
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
      onwarn(warning, warn) {
        if (warning.code === 'CIRCULAR_DEPENDENCY') return;
        if (warning.code === 'EVAL') return;
        warn(warning);
      },
    },
    // Chunk size warnings
    chunkSizeWarningLimit: 500,
    // CSS code splitting
    cssCodeSplit: true,
    // Sourcemaps
    sourcemap: mode === 'development' ? 'inline' : false,
  },
  // Preview server configuration
  preview: {
    port: 8080,
    host: true,
  },
}));
