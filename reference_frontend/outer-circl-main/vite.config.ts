import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    }
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
    dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react-router-dom'], // Critical: Prevent multiple React instances
  },
  build: {
    // Enhanced mobile-friendly build optimizations
    target: ['es2020', 'chrome91', 'firefox89', 'safari14'],
    cssCodeSplit: true,
    assetsInlineLimit: 0, // Never inline assets - force fresh fetches with hash
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // STEP 2.1: Split React into separate chunks for granular loading
          // React core - smallest bundle loaded first
          if (id.includes('react/') && !id.includes('react-dom') && !id.includes('react-router')) {
            return 'react-core';
          }
          // React DOM - separate chunk
          if (id.includes('react-dom')) {
            return 'react-dom';
          }
          // React Router - separate chunk
          if (id.includes('react-router-dom')) {
            return 'react-router';
          }
          // JSX runtime - with react core
          if (id.includes('react/jsx-runtime')) {
            return 'react-core';
          }
          // Group UI components
          if (id.includes('@radix-ui') || id.includes('ui/')) {
            return 'ui';
          }
          // Group external services
          if (id.includes('@supabase') || id.includes('mapbox-gl')) {
            return 'services';
          }
          // Group utilities
          if (id.includes('date-fns') || id.includes('clsx') || id.includes('tailwind')) {
            return 'utils';
          }
        },
        assetFileNames: (assetInfo) => {
          if (!assetInfo.name) return `assets/[name]-[hash][extname]`;
          const info = assetInfo.name.split('.');
          const extType = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            return `images/[name]-[hash][extname]`;
          }
          if (/woff2?|eot|ttf|otf/i.test(extType)) {
            return `fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js'
      }
    },
    // Enhanced minification and optimization for production
    minify: mode === 'production' ? 'esbuild' : false,
    chunkSizeWarningLimit: 400, // Reduced for better mobile performance
    sourcemap: mode === 'development',
    cssMinify: mode === 'production',
    // Improved tree shaking
    treeshake: mode === 'production' ? {
      moduleSideEffects: false,
      propertyReadSideEffects: false,
      unknownGlobalSideEffects: false
    } : false
  },
  // Enhanced dependency optimization for mobile with React Context fix
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'react/jsx-runtime',
      'react-router-dom',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      'date-fns'
    ],
    exclude: ['mapbox-gl'], // Exclude heavy libraries from pre-bundling
    force: true, // Force re-optimization to clear problematic cache
    // Deduplicate React to prevent "Cannot read properties of null" errors
    dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react-router-dom']
  },
  // Ensure React hooks are properly resolved
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode),
  },
}));
