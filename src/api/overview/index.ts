import request from '..';

export interface OverviewEndpoint {
  nickname: string;
  userId: string;
  platform: string;
  protocolType: string;
  state: number;
  enable: boolean;
  groupNum: number;
  cmdExecutedNum: number;
}

export interface OverviewProcess {
  cpuPercent: number;
  rssBytes: number;
  heapAllocBytes: number;
  sysBytes: number;
  goroutines: number;
  numGC: number;
  gomaxprocs: number;
  numCPU: number;
}

export interface OverviewSystem {
  available: boolean;
  cpuAvailable: boolean;
  memoryAvailable: boolean;
  diskAvailable: boolean;
  cpuPercent: number;
  cpuCount: number;
  load1: number;
  load5: number;
  load15: number;
  memTotalBytes: number;
  memAvailableBytes: number;
  memUsedPercent: number;
  diskTotalBytes: number;
  diskFreeBytes: number;
  diskUsedPercent: number;
}

export interface OverviewStorage {
  dataDir: string;
  dataBytes: number;
  defaultBytes: number;
  decksBytes: number;
  imagesBytes: number;
  helpdocBytes: number;
  logsDbBytes: number;
  backupsBytes: number;
}

export interface OverviewCounts {
  groups: number;
  players: number;
  logs: number;
  logItems: number;
  todayActiveGroups: number;
  todayMessages: number;
  todayCommands: number;
}

export interface OverviewBackup {
  autoEnable: boolean;
  autoTime: string;
  backupDir: string;
  backupCount: number;
  lastBackupTime: number;
  lastBackupSize: number;
}

export interface OverviewData {
  version: string;
  uptimeSeconds: number;
  collectedAt: number;
  process: OverviewProcess;
  system: OverviewSystem;
  storage: OverviewStorage;
  counts: OverviewCounts;
  backup: OverviewBackup;
  endpoints: OverviewEndpoint[];
}

export function getOverview() {
  return request<OverviewData>('get', 'overview', undefined, 'form', { timeout: 15000 });
}
