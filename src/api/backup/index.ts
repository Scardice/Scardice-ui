import { createRequest } from '..';

const baseUrl = '/backup/';
const request = createRequest(baseUrl);

export function getBackupList() {
  return request<{ items: BackupInfo[] }>('get', 'list');
}

export function getBackupConfig() {
  return request<BackupConfig>('get', 'config_get');
}

export function setBackupConfig(data: BackupConfig) {
  return request('post', 'config_set', data);
}

export function postDoBackup(selection: number) {
  return request<BackupResult>('post', 'do_backup', { selection }, 'json', {
    'axios-retry': { retries: 0 },
  });
}

export function getBackupStatus() {
  return request<{ job: BackupJob | null }>('get', 'status');
}

export function postBackupDel(name: string) {
  return request<{ success: boolean }>('post', 'delete?name=' + name, { name });
}

export function postBackupBatchDel(names: string[]) {
  return request<
    | { result: true }
    | {
        result: false;
        fails: string[];
      }
  >('post', 'batch_delete', { names });
}

type BackupConfig = {
  autoBackupEnable: boolean;
  autoBackupTime: string;
  autoBackupSelection: number;
  backupCleanStrategy: number;
  backupCleanKeepCount: number;
  backupCleanKeepDur: string;
  backupCleanTrigger: number;
  backupCleanCron: string;
  autoBackupSelectionList: string[];
};
type BackupInfo = {
  name: string;
  fileSize: number;
  selection: number;
};
export interface BackupJob {
  id: string;
  status: 'running' | 'succeeded' | 'failed';
  stage: 'preparing' | 'snapshot' | 'collecting' | 'archiving' | 'finalizing';
  completedFiles: number;
  totalFiles: number;
  filename?: string;
  error?: string;
  startedAt: number;
  finishedAt?: number;
}

type BackupResult = { success: true; job: BackupJob } | { testMode: true };
