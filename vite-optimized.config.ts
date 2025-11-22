import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from 'rollup-plugin-visualizer';
import compression from 'vite-plugin-compression';
import { securityPlugin } from "./src/lib/vite-security-plugin";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
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
      ...(mode === 'development' ? [securityPlugin(), componentTagger()] : [securityPlugin()]),
      ...(env.ANALYZE ? [visualizer({
        open: true,
        gzipSize: true,
        brotliSize: true,
        filename: './dist/stats.html',
        template: 'treemap',
      })] : []),
      ...(isProduction ? [
        compression({
          algorithm: 'gzip',
          ext: '.gz',
          threshold: 10240,
          deleteOriginFile: false,
        }),
        compression({
          algorithm: 'brotliCompress',
          ext: '.br',
          threshold: 10240,
          deleteOriginFile: false,
        }),
      ] : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
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
        'lucide-react',
        '@radix-ui/react-slot',
        '@radix-ui/react-dialog',
        '@radix-ui/react-dropdown-menu',
      ],
      exclude: [
        // ALL heavy libraries - load on demand
        'recharts',
        'html2canvas',
        'jspdf',
        'jspdf-autotable',
        'html2pdf.js',
        'exceljs',
        'xlsx',
        'leaflet',
        'react-leaflet',
        'three',
        '@react-three/fiber',
        '@react-three/drei',
        'react-datepicker',
        'papaparse',
        'moment-hijri',
        'framer-motion', // Exclude heavy animation library
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
      minify: isProduction ? 'esbuild' : false,
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
      chunkSizeWarningLimit: 300, // Reduced further
      reportCompressedSize: false,
      rollupOptions: {
        onwarn(warning, warn) {
          if (warning.code === 'CIRCULAR_DEPENDENCY') return;
          if (warning.code === 'UNUSED_EXTERNAL_IMPORT') return;
          if (warning.code === 'THIS_IS_UNDEFINED') return;
          warn(warning);
        },
        output: {
          // AGGRESSIVE code splitting
          manualChunks: (id) => {
            // Core React - smallest possible chunk
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
              return 'react-core';
            }

            // React Router - separate
            if (id.includes('react-router-dom')) {
              return 'router';
            }

            // Essential UI libraries - keep minimal
            if (id.includes('@radix-ui')) {
              if (id.includes('dialog') || id.includes('dropdown')) {
                return 'ui-dialogs';
              }
              return 'ui-base';
            }

            // Icons - tree-shakable but separate
            if (id.includes('lucide-react')) {
              return 'icons';
            }

            // Data fetching - keep together
            if (id.includes('@supabase') || id.includes('@tanstack/react-query')) {
              return 'data-fetching';
            }

            // Forms - separate chunk
            if (id.includes('react-hook-form') || id.includes('zod')) {
              return 'forms';
            }

            // Heavy libraries - COMPLETELY separate
            if (id.includes('recharts')) return 'charts-external';
            if (id.includes('html2canvas')) return 'pdf-external';
            if (id.includes('jspdf')) return 'pdf-external';
            if (id.includes('exceljs') || id.includes('xlsx')) return 'excel-external';
            if (id.includes('leaflet')) return 'maps-external';
            if (id.includes('three')) return '3d-external';
            if (id.includes('react-datepicker')) return 'datepicker-external';
            if (id.includes('papaparse')) return 'csv-external';
            if (id.includes('moment-hijri')) return 'date-external';

            // Everything else - small vendor chunks
            if (id.includes('node_modules')) {
              const match = id.match(/node_modules\/(@[^/]+\/[^/]+|[^/]+)\//);
              if (match) {
                const packageName = match[1];
                // Group small packages
                if (packageName.length < 10) {
                  return 'vendor-small';
                }
                return `vendor-${packageName.substring(0, 8)}`;
              }
            }
          },
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId;
            if (facadeModuleId) {
              // Route-based chunks - very specific
              if (facadeModuleId.includes('pages/finance/')) {
                return 'finance/[name]-[hash].js';
              }
              if (facadeModuleId.includes('pages/fleet/')) {
                return 'fleet/[name]-[hash].js';
              }
              if (facadeModuleId.includes('pages/hr/')) {
                return 'hr/[name]-[hash].js';
              }
              if (facadeModuleId.includes('pages/legal/')) {
                return 'legal/[name]-[hash].js';
              }
              // Component chunks
              if (facadeModuleId.includes('components/heavy/')) {
                return 'components/heavy/[name]-[hash].js';
              }
              if (facadeModuleId.includes('components/charts/')) {
                return 'components/charts/[name]-[hash].js';
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
        treeshake: {
          preset: 'recommended',
          moduleSideEffects: 'no-external',
          propertyReadSideEffects: false,
          unknownGlobalSideEffects: false,
          tryCatchDeoptimization: false,
        },
      },
      assetsInlineLimit: 4096,
      cssCodeSplit: true,
      sourcemap: false,
    },
    css: {
      devSourcemap: mode === 'development'
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      '__DEV__': mode === 'development',
      // Lazy loading flag
      '__LAZY_LOAD_EXTERNALS__': 'true',
    },
    experimental: {
      renderBuiltUrl(filename) {
        return '/' + filename;
      },
      buildManifest: true,
    },
    // External libraries to not bundle
    external: isProduction ? [
      // These will be loaded from CDN on demand
      'recharts',
      'html2canvas',
      'jspdf',
      'jspdf-autotable',
      'exceljs',
      'xlsx',
      'leaflet',
      'three',
      'react-datepicker',
      'papaparse',
    ] : [],
  };
});