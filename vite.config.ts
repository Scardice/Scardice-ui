import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
// import legacy from '@vitejs/plugin-legacy';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import Icons from 'unplugin-icons/vite';
import IconsResolver from 'unplugin-icons/resolver';
import { chunkSplitPlugin } from 'vite-plugin-chunk-split';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: './',
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/sd-api': {
        target: loadEnv(mode, './').VITE_APP_APIURL,
        changeOrigin: true,
        rewrite: path => path,
      },
    },
  },
  plugins: [
    vue(),
    vueJsx(),
    AutoImport({
      include: [/\.[tj]sx?$/, /\.vue$/, /\.vue\?vue/],
      imports: ['vue', 'pinia', 'vue-router', '@vueuse/core'],
      dts: true,
      vueTemplate: true,
      resolvers: [
        ElementPlusResolver({
          importStyle: 'css',
        }),
        IconsResolver(),
      ],
    }),
    Components({
      resolvers: [
        ElementPlusResolver({
          importStyle: 'css',
        }),
        IconsResolver(),
      ],
    }),
    Icons({
      compiler: 'vue3',
      autoInstall: true,
    }),
    chunkSplitPlugin({
      customSplitting: {
        'vendor-editor': [
          /node_modules\/codemirror/,
          /node_modules\/@codemirror/,
          /node_modules\/vue-diff/,
          /node_modules\/highlight.js/,
        ],
        'vendor-utils': [/node_modules\/dayjs/, /node_modules\/qs/, /node_modules\/axios/],
      },
    }),
  ],
  build: {
    sourcemap: false,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 1024,
  },
}));
