import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: {
    host: "::",
    port: 3001,
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      external: ['recharts', 'jspdf', 'jspdf-autotable', 'exceljs', 'xlsx'],
      output: {
        manualChunks: {
          'finance-core': ['react', 'react-dom'],
          'finance-ui': ['@radix-ui/react-slot', '@radix-ui/react-dialog'],
          'finance-forms': ['react-hook-form', 'zod', '@hookform/resolvers'],
        },
      },
    },
  },
});