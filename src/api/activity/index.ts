import { createRequest } from '..';

const request = createRequest('/activity/');

export type ManagementActivityStatus = 'succeeded' | 'accepted' | 'failed';

export type ManagementActivityItem = {
  id: string;
  occurredAt: number;
  action: string;
  label: string;
  resource: string;
  status: ManagementActivityStatus;
  httpStatus: number;
  actor: string;
  sourceIP: string;
};

export type RecentActivityResponse = {
  result: true;
  items: ManagementActivityItem[];
  timestamp: number;
};

export function getRecentActivity(limit = 20) {
  return request<RecentActivityResponse>('get', 'recent', { limit });
}
