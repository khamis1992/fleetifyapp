import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from 'rollup-plugin-visualizer';
import compression from 'vite-plugin-compression';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      port: 8080,
      host: "localhost"
    }
  },
  plugins: [
    react(),
    ...(mode === 'development' ? [componentTagger()] : []),
    ...(process.env.ANALYZE ? [visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
      filename: './dist/stats.html',
      template: 'treemap',
    })] : []),
    // Compression for production builds
    ...(mode === 'production' ? [
      compression({
        algorithm: 'gzip',
        ext: '.gz',
        threshold: 1024,
      }),
      compression({
        algorithm: 'brotliCompress',
        ext: '.br',
        threshold: 1024,
      }),
    ] : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Ensure single React instance
      'react': path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
    },
    dedupe: ['react', 'react-dom'],
    conditions: ['module', 'import', 'browser', 'default'],
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      '@supabase/supabase-js',
      '@tanstack/react-query',
      'framer-motion',
      'recharts'
    ],
    exclude: [
      'lucide-react',
      '@radix-ui/react-separator',
      '@radix-ui/react-collapsible'
    ],
    force: true,
    esbuildOptions: {
      target: 'es2020',
      mainFields: ['module', 'browser', 'main'],
    },
  },
  build: {
    target: 'es2020',
    minify: 'terser',
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    // Terser options for better minification
    terserOptions: {
      compress: {
        drop_console: false, // Keep console for logger functionality
        drop_debugger: true,
        pure_funcs: [], // Don't drop any console methods - logger needs them
      },
      format: {
        comments: false, // Remove comments
      },
    },
    // Chunk size warning limit
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // UI Libraries
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            'framer-motion'
          ],
          // Data and API
          'data-vendor': [
            '@supabase/supabase-js',
            '@tanstack/react-query'
          ],
          // Charts and visualization (lazy loaded)
          'charts-vendor': ['recharts'],
          // Icons - tree-shakeable bundle
          'icons-vendor': ['lucide-react'],
          // Heavy export libraries (lazy loaded)
          'pdf-vendor': ['html2canvas', 'jspdf', 'jspdf-autotable'],
          'excel-vendor': ['xlsx'],
          // Utils
          'utils-vendor': ['date-fns', 'clsx', 'tailwind-merge']
        },
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
          if (facadeModuleId) {
            // Ensure consistent naming for finance pages to prevent chunk loading errors
            if (facadeModuleId.includes('pages/finance/Payments')) {
              return 'pages/Payments-[hash].js'
            }
            if (facadeModuleId.includes('pages/')) {
              return 'pages/[name]-[hash].js'
            }
            if (facadeModuleId.includes('components/')) {
              return 'components/[name]-[hash].js'
            }
          }
          return 'chunks/[name]-[hash].js'
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name) {
            if (/\.(png|jpe?g|gif|svg|webp)$/i.test(assetInfo.name)) {
              return 'images/[name]-[hash][extname]'
            }
            if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name)) {
              return 'fonts/[name]-[hash][extname]'
            }
          }
          return 'assets/[name]-[hash][extname]'
        }
      },
    },
    // Image optimization
    assetsInlineLimit: 4096, // Inline assets smaller than 4kb
    cssCodeSplit: true,
    sourcemap: mode === 'development',
  },
  // Performance optimizations
  css: {
    devSourcemap: mode === 'development'
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode),
    '__DEV__': mode === 'development'
  },
  // PWA and caching
}));