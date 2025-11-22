import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from 'rollup-plugin-visualizer';
import compression from 'vite-plugin-compression';
import { securityPlugin } from "./src/lib/vite-security-plugin";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables based on mode
  const env = loadEnv(mode, process.cwd(), '');
  const isProduction = mode === 'production';

  return {
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
    // Security plugin for development headers
    ...(mode === 'development' ? [securityPlugin(), componentTagger()] : [securityPlugin()]),
    ...(env.ANALYZE ? [visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
      filename: './dist/stats.html',
      template: 'treemap',
    })] : []),
    // Compression for production builds
    ...(isProduction ? [
      compression({
        algorithm: 'gzip',
        ext: '.gz',
        threshold: 10240, // Only compress files > 10KB
        deleteOriginFile: false,
      }),
      compression({
        algorithm: 'brotliCompress',
        ext: '.br',
        threshold: 10240, // Only compress files > 10KB
        deleteOriginFile: false,
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
    ],
    exclude: [
      'lucide-react',
      '@radix-ui/react-separator',
      '@radix-ui/react-collapsible',
      // Exclude ALL heavy libraries from pre-bundling
      'recharts',
      'html2canvas',
      'jspdf',
      'jspdf-autotable',
      'exceljs',
      'xlsx',
      'framer-motion',
      'leaflet',
      'react-leaflet',
    ],
    force: true,
    esbuildOptions: {
      target: 'es2020',
      mainFields: ['module', 'browser', 'main'],
      treeShaking: true,
    },
  },
  build: {
    target: 'es2020',
    minify: isProduction ? 'esbuild' : false, // esbuild is MUCH faster than terser
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    // Chunk size warning limit
    chunkSizeWarningLimit: 500, // Reduced from 1000 to 500KB
    // Faster builds with esbuild
    reportCompressedSize: false, // Disable to speed up build
    rollupOptions: {
      // Increase max chunk size warnings
      onwarn(warning, warn) {
        // Suppress chunk size warnings in production
        if (warning.code === 'CIRCULAR_DEPENDENCY') return;
        if (warning.code === 'UNUSED_EXTERNAL_IMPORT') return;
        warn(warning);
      },
      output: {
        // AGGRESSIVE code splitting - split everything into smaller chunks
        manualChunks: (id) => {
          // Core React libraries - keep together but separate from everything else
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-core';
          }
          
          if (id.includes('node_modules/react-router-dom')) {
            return 'react-router';
          }
          
          // Radix UI components - split by category for better caching
          if (id.includes('@radix-ui')) {
            if (id.includes('dialog') || id.includes('dropdown') || id.includes('popover') || id.includes('tooltip')) {
              return 'radix-overlays';
            }
            if (id.includes('tabs') || id.includes('accordion') || id.includes('collapsible')) {
              return 'radix-containers';
            }
            if (id.includes('select') || id.includes('combobox') || id.includes('checkbox') || id.includes('radio')) {
              return 'radix-forms';
            }
            return 'radix-ui';
          }
          
          // Data and API - separate Supabase and React Query
          if (id.includes('@supabase')) {
            return 'supabase';
          }
          if (id.includes('@tanstack/react-query')) {
            return 'react-query';
          }
          
          // Charts - HEAVY, keep separate
          if (id.includes('recharts')) {
            return 'charts';
          }
          
          // Icons - tree-shakeable but still separate
          if (id.includes('lucide-react')) {
            return 'icons';
          }
          
          // PDF libraries - VERY HEAVY, keep completely separate
          if (id.includes('html2canvas')) {
            return 'html2canvas';
          }
          if (id.includes('jspdf-autotable')) {
            return 'jspdf-autotable';
          }
          if (id.includes('jspdf')) {
            return 'jspdf';
          }
          if (id.includes('html2pdf')) {
            return 'html2pdf';
          }
          
          // Excel libraries - VERY HEAVY, split separately
          if (id.includes('exceljs')) {
            return 'exceljs';
          }
          if (id.includes('xlsx')) {
            return 'xlsx';
          }
          
          // Framer Motion - animations
          if (id.includes('framer-motion')) {
            return 'animations';
          }
          
          // Date utilities
          if (id.includes('date-fns')) {
            return 'date-utils';
          }
          
          // Leaflet maps - HEAVY, keep separate
          if (id.includes('leaflet') || id.includes('react-leaflet')) {
            return 'maps';
          }
          
          // Form libraries
          if (id.includes('react-hook-form') || id.includes('zod')) {
            return 'forms';
          }
          
          // UI utilities
          if (id.includes('clsx') || id.includes('class-variance-authority') || id.includes('tailwind-merge')) {
            return 'ui-utils';
          }
          
          // Other node_modules - split into smaller vendor chunks
          if (id.includes('node_modules')) {
            // Extract package name
            const match = id.match(/node_modules\/(@[^/]+\/[^/]+|[^/]+)\//);
            if (match) {
              const packageName = match[1];
              // Group small packages together
              if (packageName.startsWith('@')) {
                const scope = packageName.split('/')[0];
                return `vendor-${scope.replace('@', '')}`;
              }
              return `vendor-${packageName}`;
            }
            return 'vendor';
          }
        },
        // Optimize chunk file names
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId;
          if (facadeModuleId) {
            // Finance pages - separate chunks
            if (facadeModuleId.includes('pages/finance/')) {
              const pageName = facadeModuleId.match(/pages\/finance\/([^/]+)/)?.[1] || 'finance';
              return `finance/${pageName}-[hash].js`;
            }
            // Fleet pages - separate chunks
            if (facadeModuleId.includes('pages/fleet/')) {
              const pageName = facadeModuleId.match(/pages\/fleet\/([^/]+)/)?.[1] || 'fleet';
              return `fleet/${pageName}-[hash].js`;
            }
            // HR pages - separate chunks
            if (facadeModuleId.includes('pages/hr/')) {
              const pageName = facadeModuleId.match(/pages\/hr\/([^/]+)/)?.[1] || 'hr';
              return `hr/${pageName}-[hash].js`;
            }
            // Other pages
            if (facadeModuleId.includes('pages/')) {
              return 'pages/[name]-[hash].js';
            }
            // Components
            if (facadeModuleId.includes('components/')) {
              return 'components/[name]-[hash].js';
            }
          }
          return 'chunks/[name]-[hash].js';
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name) {
            if (/\.(png|jpe?g|gif|svg|webp)$/i.test(assetInfo.name)) {
              return 'images/[name]-[hash][extname]';
            }
            if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name)) {
              return 'fonts/[name]-[hash][extname]';
            }
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
      // Performance optimizations
      treeshake: {
        preset: 'recommended',
        moduleSideEffects: 'no-external',
        propertyReadSideEffects: false,
        unknownGlobalSideEffects: false,
      },
    },
    // Image optimization
    assetsInlineLimit: 4096, // Inline assets smaller than 4kb
    cssCodeSplit: true,
    sourcemap: false, // Disable sourcemaps in production for faster builds
  },
  // Performance optimizations
  css: {
    devSourcemap: mode === 'development'
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode),
    '__DEV__': mode === 'development',
    // Define environment variables for build time
    ...(env.VITE_SUPABASE_URL && {
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL)
    }),
    ...(env.VITE_SUPABASE_ANON_KEY && {
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY)
    }),
    ...(env.VITE_ENCRYPTION_SECRET && {
      'process.env.VITE_ENCRYPTION_SECRET': JSON.stringify(env.VITE_ENCRYPTION_SECRET)
    }),
    ...(env.VITE_APP_VERSION && {
      'process.env.VITE_APP_VERSION': JSON.stringify(env.VITE_APP_VERSION)
    }),
    ...(env.VITE_API_TIMEOUT && {
      'process.env.VITE_API_TIMEOUT': JSON.stringify(env.VITE_API_TIMEOUT)
    }),
    ...(env.VITE_ENABLE_ANALYTICS && {
      'process.env.VITE_ENABLE_ANALYTICS': JSON.stringify(env.VITE_ENABLE_ANALYTICS)
    }),
    ...(env.VITE_API_PERFORMANCE_OPTIMIZATIONS && {
      'process.env.VITE_API_PERFORMANCE_OPTIMIZATIONS': JSON.stringify(env.VITE_API_PERFORMANCE_OPTIMIZATIONS)
    }),
    ...(env.VITE_PERFORMANCE_MONITORING_ENABLED && {
      'process.env.VITE_PERFORMANCE_MONITORING_ENABLED': JSON.stringify(env.VITE_PERFORMANCE_MONITORING_ENABLED)
    }),
    ...(env.VITE_MONITORING_ENABLED && {
      'process.env.VITE_MONITORING_ENABLED': JSON.stringify(env.VITE_MONITORING_ENABLED)
    })
  },
  // Experimental features for faster builds
  experimental: {
    renderBuiltUrl(filename) {
      return '/' + filename;
    }
  },
  };
});
