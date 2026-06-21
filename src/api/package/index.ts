import type { AxiosProgressEvent, AxiosRequestConfig } from 'axios';
import { createRequest, http } from '..';
import type { ApiResponse } from '../types';

const baseUrl = '/package/';
const request = createRequest(baseUrl);

const uploadTimeout = 120000;
const fallbackPackageFilename = 'package.sealpack';

type PackageUploadFile = Blob & { name?: string };

function packageUploadRequestConfig(
  file: PackageUploadFile,
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void,
): AxiosRequestConfig {
  return {
    headers: {
      'Content-Type': 'application/octet-stream',
      'X-Filename': encodeURIComponent(file.name ?? fallbackPackageFilename),
    },
    timeout: uploadTimeout,
    onUploadProgress,
  };
}

function postPackageUpload<T>(
  url: string,
  file: PackageUploadFile,
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void,
) {
  return http.request<ApiResponse<T>, ApiResponse<T>>({
    ...packageUploadRequestConfig(file, onUploadProgress),
    method: 'post',
    url: `${baseUrl}${url}`,
    data: file,
  });
}

export function getPackageList() {
  return request<ApiResponse<PackageInstance[]>>('get', 'list');
}

export function refreshPackageInstallations() {
  return request<ApiResponse<PackageRefreshResult>>('post', 'refresh');
}

export function getPackageDetail(id: string) {
  return request<ApiResponse<PackageInstance>>('get', '_', { id });
}

export function installPackageByUrl(payload: PackageInstallUrlPayload) {
  return request<ApiResponse>('post', 'install-url', payload);
}

export function previewPackageUpload(
  file: PackageUploadFile,
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void,
) {
  return postPackageUpload<PackageUploadPreview>('preview-upload', file, onUploadProgress);
}

export function installPackageByUpload(
  file: PackageUploadFile,
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void,
) {
  return postPackageUpload('install-upload', file, onUploadProgress);
}

export function enablePackage(id: string) {
  return request<ApiResponse>('post', 'enable', { id });
}

export function disablePackage(id: string) {
  return request<ApiResponse>('post', 'disable', { id });
}

export function reloadPackage(id: string) {
  return request<ApiResponse>('post', 'reload', { id });
}

export function reloadPackageByContent(content: ContentKind) {
  return request<ApiResponse>('post', 'reload-content', { content });
}

export function reloadAllPackages() {
  return request<ApiResponse>('post', 'reload-all');
}

export function uninstallPackage(payload: PackageUninstallPayload) {
  return request<ApiResponse>('post', 'uninstall', payload);
}

export function getPackageConfig(id: string) {
  return request<ApiResponse<Record<string, unknown>>>('get', '_/config', { id });
}

export function setPackageConfig(id: string, config: Record<string, unknown>) {
  return request<ApiResponse>('post', `_/config?id=${encodeURIComponent(id)}`, config);
}

export function getPackageConfigSchema(id: string) {
  return request<ApiResponse<Record<string, unknown>>>('get', '_/config-schema', { id });
}

export type ContentKind = 'scripts' | 'decks' | 'reply' | 'helpdoc' | 'templates';

export interface PackageManifest {
  formatVersion?: string;
  package: PackageMetadata;
  dependencies?: Record<string, string>;
  permissions?: PackagePermissions;
  contents?: Partial<Record<ContentKind, string[]>>;
  store?: PackageStoreAssets;
  config?: Record<string, unknown>;
}

export interface PackageMetadata {
  id: string;
  name: string;
  version: string;
  authors?: string[];
  license?: string;
  description?: string;
  homepage?: string;
  repository?: string;
  keywords?: string[];
  seal?: PackageSealCompatibility;
}

export interface PackageSealCompatibility {
  minVersion?: string;
  maxVersion?: string;
}

export interface PackagePermissions {
  configs?: boolean;
  decks?: boolean;
  helpdoc?: boolean;
  js?: boolean;
  reply?: boolean;
  templates?: boolean;
  [key: string]: unknown;
}

export interface PackageStoreAssets {
  icon?: string;
  readme?: string;
  screenshots?: string[];
  [key: string]: unknown;
}

export type PackageState = 'installed' | 'enabled' | 'disabled' | 'error';
export type PackageSourceStatus = 'present' | 'cache_only';

export interface PackageInstance {
  manifest: PackageManifest;
  state: PackageState;
  installTime?: string;
  installPath?: string;
  sourcePath?: string;
  userDataPath?: string;
  config?: Record<string, unknown>;
  errText?: string;
  sourceStatus?: PackageSourceStatus;
  sourceWarning?: string;
  pendingReload?: ContentKind[];
}

export interface PackageRefreshResult {
  added?: string[];
  updated?: string[];
  cacheOnly?: string[];
  removed?: string[];
}

export interface PackageUploadPreview {
  manifest: PackageManifest;
  files?: string[];
  fileCount?: number;
  counts?: Partial<Record<ContentKind, number>>;
  contentCounts?: Partial<Record<ContentKind | 'assets', number>>;
  existingVersion?: string;
  action?: 'install' | 'upgrade' | 'downgrade' | 'reinstall';
  installAction?: 'install' | 'upgrade' | 'downgrade' | 'reinstall';
}

export interface PackageInstallUrlPayload {
  url: string;
}

export interface PackageUninstallPayload {
  id: string;
  mode: 'full' | 'keep_data';
}
