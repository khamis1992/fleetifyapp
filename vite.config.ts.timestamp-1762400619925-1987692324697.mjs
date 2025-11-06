// vite.config.ts
import { defineConfig } from "file:///C:/Users/khamis/Desktop/fleetifyapp-3/node_modules/.pnpm/vite@5.4.21_@types+node@24._e9a7bafb6435b51626cb72f43898a4be/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/khamis/Desktop/fleetifyapp-3/node_modules/.pnpm/@vitejs+plugin-react-swc@3._4faa7856bcd438969243c1c73341fe87/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { componentTagger } from "file:///C:/Users/khamis/Desktop/fleetifyapp-3/node_modules/.pnpm/lovable-tagger@1.1.11_tsx@4_89fe15423efe818ccffa39d4c3d119ce/node_modules/lovable-tagger/dist/index.js";
import { visualizer } from "file:///C:/Users/khamis/Desktop/fleetifyapp-3/node_modules/.pnpm/rollup-plugin-visualizer@6.0.5_rollup@4.52.5/node_modules/rollup-plugin-visualizer/dist/plugin/index.js";
import compression from "file:///C:/Users/khamis/Desktop/fleetifyapp-3/node_modules/.pnpm/vite-plugin-compression@0.5_1cdfc762d47b239b57f5033b0ea8ddfd/node_modules/vite-plugin-compression/dist/index.mjs";
var __vite_injected_original_dirname = "C:\\Users\\khamis\\Desktop\\fleetifyapp-3";
var vite_config_default = defineConfig(({ mode }) => ({
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
    ...mode === "development" ? [componentTagger()] : [],
    ...process.env.ANALYZE ? [visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
      filename: "./dist/stats.html",
      template: "treemap"
    })] : [],
    // Compression for production builds
    ...mode === "production" ? [
      compression({
        algorithm: "gzip",
        ext: ".gz",
        threshold: 1024
      }),
      compression({
        algorithm: "brotliCompress",
        ext: ".br",
        threshold: 1024
      })
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src"),
      // Ensure single React instance
      "react": path.resolve(__vite_injected_original_dirname, "./node_modules/react"),
      "react-dom": path.resolve(__vite_injected_original_dirname, "./node_modules/react-dom")
    },
    dedupe: ["react", "react-dom"],
    conditions: ["module", "import", "browser", "default"]
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "@supabase/supabase-js",
      "@tanstack/react-query",
      "framer-motion",
      "recharts"
    ],
    exclude: [
      "lucide-react",
      "@radix-ui/react-separator",
      "@radix-ui/react-collapsible"
    ],
    force: true,
    esbuildOptions: {
      target: "es2020",
      mainFields: ["module", "browser", "main"]
    }
  },
  build: {
    target: "es2020",
    minify: "terser",
    outDir: "dist",
    assetsDir: "assets",
    emptyOutDir: true,
    // Terser options for better minification
    terserOptions: {
      compress: {
        drop_console: false,
        // Keep console for logger functionality
        drop_debugger: true,
        pure_funcs: []
        // Don't drop any console methods - logger needs them
      },
      format: {
        comments: false
        // Remove comments
      }
    },
    // Chunk size warning limit
    chunkSizeWarningLimit: 1e3,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          // UI Libraries
          "ui-vendor": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-tabs",
            "@radix-ui/react-toast",
            "framer-motion"
          ],
          // Data and API
          "data-vendor": [
            "@supabase/supabase-js",
            "@tanstack/react-query"
          ],
          // Charts and visualization (lazy loaded)
          "charts-vendor": ["recharts"],
          // Icons - tree-shakeable bundle
          "icons-vendor": ["lucide-react"],
          // Heavy export libraries (lazy loaded)
          "pdf-vendor": ["html2canvas", "jspdf", "jspdf-autotable"],
          "excel-vendor": ["xlsx"],
          // Utils
          "utils-vendor": ["date-fns", "clsx", "tailwind-merge"]
        },
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId;
          if (facadeModuleId) {
            if (facadeModuleId.includes("pages/finance/Payments")) {
              return "pages/Payments-[hash].js";
            }
            if (facadeModuleId.includes("pages/")) {
              return "pages/[name]-[hash].js";
            }
            if (facadeModuleId.includes("components/")) {
              return "components/[name]-[hash].js";
            }
          }
          return "chunks/[name]-[hash].js";
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name) {
            if (/\.(png|jpe?g|gif|svg|webp)$/i.test(assetInfo.name)) {
              return "images/[name]-[hash][extname]";
            }
            if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name)) {
              return "fonts/[name]-[hash][extname]";
            }
          }
          return "assets/[name]-[hash][extname]";
        }
      }
    },
    // Image optimization
    assetsInlineLimit: 4096,
    // Inline assets smaller than 4kb
    cssCodeSplit: true,
    sourcemap: mode === "development"
  },
  // Performance optimizations
  css: {
    devSourcemap: mode === "development"
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify(mode),
    "__DEV__": mode === "development"
  }
  // PWA and caching
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxraGFtaXNcXFxcRGVza3RvcFxcXFxmbGVldGlmeWFwcC0zXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxraGFtaXNcXFxcRGVza3RvcFxcXFxmbGVldGlmeWFwcC0zXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9raGFtaXMvRGVza3RvcC9mbGVldGlmeWFwcC0zL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcclxuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcclxuaW1wb3J0IHsgY29tcG9uZW50VGFnZ2VyIH0gZnJvbSBcImxvdmFibGUtdGFnZ2VyXCI7XHJcbmltcG9ydCB7IHZpc3VhbGl6ZXIgfSBmcm9tICdyb2xsdXAtcGx1Z2luLXZpc3VhbGl6ZXInO1xyXG5pbXBvcnQgY29tcHJlc3Npb24gZnJvbSAndml0ZS1wbHVnaW4tY29tcHJlc3Npb24nO1xyXG5cclxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4gKHtcclxuICBzZXJ2ZXI6IHtcclxuICAgIGhvc3Q6IFwiOjpcIixcclxuICAgIHBvcnQ6IDgwODAsXHJcbiAgICBobXI6IHtcclxuICAgICAgcG9ydDogODA4MCxcclxuICAgICAgaG9zdDogXCJsb2NhbGhvc3RcIlxyXG4gICAgfVxyXG4gIH0sXHJcbiAgcGx1Z2luczogW1xyXG4gICAgcmVhY3QoKSxcclxuICAgIC4uLihtb2RlID09PSAnZGV2ZWxvcG1lbnQnID8gW2NvbXBvbmVudFRhZ2dlcigpXSA6IFtdKSxcclxuICAgIC4uLihwcm9jZXNzLmVudi5BTkFMWVpFID8gW3Zpc3VhbGl6ZXIoe1xyXG4gICAgICBvcGVuOiB0cnVlLFxyXG4gICAgICBnemlwU2l6ZTogdHJ1ZSxcclxuICAgICAgYnJvdGxpU2l6ZTogdHJ1ZSxcclxuICAgICAgZmlsZW5hbWU6ICcuL2Rpc3Qvc3RhdHMuaHRtbCcsXHJcbiAgICAgIHRlbXBsYXRlOiAndHJlZW1hcCcsXHJcbiAgICB9KV0gOiBbXSksXHJcbiAgICAvLyBDb21wcmVzc2lvbiBmb3IgcHJvZHVjdGlvbiBidWlsZHNcclxuICAgIC4uLihtb2RlID09PSAncHJvZHVjdGlvbicgPyBbXHJcbiAgICAgIGNvbXByZXNzaW9uKHtcclxuICAgICAgICBhbGdvcml0aG06ICdnemlwJyxcclxuICAgICAgICBleHQ6ICcuZ3onLFxyXG4gICAgICAgIHRocmVzaG9sZDogMTAyNCxcclxuICAgICAgfSksXHJcbiAgICAgIGNvbXByZXNzaW9uKHtcclxuICAgICAgICBhbGdvcml0aG06ICdicm90bGlDb21wcmVzcycsXHJcbiAgICAgICAgZXh0OiAnLmJyJyxcclxuICAgICAgICB0aHJlc2hvbGQ6IDEwMjQsXHJcbiAgICAgIH0pLFxyXG4gICAgXSA6IFtdKSxcclxuICBdLFxyXG4gIHJlc29sdmU6IHtcclxuICAgIGFsaWFzOiB7XHJcbiAgICAgICdAJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjJyksXHJcbiAgICAgIC8vIEVuc3VyZSBzaW5nbGUgUmVhY3QgaW5zdGFuY2VcclxuICAgICAgJ3JlYWN0JzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vbm9kZV9tb2R1bGVzL3JlYWN0JyksXHJcbiAgICAgICdyZWFjdC1kb20nOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9ub2RlX21vZHVsZXMvcmVhY3QtZG9tJyksXHJcbiAgICB9LFxyXG4gICAgZGVkdXBlOiBbJ3JlYWN0JywgJ3JlYWN0LWRvbSddLFxyXG4gICAgY29uZGl0aW9uczogWydtb2R1bGUnLCAnaW1wb3J0JywgJ2Jyb3dzZXInLCAnZGVmYXVsdCddLFxyXG4gIH0sXHJcbiAgb3B0aW1pemVEZXBzOiB7XHJcbiAgICBpbmNsdWRlOiBbXHJcbiAgICAgICdyZWFjdCcsXHJcbiAgICAgICdyZWFjdC1kb20nLFxyXG4gICAgICAncmVhY3QvanN4LXJ1bnRpbWUnLFxyXG4gICAgICAnQHN1cGFiYXNlL3N1cGFiYXNlLWpzJyxcclxuICAgICAgJ0B0YW5zdGFjay9yZWFjdC1xdWVyeScsXHJcbiAgICAgICdmcmFtZXItbW90aW9uJyxcclxuICAgICAgJ3JlY2hhcnRzJ1xyXG4gICAgXSxcclxuICAgIGV4Y2x1ZGU6IFtcclxuICAgICAgJ2x1Y2lkZS1yZWFjdCcsXHJcbiAgICAgICdAcmFkaXgtdWkvcmVhY3Qtc2VwYXJhdG9yJyxcclxuICAgICAgJ0ByYWRpeC11aS9yZWFjdC1jb2xsYXBzaWJsZSdcclxuICAgIF0sXHJcbiAgICBmb3JjZTogdHJ1ZSxcclxuICAgIGVzYnVpbGRPcHRpb25zOiB7XHJcbiAgICAgIHRhcmdldDogJ2VzMjAyMCcsXHJcbiAgICAgIG1haW5GaWVsZHM6IFsnbW9kdWxlJywgJ2Jyb3dzZXInLCAnbWFpbiddLFxyXG4gICAgfSxcclxuICB9LFxyXG4gIGJ1aWxkOiB7XHJcbiAgICB0YXJnZXQ6ICdlczIwMjAnLFxyXG4gICAgbWluaWZ5OiAndGVyc2VyJyxcclxuICAgIG91dERpcjogJ2Rpc3QnLFxyXG4gICAgYXNzZXRzRGlyOiAnYXNzZXRzJyxcclxuICAgIGVtcHR5T3V0RGlyOiB0cnVlLFxyXG4gICAgLy8gVGVyc2VyIG9wdGlvbnMgZm9yIGJldHRlciBtaW5pZmljYXRpb25cclxuICAgIHRlcnNlck9wdGlvbnM6IHtcclxuICAgICAgY29tcHJlc3M6IHtcclxuICAgICAgICBkcm9wX2NvbnNvbGU6IGZhbHNlLCAvLyBLZWVwIGNvbnNvbGUgZm9yIGxvZ2dlciBmdW5jdGlvbmFsaXR5XHJcbiAgICAgICAgZHJvcF9kZWJ1Z2dlcjogdHJ1ZSxcclxuICAgICAgICBwdXJlX2Z1bmNzOiBbXSwgLy8gRG9uJ3QgZHJvcCBhbnkgY29uc29sZSBtZXRob2RzIC0gbG9nZ2VyIG5lZWRzIHRoZW1cclxuICAgICAgfSxcclxuICAgICAgZm9ybWF0OiB7XHJcbiAgICAgICAgY29tbWVudHM6IGZhbHNlLCAvLyBSZW1vdmUgY29tbWVudHNcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgICAvLyBDaHVuayBzaXplIHdhcm5pbmcgbGltaXRcclxuICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogMTAwMCxcclxuICAgIHJvbGx1cE9wdGlvbnM6IHtcclxuICAgICAgb3V0cHV0OiB7XHJcbiAgICAgICAgbWFudWFsQ2h1bmtzOiB7XHJcbiAgICAgICAgICAvLyBDb3JlIFJlYWN0IGxpYnJhcmllc1xyXG4gICAgICAgICAgJ3JlYWN0LXZlbmRvcic6IFsncmVhY3QnLCAncmVhY3QtZG9tJywgJ3JlYWN0LXJvdXRlci1kb20nXSxcclxuICAgICAgICAgIC8vIFVJIExpYnJhcmllc1xyXG4gICAgICAgICAgJ3VpLXZlbmRvcic6IFtcclxuICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC1kaWFsb2cnLFxyXG4gICAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LWRyb3Bkb3duLW1lbnUnLFxyXG4gICAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LXRhYnMnLFxyXG4gICAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LXRvYXN0JyxcclxuICAgICAgICAgICAgJ2ZyYW1lci1tb3Rpb24nXHJcbiAgICAgICAgICBdLFxyXG4gICAgICAgICAgLy8gRGF0YSBhbmQgQVBJXHJcbiAgICAgICAgICAnZGF0YS12ZW5kb3InOiBbXHJcbiAgICAgICAgICAgICdAc3VwYWJhc2Uvc3VwYWJhc2UtanMnLFxyXG4gICAgICAgICAgICAnQHRhbnN0YWNrL3JlYWN0LXF1ZXJ5J1xyXG4gICAgICAgICAgXSxcclxuICAgICAgICAgIC8vIENoYXJ0cyBhbmQgdmlzdWFsaXphdGlvbiAobGF6eSBsb2FkZWQpXHJcbiAgICAgICAgICAnY2hhcnRzLXZlbmRvcic6IFsncmVjaGFydHMnXSxcclxuICAgICAgICAgIC8vIEljb25zIC0gdHJlZS1zaGFrZWFibGUgYnVuZGxlXHJcbiAgICAgICAgICAnaWNvbnMtdmVuZG9yJzogWydsdWNpZGUtcmVhY3QnXSxcclxuICAgICAgICAgIC8vIEhlYXZ5IGV4cG9ydCBsaWJyYXJpZXMgKGxhenkgbG9hZGVkKVxyXG4gICAgICAgICAgJ3BkZi12ZW5kb3InOiBbJ2h0bWwyY2FudmFzJywgJ2pzcGRmJywgJ2pzcGRmLWF1dG90YWJsZSddLFxyXG4gICAgICAgICAgJ2V4Y2VsLXZlbmRvcic6IFsneGxzeCddLFxyXG4gICAgICAgICAgLy8gVXRpbHNcclxuICAgICAgICAgICd1dGlscy12ZW5kb3InOiBbJ2RhdGUtZm5zJywgJ2Nsc3gnLCAndGFpbHdpbmQtbWVyZ2UnXVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY2h1bmtGaWxlTmFtZXM6IChjaHVua0luZm8pID0+IHtcclxuICAgICAgICAgIGNvbnN0IGZhY2FkZU1vZHVsZUlkID0gY2h1bmtJbmZvLmZhY2FkZU1vZHVsZUlkXHJcbiAgICAgICAgICBpZiAoZmFjYWRlTW9kdWxlSWQpIHtcclxuICAgICAgICAgICAgLy8gRW5zdXJlIGNvbnNpc3RlbnQgbmFtaW5nIGZvciBmaW5hbmNlIHBhZ2VzIHRvIHByZXZlbnQgY2h1bmsgbG9hZGluZyBlcnJvcnNcclxuICAgICAgICAgICAgaWYgKGZhY2FkZU1vZHVsZUlkLmluY2x1ZGVzKCdwYWdlcy9maW5hbmNlL1BheW1lbnRzJykpIHtcclxuICAgICAgICAgICAgICByZXR1cm4gJ3BhZ2VzL1BheW1lbnRzLVtoYXNoXS5qcydcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoZmFjYWRlTW9kdWxlSWQuaW5jbHVkZXMoJ3BhZ2VzLycpKSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuICdwYWdlcy9bbmFtZV0tW2hhc2hdLmpzJ1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChmYWNhZGVNb2R1bGVJZC5pbmNsdWRlcygnY29tcG9uZW50cy8nKSkge1xyXG4gICAgICAgICAgICAgIHJldHVybiAnY29tcG9uZW50cy9bbmFtZV0tW2hhc2hdLmpzJ1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICByZXR1cm4gJ2NodW5rcy9bbmFtZV0tW2hhc2hdLmpzJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYXNzZXRGaWxlTmFtZXM6IChhc3NldEluZm8pID0+IHtcclxuICAgICAgICAgIGlmIChhc3NldEluZm8ubmFtZSkge1xyXG4gICAgICAgICAgICBpZiAoL1xcLihwbmd8anBlP2d8Z2lmfHN2Z3x3ZWJwKSQvaS50ZXN0KGFzc2V0SW5mby5uYW1lKSkge1xyXG4gICAgICAgICAgICAgIHJldHVybiAnaW1hZ2VzL1tuYW1lXS1baGFzaF1bZXh0bmFtZV0nXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKC9cXC4od29mZjI/fGVvdHx0dGZ8b3RmKSQvaS50ZXN0KGFzc2V0SW5mby5uYW1lKSkge1xyXG4gICAgICAgICAgICAgIHJldHVybiAnZm9udHMvW25hbWVdLVtoYXNoXVtleHRuYW1lXSdcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgcmV0dXJuICdhc3NldHMvW25hbWVdLVtoYXNoXVtleHRuYW1lXSdcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gICAgLy8gSW1hZ2Ugb3B0aW1pemF0aW9uXHJcbiAgICBhc3NldHNJbmxpbmVMaW1pdDogNDA5NiwgLy8gSW5saW5lIGFzc2V0cyBzbWFsbGVyIHRoYW4gNGtiXHJcbiAgICBjc3NDb2RlU3BsaXQ6IHRydWUsXHJcbiAgICBzb3VyY2VtYXA6IG1vZGUgPT09ICdkZXZlbG9wbWVudCcsXHJcbiAgfSxcclxuICAvLyBQZXJmb3JtYW5jZSBvcHRpbWl6YXRpb25zXHJcbiAgY3NzOiB7XHJcbiAgICBkZXZTb3VyY2VtYXA6IG1vZGUgPT09ICdkZXZlbG9wbWVudCdcclxuICB9LFxyXG4gIGRlZmluZToge1xyXG4gICAgJ3Byb2Nlc3MuZW52Lk5PREVfRU5WJzogSlNPTi5zdHJpbmdpZnkobW9kZSksXHJcbiAgICAnX19ERVZfXyc6IG1vZGUgPT09ICdkZXZlbG9wbWVudCdcclxuICB9LFxyXG4gIC8vIFBXQSBhbmQgY2FjaGluZ1xyXG59KSk7Il0sCiAgIm1hcHBpbmdzIjogIjtBQUEyUyxTQUFTLG9CQUFvQjtBQUN4VSxPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBQ2pCLFNBQVMsdUJBQXVCO0FBQ2hDLFNBQVMsa0JBQWtCO0FBQzNCLE9BQU8saUJBQWlCO0FBTHhCLElBQU0sbUNBQW1DO0FBUXpDLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxPQUFPO0FBQUEsRUFDekMsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sS0FBSztBQUFBLE1BQ0gsTUFBTTtBQUFBLE1BQ04sTUFBTTtBQUFBLElBQ1I7QUFBQSxFQUNGO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixHQUFJLFNBQVMsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDO0FBQUEsSUFDcEQsR0FBSSxRQUFRLElBQUksVUFBVSxDQUFDLFdBQVc7QUFBQSxNQUNwQyxNQUFNO0FBQUEsTUFDTixVQUFVO0FBQUEsTUFDVixZQUFZO0FBQUEsTUFDWixVQUFVO0FBQUEsTUFDVixVQUFVO0FBQUEsSUFDWixDQUFDLENBQUMsSUFBSSxDQUFDO0FBQUE7QUFBQSxJQUVQLEdBQUksU0FBUyxlQUFlO0FBQUEsTUFDMUIsWUFBWTtBQUFBLFFBQ1YsV0FBVztBQUFBLFFBQ1gsS0FBSztBQUFB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
