import { apiBaseURL, createRequest } from '..';
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
  return request<StorePageResponse>('get', 'page', params);
}

export function previewStorePackageDownload(payload: DownloadStorePackagePayload) {
  return request<ApiResponse<PackageUploadPreview>>('post', 'preview-download', payload);
}

export function downloadStorePackage(payload: DownloadStorePackagePayload) {
  return request<ApiResponse>('post', 'download', payload);
}

const getStorePackageParts = (id: string) => {
  const separator = id.indexOf('/');
  if (separator <= 0 || separator === id.length - 1) {
    return null;
  }
  return {
    namespace: id.slice(0, separator),
    packageName: id.slice(separator + 1),
  };
};

const getStoreApiUrl = (pkg: StorePackage, backendUrl = '') => {
  try {
    if (backendUrl.trim()) {
      return new URL(backendUrl);
    }
    const url = new URL(pkg.download.url);
    const packagesPathIndex = url.pathname.indexOf('/packages/');
    if (packagesPathIndex < 0) {
      return null;
    }
    url.pathname = url.pathname.slice(0, packagesPathIndex);
    url.search = '';
    url.hash = '';
    return url;
  } catch {
    return null;
  }
};

// 资源预览统一走本项目后端的 /store/file 代理：core 侧在该路由上补了
// Cache-Control、X-Content-Type-Options 与 CSP 响应头，直连商店后端会丢掉这些防护。
export function getStorePackageAssetUrl(pkg: StorePackage, path: string) {
  const asset = path.trim();
  if (!asset) {
    return '';
  }
  if (/^https?:\/\//i.test(asset) || /^(data|blob):/i.test(asset)) {
    return asset;
  }

  const packageParts = getStorePackageParts(pkg.id);
  if (!packageParts) {
    return '';
  }
  const previewPath = `${apiBaseURL}/store/file/${encodeURIComponent(
    packageParts.namespace,
  )}/${encodeURIComponent(packageParts.packageName)}/${encodeURIComponent(pkg.version)}`;
  return `${previewPath}?${new URLSearchParams({ path: asset.replace(/^\/+/, '') }).toString()}`;
}

export function getStorePackageDetailUrl(pkg: StorePackage, backendUrl = '') {
  const apiUrl = getStoreApiUrl(pkg, backendUrl);
  if (!apiUrl) {
    return '';
  }
  return getStorePackageDetailUrlById(pkg.id, apiUrl.toString());
}

export function getStorePackageDetailUrlById(id: string, backendUrl: string) {
  const packageParts = getStorePackageParts(id);
  if (!packageParts || !backendUrl.trim()) {
    return '';
  }
  let detailUrl: URL;
  try {
    detailUrl = new URL(backendUrl);
  } catch {
    return '';
  }
  detailUrl.pathname = '/packages';
  detailUrl.search = new URLSearchParams({
    namespace: packageParts.namespace,
    package: packageParts.packageName,
  }).toString();
  detailUrl.hash = '';
  return detailUrl.toString();
}

export function getStorePackageFiles(pkg: StorePackage) {
  const packageParts = getStorePackageParts(pkg.id);
  if (!packageParts) {
    return Promise.reject(new Error('商店扩展包 ID 格式无效'));
  }
  return request<ApiResponse<StorePackageFile[]>>(
    'get',
    `files/${encodeURIComponent(packageParts.namespace)}/${encodeURIComponent(
      packageParts.packageName,
    )}/${encodeURIComponent(pkg.version)}`,
  );
}

export function installStorePackageList(packages: StoreInstallListItem[]) {
  return request<ApiResponse<StoreInstallListResult>>(
    'post',
    'install-list',
    { packages },
    undefined,
    { timeout: 30 * 60 * 1000 },
  );
}

export function getStorePackageInfoList(packages: StoreInstallListItem[]) {
  return request<ApiResponse<StorePackageInfoListItem[]>>(
    'post',
    'package-info-list',
    { packages },
    undefined,
    { timeout: 2 * 60 * 1000 },
  );
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

export interface StorePageResponse extends ApiResponse<StorePackageListPayload> {
  pageNum?: number;
  pageSize?: number;
  next?: boolean;
}

export interface StoreRecommendQuery {
  backend?: string;
}

export interface DownloadStorePackagePayload {
  id: string;
  version: string;
}

export interface StoreInstallListItem {
  id: string;
  version: string;
}

export type StoreInstallListItemStatus = 'installed' | 'skipped' | 'failed';

export interface StoreInstallListItemResult extends StoreInstallListItem {
  status: StoreInstallListItemStatus;
  message?: string;
}

export interface StoreInstallListResult {
  items: StoreInstallListItemResult[];
  installed: number;
  skipped: number;
  failed: number;
}

export interface StorePackageInfoListItem extends StoreInstallListItem {
  name?: string;
  error?: string;
}

export interface StorePackageFile {
  path: string;
  size: number;
}
