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
  updateUrls?: string[];
  official: boolean;
  builtin: boolean;
  builtinUpdated: boolean;
  hasDangerousApiUsage: boolean;
  dangerousApiUsages: JsDangerousAPIUsage[];
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
  keyWords: string;
}

export interface AdvancedConfig {
  show: boolean;
  enable: boolean;
  storyLogBackendUrl: string;
  storyLogApiVersion: string;
  storyLogBackendToken: string;
  exposeDangerousSealInst: boolean;
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
  jointScorePercentOfGroup: number;
  jointScorePercentOfInviter: number;
}
