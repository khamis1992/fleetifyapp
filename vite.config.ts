import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
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
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
              return 'react-core';
            }
            if (id.includes('@supabase')) {
              return 'supabase';
            }
            if (id.includes('recharts')) {
              return 'charts';
            }
            if (id.includes('jspdf') || id.includes('html2canvas')) {
              return 'pdf';
            }
            if (id.includes('exceljs') || id.includes('xlsx')) {
              return 'excel';
            }
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