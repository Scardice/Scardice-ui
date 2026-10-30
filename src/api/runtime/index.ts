import type { AxiosProgressEvent } from 'axios';
import { createRequest, http } from '..';
import type { ApiResponse } from '../types';

const baseUrl = '/js/runtime/';
const request = createRequest(baseUrl);
const runtimeArchiveUploadTimeout = 120000;

export interface JSRuntimeStatus {
  id: string;
  installed: boolean;
  loaded: boolean;
  builtin: boolean;
  managed: boolean;
  version: string;
  author: string;
  abi: string;
  path: string;
  capabilities: string[];
  extensions: string[];
  error?: string;
}

export interface JSRuntimePendingChange {
  id: string;
  action: 'install' | 'uninstall';
  name?: string;
  version?: string;
}

export interface JSRuntimeManagement {
  runtimes: JSRuntimeStatus[];
  discoveryError: string;
  defaultRuntime: string;
  extensionRoutes: Record<string, string>;
  pendingChanges: JSRuntimePendingChange[];
}

export interface JSRuntimeConfigPayload {
  defaultRuntime: string;
  extensionRoutes: Record<string, string>;
}

export interface JSRuntimeActionResponse extends ApiResponse {
  pendingChange?: JSRuntimePendingChange;
}

export function getJSRuntimeManagement() {
  return request<JSRuntimeManagement>('get', 'management');
}

export function setJSRuntimeConfig(payload: JSRuntimeConfigPayload) {
  return request<ApiResponse>('post', 'config', payload, 'json', {
    'axios-retry': { retries: 0 },
  });
}

export function installJSRuntimeArchive(
  file: File,
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void,
) {
  return http.request<JSRuntimeActionResponse, JSRuntimeActionResponse>({
    method: 'post',
    url: `${baseUrl}install`,
    data: file,
    headers: { 'Content-Type': 'application/octet-stream' },
    timeout: runtimeArchiveUploadTimeout,
    onUploadProgress,
    'axios-retry': { retries: 0 },
  });
}

export function uninstallJSRuntime(id: string) {
  return request<JSRuntimeActionResponse>('post', 'uninstall', { id }, 'json', {
    'axios-retry': { retries: 0 },
  });
}
