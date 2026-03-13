import axios, { AxiosHeaders, type AxiosRequestConfig } from 'axios';
import qs from 'qs';

type HttpMethod = 'post' | 'get' | 'put' | 'delete';
type RequestContentType = 'form' | 'json' | 'formdata';

const http = axios.create({
  baseURL: '/sd-api',
  timeout: 10000,
});

function setHeader(config: AxiosRequestConfig, key: string, value: string) {
  if (!config.headers) {
    config.headers = { [key]: value };
    return;
  }
  if (config.headers instanceof AxiosHeaders) {
    config.headers.set(key, value);
    return;
  }
  (config.headers as Record<string, string>)[key] = value;
}

function joinPath(baseUrl: string, url: string) {
  if (!baseUrl) {
    return url;
  }
  if (!url) {
    return baseUrl;
  }
  if (baseUrl.endsWith('/') && url.startsWith('/')) {
    return `${baseUrl}${url.slice(1)}`;
  }
  if (!baseUrl.endsWith('/') && !url.startsWith('/')) {
    return `${baseUrl}/${url}`;
  }
  return `${baseUrl}${url}`;
}

function toFormData(payload: Record<string, unknown>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(payload)) {
    if (Array.isArray(value)) {
      value.forEach(item => {
        formData.append(key, item as any);
      });
      continue;
    }
    formData.append(key, value as any);
  }
  return formData;
}

http.interceptors.request.use(config => {
  try {
    const token = localStorage.getItem('t');
    if (token) {
      setHeader(config, 'Authorization', token);
      setHeader(config, 'token', token);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    // ignore storage errors
  }

  return config;
});

http.interceptors.response.use(
  response => {
    if (response.status === 200) {
      return response.data;
    }
    console.error('服务器出错或者连接不到服务器');
    return Promise.reject(response);
  },
  error => {
    if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
      console.error('连接不到服务器');
    }
    return Promise.reject(error);
  },
);

export default function request<T = any>(
  method: HttpMethod,
  url: string,
  submitData?: any,
  ContentType: RequestContentType = 'json',
  config?: AxiosRequestConfig,
) {
  const reqParams: AxiosRequestConfig = {
    ...config,
    method,
    url,
  };

  if (method === 'get' || method === 'delete') {
    reqParams.params = submitData;
  } else {
    if (ContentType === 'formdata' && submitData && !(submitData instanceof FormData)) {
      reqParams.data = toFormData(submitData as Record<string, unknown>);
    } else if (ContentType === 'form') {
      reqParams.data = submitData ? qs.stringify(submitData, { indices: false }) : submitData;
      setHeader(reqParams, 'Content-Type', 'application/x-www-form-urlencoded');
    } else {
      reqParams.data = submitData;
      setHeader(reqParams, 'Content-Type', 'application/json');
    }
  }

  return http.request<T, T>(reqParams);
}

export function createRequest(baseUrl: string) {
  return function <T = any>(
    method: HttpMethod,
    url: string,
    submitData?: any,
    ContentType: RequestContentType = 'json',
    config?: AxiosRequestConfig,
  ) {
    return request<T>(method, joinPath(baseUrl, url), submitData, ContentType, config);
  };
}
