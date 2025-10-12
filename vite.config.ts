import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
// Performance: Bundle analyzer
// Uncomment to analyze bundle size: npm install --save-dev rollup-plugin-visualizer
// import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    // Performance: Uncomment to generate bundle visualization
    // visualizer({
    //   open: true,
    //   gzipSize: true,
    //   brotliSize: true,
    //   filename: './dist/stats.html'
    // }),
  ].filter(Boolean),
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
    exclude: ['lucide-react'],
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
          // Charts and visualization
          'charts-vendor': ['recharts'],
          // Icons
          'icons-vendor': ['lucide-react'],
          // Utils
          'utils-vendor': ['date-fns', 'clsx', 'tailwind-merge']
        },
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
          if (facadeModuleId) {
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