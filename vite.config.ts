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
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: false,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-popover',
            '@radix-ui/react-tabs',
          ],
          'supabase-vendor': ['@supabase/supabase-js'],
          'toast-vendor': ['sonner', '@radix-ui/react-toast'],
          'editor-vendor': [
            '@tiptap/core',
            '@tiptap/react',
            '@tiptap/pm',
            '@tiptap/starter-kit',
            '@tiptap/extension-highlight',
            '@tiptap/extension-color',
            '@tiptap/extension-text-style',
            '@tiptap/extension-link',
            '@tiptap/extension-image',
            '@tiptap/extension-table',
            '@tiptap/extension-table-row',
            '@tiptap/extension-table-cell',
            '@tiptap/extension-table-header',
            '@tiptap/extension-typography',
            '@tiptap/extension-underline',
            'lowlight',
          ],
          'pdf-vendor': ['jspdf', 'html2canvas'],
          'chart-vendor': ['recharts'],
          'graph-vendor': ['react-force-graph-2d', 'd3-force', 'd3-quadtree'],
        },
      },
    },
  },
}));
