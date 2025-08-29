import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    cssMinify: true,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks - separate heavy libraries
          if (id.includes('node_modules')) {
            if (id.includes('three') || id.includes('@react-three')) {
              return 'vendor-three';
            }
            if (id.includes('framer-motion')) {
              return 'vendor-framer';
            }
            if (id.includes('openai') || id.includes('@huggingface')) {
              return 'vendor-ai';
            }
            if (id.includes('recharts') || id.includes('chart')) {
              return 'vendor-charts';
            }
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('@supabase') || id.includes('@tanstack')) {
              return 'vendor-data';
            }
            if (id.includes('@radix-ui')) {
              return 'vendor-ui';
            }
            return 'vendor-misc';
          }
          
          // Feature-based chunks
          if (id.includes('/dashboard/') || id.includes('Dashboard')) {
            return 'feature-dashboard';
          }
          if (id.includes('/landing/') || id.includes('Landing')) {
            return 'feature-landing';
          }
          if (id.includes('/auth/') || id.includes('Auth')) {
            return 'feature-auth';
          }
          if (id.includes('/legal-ai/') || id.includes('LegalAI')) {
            return 'feature-legal-ai';
          }
        },
      },
    },
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
        pure_funcs: mode === 'production' ? ['console.log', 'console.info'] : [],
      },
      mangle: {
        safari10: true,
      },
      format: {
        comments: false,
      },
    },
  },
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'react-router-dom',
      '@supabase/supabase-js',
      '@tanstack/react-query'
    ],
    exclude: ['three', '@react-three/fiber', '@react-three/drei', 'openai'],
  },
}));
