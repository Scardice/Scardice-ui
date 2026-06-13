import axios, { AxiosHeaders, type AxiosError, type AxiosRequestConfig } from 'axios';
import axiosRetry from 'axios-retry';
import qs from 'qs';

type HttpMethod = 'post' | 'get' | 'put' | 'delete';
type RequestContentType = 'form' | 'json' | 'formdata';

export const urlBase = import.meta.env.DEV
  ? ''
  : '//' + window.location.hostname + ':' + location.port;

export const apiBaseURL = `${urlBase}/sd-api`;
export const requestTimeout = 35000;

export const http = axios.create({
  baseURL: apiBaseURL,
  timeout: requestTimeout,
  withCredentials: false,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

axiosRetry(http, {
  retries: 3,
  retryDelay: retryCount => retryCount * 1000,
  retryCondition: error => {
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      return false;
    }
    return axiosRetry.isNetworkOrIdempotentRequestError(error);
  },
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

function getResponseErrorMessage(error: AxiosError) {
  const status = error.response?.status;
  if (status === 401) {
    return '登录已失效，请重新登录';
  }
  if (status === 403) {
    return '没有权限访问该资源';
  }
  if (status === 500) {
    return '服务器内部错误';
  }
  if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK' || !error.response) {
    return '连接不到服务器';
  }
  return '请求失败';
}

function handleResponseError(error: AxiosError) {
  const status = error.response?.status;

  if (status === 401 || status === 403) {
    try {
      localStorage.removeItem('t');
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      // ignore storage errors
    }
  }

  if (status === 401 || status === 403 || status === 500 || !error.response) {
    console.error(getResponseErrorMessage(error));
  }

  return Promise.reject(error);
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
    if (response.status >= 200 && response.status < 300) {
      return response.data;
    }
    return Promise.reject(response);
  },
  handleResponseError,
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
