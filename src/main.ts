import { createApp } from 'vue';
import App from './App.vue';

// import "~/styles/element/index.scss";

// import ElementPlus from "element-plus";
// import all element css, uncommented next line
// import "element-plus/dist/index.css";

// or use cdn, uncomment cdn link in `index.html`

import '~/styles/index.css';

// If you want to use ElMessage, import it.
// import "element-plus/theme-chalk/src/message.scss"
// import "element-plus/es/components/message-box/style/css"
// import "element-plus/es/components/dialog/style/css"
// import 'element-plus/theme-chalk/display.css'

import { useStore } from '~/store';
const loading = useStorage('router-view-loading', true);
import router from '~/router';

let routeLoadingTimer: ReturnType<typeof window.setTimeout> | undefined;
const clearRouteLoadingTimer = () => {
  if (routeLoadingTimer) {
    window.clearTimeout(routeLoadingTimer);
    routeLoadingTimer = undefined;
  }
};

router.beforeEach((to, from, next) => {
  clearRouteLoadingTimer();
  routeLoadingTimer = window.setTimeout(() => {
    loading.value = true;
  }, 120);
  next();
});

router.afterEach(() => {
  clearRouteLoadingTimer();
  window.setTimeout(() => {
    loading.value = false;
  }, 80);
});

router.onError(() => {
  clearRouteLoadingTimer();
  loading.value = false;
});

import VueDiff from 'vue-diff';
import 'vue-diff/dist/index.css';
import yaml from 'highlight.js/lib/languages/yaml';
import toml from 'highlight.js/lib/languages/ini';

const app = createApp(App);
app.use(createPinia());

VueDiff.hljs.registerLanguage('yaml', yaml);
VueDiff.hljs.registerLanguage('toml', toml);
app
  .use(VueDiff, {
    componentName: 'VueDiff',
  })
  .use(router);

const store = useStore();

store.trySignIn().finally(() => {
  app.mount('#app');
});

if (import.meta.env.DEV) {
  try {
    (window as any).store = store;
    (globalThis as any).store = store;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {}
}

// app.use(ElementPlus);
