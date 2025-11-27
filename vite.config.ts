import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
    // Define process.env for libraries that use it
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env': JSON.stringify({}),
    },
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
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        'react': path.resolve(__dirname, './node_modules/react'),
        'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
      },
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@supabase/supabase-js',
        '@tanstack/react-query',
        // Include ALL Radix UI components that use React.forwardRef
        '@radix-ui/react-slot',
        '@radix-ui/react-dialog',
        '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-select',
        '@radix-ui/react-popover',
        '@radix-ui/react-tooltip',
        '@radix-ui/react-tabs',
        '@radix-ui/react-toast',
        '@radix-ui/react-switch',
        '@radix-ui/react-checkbox',
        '@radix-ui/react-radio-group',
        '@radix-ui/react-progress',
        '@radix-ui/react-slider',
        '@radix-ui/react-separator',
        '@radix-ui/react-label',
        '@radix-ui/react-textarea',
        '@radix-ui/react-avatar',
        '@radix-ui/react-badge',
        '@radix-ui/react-card',
        '@radix-ui/react-alert-dialog',
        '@radix-ui/react-aspect-ratio',
      ],
      exclude: [
        'recharts',
        'html2canvas',
        'jspdf',
        'jspdf-autotable',
        'exceljs',
        'xlsx',
        'framer-motion',
        'leaflet',
        'three',
      ],
    },
    build: {
      target: 'es2020',
      minify: isProduction ? 'esbuild' : false,
      outDir: 'dist',
      chunkSizeWarningLimit: 1500,
      reportCompressedSize: false,
      rollupOptions: {
        external: [],
        output: {
          manualChunks: (id) => {
            // React and React DOM must stay in vendor chunk to avoid forwardRef issues
            if (id.includes('react') || id.includes('react-dom') || id.includes('react/jsx-runtime')) {
              return 'vendor';
            }
            // Supabase and related packages
            if (id.includes('@supabase')) {
              return 'supabase';
            }
            // Chart libraries
            if (id.includes('recharts')) {
              return 'charts';
            }
            // PDF generation libraries
            if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('jspdf-autotable')) {
              return 'pdf';
            }
            // Excel libraries
            if (id.includes('exceljs') || id.includes('xlsx')) {
              return 'excel';
            }
            // Large third-party libraries that can be safely separated
            if (id.includes('node_modules/leaflet') ||
                id.includes('node_modules/three') ||
                id.includes('node_modules/framer-motion')) {
              return 'vendor-heavy';
            }
            // Everything else from node_modules goes to vendor
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          },
        },
      },
      assetsInlineLimit: 4096,
      cssCodeSplit: true,
      sourcemap: false,
    },
  };
});