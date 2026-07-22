import type { Resource, ResourceType } from '~/store';
import { apiBaseURL, createRequest } from '..';
import type { UploadRawFile } from 'element-plus';

const baseUrl = '/resource';
const request = createRequest(baseUrl);
const imageResourcePathPattern = /^data\/images\/[^?#]+\.(?:png|jpe?g|gif)$/i;

export function getResourceDataUrl(path: string, thumbnail: boolean = false) {
  const normalizedPath = path.trim().replaceAll('\\', '/');
  if (!imageResourcePathPattern.test(normalizedPath)) {
    return undefined;
  }

  const params = new URLSearchParams({
    path: normalizedPath,
    thumbnail: String(thumbnail),
  });

  const token = localStorage.getItem('t');
  if (token) {
    params.set('token', token);
  }

  return `${apiBaseURL}/resource/data?${params.toString()}`;
}

export function getResourcePage(type: ResourceType) {
  return request<
    | { result: false; err: string }
    | {
        result: true;
        total?: number;
        data: Resource[];
      }
  >('get', '/page', { type });
}

export function createResource(files: UploadRawFile | Blob) {
  return request<{ result: false; err: string } | { result: true }>(
    'post',
    '',
    { files },
    'formdata',
  );
}

export function deleteResource(path: string) {
  return request<{ result: false; err: string } | { result: true }>('delete', '', { path });
}

export function saveResourceBlob(file: Blob, filename: string) {
  const upload = file instanceof File ? file : new File([file], filename, { type: file.type });
  return createResource(upload);
}

export function getResourceData(path: string, thumbnail: boolean = false) {
  return request<Blob>('get', '/data', { path, thumbnail }, 'form', {
    responseType: 'blob',
  });
}
