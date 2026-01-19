import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    mode === 'production' && visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    exclude: ['playwright', 'playwright-core', 'chromium-bidi'],
    // Only include essential packages that need pre-bundling
    include: [
      'react',
      'react-dom',
      'react-router-dom',
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
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
        pure_funcs: mode === 'production' ? ['console.log', 'console.debug'] : [],
      },
    },
    // Code splitting strategy - simplified to avoid bundling issues
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // CRITICAL: Keep React & ReactDOM in main bundle to prevent createContext errors
          // Do NOT split React into a separate chunk - it must load first
          if (id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/scheduler/')) {
            return undefined; // Keep in main entry
          }

          // Keep react-router-dom in main entry for routing stability
          if (id.includes('react-router-dom')) {
            return undefined;
          }

          // PDF libraries - split out safely
          if (id.includes('node_modules/pdfjs-dist/')) {
            return 'pdf';
          }

          // OCR library - only for invoice scanning
          if (id.includes('node_modules/tesseract.js/')) {
            return 'ocr';
          }

          // Heavy libraries - group together to avoid circular dependencies
          if (id.includes('node_modules/recharts/') ||
              id.includes('node_modules/leaflet/') ||
              id.includes('node_modules/framer-motion/')) {
            return 'heavy-vendor';
          }

          // Query library
          if (id.includes('node_modules/@tanstack/react-query/')) {
            return 'query-vendor';
          }

          // Supabase client
          if (id.includes('node_modules/@supabase/supabase-js/')) {
            return 'supabase';
          }

          // Date handling library
          if (id.includes('node_modules/date-fns/') ||
              id.includes('node_modules/dayjs/')) {
            return 'date-utils';
          }

          // Radix UI - keep together for consistency
          if (id.includes('node_modules/@radix-ui/')) {
            return 'ui';
          }

          // Icons library
          if (id.includes('node_modules/lucide-react/')) {
            return 'icons';
          }

          // i18n library
          if (id.includes('node_modules/i18next/') ||
              id.includes('node_modules/react-i18next/')) {
            return 'i18n';
          }

          // Form validation
          if (id.includes('node_modules/react-hook-form/') ||
              id.includes('node_modules/@hookform/')) {
            return 'forms';
          }

          // Table library
          if (id.includes('node_modules/@tanstack/react-table/')) {
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
