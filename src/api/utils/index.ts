import { createRequest } from '..';

const baseUrl = '/utils/';
const request = createRequest(baseUrl);

export function getNewUtils() {
  return request<
    | { result: true; checked: boolean; news: string; newsMark: string }
    | { result: false; err?: string }
  >('get', 'news');
}

export function postUtilsCheckNews(newsMark: string) {
  return request<{ result: true; newsMark: string } | { result: false }>('post', 'check_news', {
    newsMark,
  });
}

export function postUtilsCheckCronExpr(expr: string) {
  return request('post', 'check_cron_expr', { expr });
}

export type UtilsNetworkHealthTarget = {
  target: 'qq' | 'kook' | 'discord' | 'telegram' | 'dingtalk' | 'slack';
  ok: boolean;
  duration: number;
  statusCode: number;
};

export type UtilsNetworkHealthResponse = {
  result: true;
  total: 6;
  ok: UtilsNetworkHealthTarget['target'][];
  targets: UtilsNetworkHealthTarget[];
  timestamp: number;
};

export function getUtilsCheckNetWorkHealth() {
  // 后端按平台重试；HTTP 层重试会重复整组探测。
  return request<UtilsNetworkHealthResponse | { result: false }>(
    'get',
    'check_network_health',
    undefined,
    'json',
    { 'axios-retry': { retries: 0 } },
  );
}
