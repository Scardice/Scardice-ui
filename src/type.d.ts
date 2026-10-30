import type BanConfig from './components/misc/banList/BanConfig.vue';

export interface JsDangerousAPIUsage {
  id: string;
  name: string;
  description: string;
  risk: string;
  occurrences: JsDangerousAPIOccurrence[];
  referencedMembers: string[];
}

export interface JsDangerousAPIOccurrence {
  line: number;
  column: number;
  kind: string;
  member: string;
  access: string;
  memberDescription: string;
}

export interface JsMemoryAmount {
  objects: number;
  bytes: number;
}

/** 插件存活 JS 堆的估算值；小对象为采样估计，大对象逐个跟踪 */
export interface JsMemoryUsage {
  /** ok：已统计；pending：运行时尚未完成首次统计；unsupported：该运行时不支持统计 */
  status: 'ok' | 'pending' | 'unsupported';
  objects: number;
  bytes: number;
  object: JsMemoryAmount;
  array: JsMemoryAmount;
  arrayBuffer: JsMemoryAmount;
  /** 逐个跟踪的大对象部分 */
  large: JsMemoryAmount;
  /** 支撑小对象估算的存活采样数 */
  samples: number;
  /** 统计时间（Unix 毫秒） */
  sweptAt: number;
}

export interface JsScriptInfo {
  name: string;
  enable: boolean;
  version: string;
  author: string;
  license: string;
  homepage: string;
  desc: string;
  grant?: string;
  updateTime: number;
  installTime: number;
  errText: string;
  filename: string;
  extensionNames?: string[];
  updateUrls?: string[];
  official: boolean;
  builtin: boolean;
  builtinUpdated: boolean;
  packageID?: string;
  hasDangerousApiUsage: boolean;
  dangerousApiUsages: JsDangerousAPIUsage[];
  /** 未运行的插件为 null */
  memory?: JsMemoryUsage | null;
}

export interface JsPluginConfigItem {
  key: string;
  type: string;
  group?: string;
  defaultValue: any;
  value: any;
  option: any[];
  deprecated: boolean;
  description: string;
}

export interface JsPluginConfig {
  pluginName: string;
  configs: JsPluginConfigItem[];
}

export interface HelpDocData {
  helpInfo: HelpDocHelpInfo;
  docTree: HelpDoc[];
}

export interface HelpDocHelpInfo {
  [key: string]: number;
}

export interface HelpDoc {
  name: string;
  path: string;
  group: string;
  type: '.json' | '.xlsx';
  isDir: boolean;
  loadStatus: 0 | 1 | 2;
  deleted: boolean;
  packageId?: string;

  children: HelpDoc[] | null;
}

export interface HelpTextItemQuery {
  pageNum: number;
  pageSize: number;
  total: number;
  id?: number;
  group?: string;
  from?: string;
  title?: string;
}

export interface HelpTextItem {
  id: number;
  group: string;
  from: string;
  title: string;
  content: string;
  packageName: string;
  packageId?: string;
  keyWords: string;
}

export interface AdvancedConfig {
  show: boolean;
  enable: boolean;
  storyLogBackendUrl: string;
  storyLogApiVersion: string;
  storyLogBackendToken: string;
  customReplyCooldown: number;
  exposeDangerousSealInst: boolean;
  allowFilesystemUnrestrictedAccess: boolean;
}

export interface BanConfig {
  banBehaviorRefuseReply: boolean;
  banBehaviorRefuseInvite: boolean;
  banBehaviorQuitLastPlace: boolean;
  banBehaviorQuitPlaceImmediately: boolean;
  banBehaviorQuitIfAdmin: boolean;
  banBehaviorQuitIfAdminSilentIfNotAdmin: boolean;

  thresholdWarn: number;
  thresholdBan: number;
  scoreGroupMuted: number;
  scoreGroupKicked: number;
  scoreTooManyCommand: number;
  scoreReducePerMinute: number;
  banNotifyIntervalMinutes: number;
  jointScorePercentOfGroup: number;
  jointScorePercentOfInviter: number;
}
