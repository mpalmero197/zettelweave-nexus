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
    sourcemap: true,
    target: 'es2020',
    minify: 'esbuild',
    cssCodeSplit: true,
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('lucide-react')) return 'icons';
          if (id.includes('@radix-ui')) return 'radix';
          if (id.includes('react-router')) return 'react-vendor';
          if (id.includes('react-dom') || /[\\/]node_modules[\\/]react[\\/]/.test(id)) return 'react-vendor';
          if (id.includes('@supabase')) return 'supabase-vendor';
          if (id.includes('sonner') || id.includes('@radix-ui/react-toast')) return 'toast-vendor';
        },
      },
    },
  },

}));
