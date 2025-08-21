import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isAnalyze = mode === 'analyze';
  const isProd = mode === 'production';
  
  return {
    plugins: [
      react({
        // Enable React Fast Refresh in development
        fastRefresh: !isProd,
        // Enable JSX runtime optimization
        jsxRuntime: 'automatic',
        // React 19 compiler support for better performance
        babel: isProd ? {
          plugins: [
            ['babel-plugin-react-compiler', {
              target: '19',
              compilationMode: 'infer', // Auto-optimize components
            }]
          ]
        } : undefined,
      }),
      
      // PWA configuration for offline support
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/generativelanguage\.googleapis\.com/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'gemini-api-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 5 * 60, // 5 minutes
                },
              },
            },
          ],
        },
        manifest: {
          name: 'Gemini Chat',
          short_name: 'Gemini',
          description: 'Advanced AI Chat Application',
          theme_color: '#3B82F6',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: '/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
            },
          ],
        },
      }),
      
      // Bundle analyzer for build optimization
      isAnalyze && visualizer({
        filename: 'dist/stats.html',
        open: true,
        gzipSize: true,
        brotliSize: true,
      }),
    ].filter(Boolean),
  
  // Optimize dependencies for faster dev startup
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-hot-toast',
      'clsx',
      '@google/genai',
      'mermaid',
      'dayjs'
    ],
    exclude: ['lucide-react'], // Exclude heavy libraries for lazy loading
  },
  
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core framework chunks
          'vendor-react': ['react', 'react-dom'],
          'vendor-gemini': ['@google/genai'],
          
          // UI and styling
          'vendor-ui': ['lucide-react', 'clsx', 'react-hot-toast'],
          
          // Content processing (heavy) - lazy load
          'vendor-markdown': [
            'react-markdown', 
            'react-syntax-highlighter', 
            'remark-gfm',
            'remark-math',
            'rehype-katex'
          ],
          'vendor-math': ['katex', 'react-katex'],
          'vendor-table': ['@tanstack/react-table'],
          'vendor-charts': ['recharts'],
          
          // Diagram libraries (heaviest - load on demand)
          'vendor-diagrams': ['mermaid', 'reactflow'],
          
          // Virtualization (performance critical)
          'vendor-virtual': ['react-window', '@tanstack/react-virtual']
        },
        
        // Optimize file naming for better caching
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name!.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `img/[name]-[hash].${ext}`;
          }
          if (/woff2?|eot|ttf|otf/i.test(ext)) {
            return `fonts/[name]-[hash].${ext}`;
          }
          return `assets/[name]-[hash].${ext}`;
        }
      }
    },
    
    // Performance optimizations
    chunkSizeWarningLimit: 1500, // Increased for chunk optimization
    sourcemap: process.env.NODE_ENV === 'development', // Only in dev
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug'] // Remove specific console methods
      },
      mangle: {
        safari10: true
      }
    },
    
    // Build target optimization for modern browsers
    target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
    
    // Enable experimental features
    experimental: {
      renderBuiltUrl(filename) {
        // Use CDN for heavy assets in production
        if (isProd && (filename.includes('vendor-diagrams') || filename.includes('vendor-charts'))) {
          return `https://cdn.yoursite.com/${filename}`;
        }
        return filename;
      },
    },
  },
  
  // Development server optimizations
  server: {
    host: true,
    port: 5173,
    // Enable HMR optimizations
    hmr: {
      overlay: true
    },
    // Proxy for Gemini API to avoid CORS issues
    proxy: {
      '/api/gemini': {
        target: 'https://generativelanguage.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/gemini/, ''),
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    }
  },
  
  preview: {
    port: 4173,
    host: true
  },
  
  // Path aliases for cleaner imports
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@hooks': resolve(__dirname, 'src/hooks'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@types': resolve(__dirname, 'src/types'),
      '@services': resolve(__dirname, 'src/services')
    }
  },
  
  // Web Worker configuration
  worker: {
    format: 'es', // Use ES modules format for workers
    rollupOptions: {
      output: {
        format: 'es'
      }
    }
  }
  };
});
