import type { Component } from 'vue';
import {
  Brush,
  ChatLineSquare,
  Collection,
  Cpu,
  DataLine,
  Document,
  EditPen,
  Filter,
  FolderChecked,
  Grid,
  Help,
  Lock,
  MagicStick,
  Notebook,
  Odometer,
  Operation,
  Picture,
  Promotion,
  Setting,
  SetUp,
  Share,
  Shop,
  Star,
  Tickets,
  Tools,
  User,
  UserFilled,
} from '@element-plus/icons-vue';

export type NavigationGroup = 'texts' | 'extensions' | 'settings' | 'tools';
export interface NavigationPage {
  path: string;
  label: string;
  icon: Component;
  hint: string;
  group: NavigationGroup | 'primary' | 'footer';
  aliases?: string;
  category?: string;
}

export const navigationGroups: { key: NavigationGroup; label: string; icon: Component }[] = [
  { key: 'texts', label: '自定义文案', icon: EditPen },
  { key: 'extensions', label: '扩展功能', icon: Grid },
  { key: 'settings', label: '综合设置', icon: Operation },
  { key: 'tools', label: '辅助工具', icon: Tools },
];

const pages: NavigationPage[] = [
  {
    path: '/home',
    label: '运行概览',
    aliases: '主页 首页',
    icon: Odometer,
    hint: '运行状态、账号与最近活动',
    group: 'primary',
  },
  {
    path: '/connect',
    label: '账号设置',
    icon: User,
    hint: '连接账号、适配器与登录配置',
    group: 'primary',
  },
  {
    path: '/logs',
    label: '实时日志',
    icon: Tickets,
    hint: '运行日志、级别筛选与事件详情',
    group: 'primary',
  },
  {
    path: '/mod/reply',
    label: '自定义回复',
    icon: ChatLineSquare,
    hint: '触发条件、回复规则与文件管理',
    group: 'extensions',
  },
  {
    path: '/mod/deck',
    label: '牌堆管理',
    icon: Collection,
    hint: '牌堆内容、上传与启用状态',
    group: 'extensions',
  },
  {
    path: '/mod/story',
    label: '跑团日志',
    icon: Notebook,
    hint: '团录列表、记录详情与导出',
    group: 'extensions',
  },
  {
    path: '/mod/js',
    label: 'JS 扩展',
    aliases: '插件管理 JavaScript 脚本',
    icon: MagicStick,
    hint: '插件启用、重载、控制台与配置',
    group: 'extensions',
  },
  {
    path: '/mod/runtime',
    label: 'JS 运行时',
    aliases: 'JavaScript runtime',
    icon: Cpu,
    hint: '运行时包、实例与诊断',
    group: 'extensions',
  },
  {
    path: '/mod/helpdoc',
    label: '帮助文档',
    icon: Help,
    hint: '帮助条目、文档文件与搜索',
    group: 'extensions',
  },
  {
    path: '/mod/censor',
    label: '拦截管理',
    icon: Filter,
    hint: '敏感词、拦截规则与记录',
    group: 'extensions',
  },
  {
    path: '/mod/package',
    label: '扩展商店',
    icon: Shop,
    hint: '资源包、扩展浏览与安装管理',
    group: 'extensions',
  },
  {
    path: '/misc/base-setting',
    label: '基本设置',
    icon: Setting,
    hint: '骰点规则、消息、权限与基础配置',
    group: 'settings',
  },
  {
    path: '/misc/group',
    label: '群组管理',
    icon: UserFilled,
    hint: '群组列表、启用状态与群配置',
    group: 'settings',
  },
  {
    path: '/misc/ban',
    label: '黑白名单',
    icon: Lock,
    hint: '信任名单、封禁记录与管理',
    group: 'settings',
  },
  {
    path: '/misc/dice-public',
    label: '公骰设置',
    icon: Share,
    hint: '公骰信息与公开展示配置',
    group: 'settings',
  },
  {
    path: '/misc/backup',
    label: '备份',
    icon: FolderChecked,
    hint: '数据备份与恢复',
    group: 'settings',
  },
  {
    path: '/misc/advanced-setting',
    label: '高级设置',
    icon: SetUp,
    hint: '进阶行为与运行参数',
    group: 'settings',
  },
  {
    path: '/tool/test',
    label: '指令测试',
    icon: Promotion,
    hint: '模拟会话、执行指令与调试',
    group: 'tools',
  },
  {
    path: '/tool/resource',
    label: '资源管理',
    icon: Picture,
    hint: '图片、音频与资源文件',
    group: 'tools',
  },
  {
    path: '/tool/ui-beautify',
    label: 'UI 美化',
    aliases: '主题 配色 背景 字体',
    icon: Brush,
    hint: '界面配色、背景与字体',
    group: 'tools',
  },
  {
    path: '/tool/pprof',
    label: '性能分析',
    icon: DataLine,
    hint: '运行性能与调试工具',
    group: 'tools',
  },
  { path: '/about', label: '关于', icon: Star, hint: '版本信息与使用说明', group: 'footer' },
];

export function buildNavigation(categories: string[], showAdvanced: boolean): NavigationPage[] {
  const textPages = categories.map(category => ({
    path: `/custom-text/${encodeURIComponent(category)}`,
    label: category,
    category,
    icon: Document,
    hint: `${category} 自定义文案与变量`,
    aliases:
      category === 'COC' ? 'COC7 克苏鲁 文案管理' : category === 'DND' ? '龙与地下城' : '文案管理',
    group: 'texts' as const,
  }));
  return [
    ...pages.filter(page => page.group === 'primary'),
    ...textPages,
    ...pages.filter(
      page => page.group !== 'primary' && (showAdvanced || page.path !== '/misc/advanced-setting'),
    ),
  ];
}

export function groupLabel(group: NavigationPage['group']): string {
  return (
    navigationGroups.find(item => item.key === group)?.label ??
    (group === 'footer' ? '关于' : '运行与账号')
  );
}

export function searchNavigation(entries: NavigationPage[], query: string): NavigationPage[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/u).filter(Boolean);
  return entries.filter(page => {
    const text =
      `${page.label} ${page.aliases ?? ''} ${page.hint} ${groupLabel(page.group)}`.toLocaleLowerCase();
    return terms.every(term => text.includes(term));
  });
}
