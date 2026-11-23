import { createRequest } from '..';

const baseUrl = '/log/';
const request = createRequest(baseUrl);

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface SysLog {
  level: string;
  ts: number;
  caller: string;
  msg: string;
  seq?: number;
}

export interface LogHistoryParams {
  beforeSeq?: number;
  limit?: number;
  levels?: string;
  startTs?: number;
  endTs?: number;
  q?: string;
}

export interface LogHistoryResult {
  items: SysLog[];
  hasMore: boolean;
  nextBeforeSeq: number;
}

export function getLogHistory(params: LogHistoryParams) {
  return request<LogHistoryResult>('get', 'history', params);
}
