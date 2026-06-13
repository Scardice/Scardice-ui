export { http as backend, apiBaseURL, requestTimeout, urlBase } from './api';

// 逐渐使用 ofetch 替换 axios
// 后记：发现 ofetch 也是一团糟，ky 也是一团糟，还是 axios 好用
// 2024.6.12 全都鲨了，只留下 axios
