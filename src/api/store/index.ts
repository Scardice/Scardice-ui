import { createRequest } from '..';
import type { ContentKind, PackageUploadPreview } from '~/api/package';
import type { ApiResponse } from '../types';

const baseUrl = '/store/';
const request = createRequest(baseUrl);

export function getStoreBackendList() {
  return request<ApiResponse<StoreBackendRecord[]>>('get', 'backend/list');
}

export function addStoreBackend(url: string) {
  return request<ApiResponse>('post', 'backend/add', { url });
}

export function removeStoreBackend(payload: Partial<StoreBackendRecord>) {
  return request<ApiResponse>('delete', 'backend/remove', payload);
}

export function setStoreBackendEnabled(payload: Partial<StoreBackendRecord>, enabled: boolean) {
  return request<ApiResponse>('post', enabled ? 'backend/enable' : 'backend/disable', payload);
}

export function getStoreRecommend(params?: StoreRecommendQuery) {
  return request<ApiResponse<StorePackageListPayload>>('get', 'recommend', params);
}

export function getStorePage(params: StorePageQuery) {
  return request<ApiResponse<StorePackageListPayload>>('get', 'page', params);
}

export function previewStorePackageDownload(payload: DownloadStorePackagePayload) {
  return request<ApiResponse<PackageUploadPreview>>('post', 'preview-download', payload);
}

export function downloadStorePackage(payload: DownloadStorePackagePayload) {
  return request<ApiResponse>('post', 'download', payload);
}

export interface StorePackage {
  backendID?: string;
  id: string;
  version: string;
  name: string;
  authors: string[];
  description: string;
  license: string;
  homepage?: string;
  repository?: string;
  keywords: string[];
  contents: ContentKind[];
  seal: {
    minVersion?: string;
    maxVersion?: string;
  };
  dependencies: Record<string, string>;
  storeAssets: StorePackageAssets;
  download: StorePackageDownload;
  installed?: boolean;
}

export interface StorePackageAssets {
  readme?: string;
  icon?: string;
  banner?: string;
  screenshots?: string[];
  category?: string;
}

export interface StorePackageDownload {
  url: string;
  hash?: Record<string, string>;
  releaseTime?: number;
  updateTime?: number;
  downloadCount?: number;
}

export type StorePackageListPayload =
  | StorePackage[]
  | {
      list?: StorePackage[];
      items?: StorePackage[];
    };

export interface StoreBackendRecord {
  backendID?: string;
  id?: string;
  name?: string;
  url?: string;
  type?: string;
  builtin?: boolean;
  official?: boolean;
  health?: boolean;
  enabled?: boolean;
  disabled?: boolean;
  [key: string]: unknown;
}

export interface StorePageQuery {
  backend?: string;
  content?: ContentKind | 'all';
  author?: string;
  name?: string;
  category?: string;
  sortBy?: string;
  order?: string;
  pageNum?: number;
  pageSize?: number;
}

export interface StoreRecommendQuery {
  backend?: string;
}

export interface DownloadStorePackagePayload {
  id: string;
  version: string;
}
