export const ALL_NOTICE_CATEGORIES = [
  'group',
  'invite',
  'ban',
  'censor',
  'inactive',
  'send',
  'system',
] as const;

export type NoticeCategory = (typeof ALL_NOTICE_CATEGORIES)[number];

export const NOTICE_CATEGORY_LABELS = {
  group: '群组事件',
  invite: '邀请事件',
  ban: '黑名单事件',
  censor: '敏感词事件',
  inactive: '不活跃群清理',
  send: 'send 留言',
  system: '系统事件',
} as const satisfies Record<NoticeCategory, string>;

export const NOTICE_CATEGORY_DESCRIPTIONS = {
  group: '入群、退群、被踢、被禁言、自动激活、手动退群等',
  invite: '群邀请与好友邀请',
  ban: '黑名单等级提升、黑名单用户/群处理',
  censor: '敏感词处理器配置为“通知骰主”时的提示',
  inactive: '自动清理不活跃群组的逐条或摘要通知',
  send: '用户通过 .send 指令的留言',
  system: '存活确认、连接中断、账号风控等系统通知',
} as const satisfies Record<NoticeCategory, string>;

export interface NoticeItem {
  id: string;
  enabled: boolean;
  categories: NoticeCategory[];
  categoriesDirty: boolean;
}

const MAIL_PREFIX = 'Mail:';
const META_SUFFIX_DISABLE = 'disable';
const META_PREFIX_ONLY = 'only=';

function normalizeNoticeCategories(categories: readonly string[]): NoticeCategory[] {
  const selected = new Set(categories);
  return ALL_NOTICE_CATEGORIES.filter(category => selected.has(category));
}

export function decodeNoticeId(raw: string): NoticeItem {
  const value = raw.trim();
  if (!value) {
    return { id: '', enabled: true, categories: [], categoriesDirty: false };
  }
  if (isMailNoticeItem(value)) {
    return { id: value, enabled: true, categories: [], categoriesDirty: false };
  }

  const parts = value.split(':');
  let end = parts.length;
  let enabled = true;
  let categories: NoticeCategory[] = [];
  let categoriesDirty = false;

  while (end > 1) {
    const suffix = parts[end - 1].trim();
    if (suffix === META_SUFFIX_DISABLE) {
      enabled = false;
      end--;
      continue;
    }
    if (suffix.startsWith(META_PREFIX_ONLY)) {
      if (!categoriesDirty) {
        categories = normalizeNoticeCategories(
          suffix
            .slice(META_PREFIX_ONLY.length)
            .split(',')
            .map(part => part.trim()),
        );
        categoriesDirty = true;
      }
      end--;
      continue;
    }
    break;
  }

  return {
    id: parts.slice(0, end).join(':').trim(),
    enabled,
    categories,
    categoriesDirty,
  };
}

export function encodeNoticeId(item: NoticeItem): string {
  const id = item.id.trim();
  if (!id) {
    return '';
  }
  if (isMailNoticeItem(id)) {
    return id;
  }

  const segments = [id];
  if (!item.enabled) {
    segments.push(META_SUFFIX_DISABLE);
  }
  if (item.categoriesDirty) {
    segments.push(`${META_PREFIX_ONLY}${normalizeNoticeCategories(item.categories).join(',')}`);
  }
  return segments.join(':');
}

export function fromNoticeItems(items: readonly NoticeItem[]): string[] {
  return items.map(encodeNoticeId).filter(value => value !== '');
}

export function toNoticeItems(list: readonly string[] | undefined | null): NoticeItem[] {
  return (list ?? []).map(decodeNoticeId);
}

export function noticeItemPlatform(id: string): string | null {
  const colon = id.indexOf(':');
  if (colon <= 0) {
    return null;
  }

  const prefix = id.slice(0, colon);
  const dash = prefix.indexOf('-');
  const platform = dash === -1 ? prefix : prefix.slice(0, dash);
  return platform || null;
}

export function isMailNoticeItem(id: string): boolean {
  return id.startsWith(MAIL_PREFIX);
}
