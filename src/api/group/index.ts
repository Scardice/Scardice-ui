import { createRequest } from '..';

const baseUrl = '/group/';
const request = createRequest(baseUrl);

export function getGroupList() {
  return request<{
    items: GroupItem[];
  }>('get', 'list');
}

export function setGroup(config: GroupDetail) {
  return request('post', 'set_one', config);
}

export function postQuitGroup(config: QuitGroupConfig) {
  return request('post', 'quit_one', config);
}

export function deleteGroupLocalData(config: GroupLocalDataDeleteConfig) {
  return request<GroupLocalDataDeleteResponse>('post', 'local_data/delete', config);
}

type QuitGroupConfig = {
  groupId: string; // 群组ID
  diceId: string; // 骰子ID
  silence: boolean; // 是否开启静默模式
  extraText: string; // 额外的文本信息
};

export type GroupLocalDataDeleteScope = 'group_record' | 'players' | 'attrs';

export type GroupLocalDataDeleteConfig = {
  groupId: string; // 群组ID
  scopes?: GroupLocalDataDeleteScope[]; // 删除范围，默认只删除群组记录
  allowActive?: boolean; // 是否允许删除仍有启用骰号的群组
  dryRun?: boolean; // 是否只预览不删除
};

export type GroupLocalDataDeleteResult = {
  groupId: string;
  scopes: GroupLocalDataDeleteScope[];
  dryRun: boolean;
  existedInMemory: boolean;
  activeDiceIds: string[];
  existingDiceIds: string[];
  deleted: {
    groupRecord: boolean;
    groupInfoRows: number;
    playerRows: number;
    groupAttrRows: number;
    groupUserAttrRows: number;
  };
};

export type GroupLocalDataDeleteResponse =
  | {
      result: true;
      data: GroupLocalDataDeleteResult;
      testMode?: boolean;
    }
  | {
      result: false;
      err: string;
      data?: GroupLocalDataDeleteResult;
      supportedScopes?: GroupLocalDataDeleteScope[];
    };

type GroupItem = {
  active: boolean; // 群组是否激活
  activatedExtList: Extension[]; // 已激活的扩展插件列表
  groupId: string; // 群组ID
  guildId: string; // 公会ID（可能为空）
  channelId: string; // 频道ID（可能为空）
  groupName: string; // 群组名称
  diceIdActiveMap: { [diceId: string]: boolean }; // 激活的骰子ID映射
  diceIdExistsMap: { [diceId: string]: boolean }; // 存在的骰子ID映射
  // botList: { [botId: string]: any };  // 机器人列表（可能为空）
  diceSideNum: number; // 骰子的面数
  system: string; // 使用的系统（如COC7）
  // helpPackages: any;  // 帮助包（可能为空）
  cocRuleIndex: number; // COC规则索引
  logCurName: string; // 当前日志名称
  logOn: boolean; // 是否启用日志
  recentDiceSendTime: number; // 最近一次骰子发送时间
  showGroupWelcome: boolean; // 是否显示群组欢迎信息
  groupWelcomeMessage: string; // 群组欢迎消息
  enteredTime: number; // 加入时间
  inviteUserId: string; // 邀请用户的ID
  inviter?: GroupInviterInfo; // 邀请人展示信息
  tmpPlayerNum: number; // 临时玩家数量
  tmpExtList: string[]; // 临时扩展列表
  defaultHelpGroup: string; // 默认帮助组
};

type GroupDetail = {
  active: boolean; // 群组是否处于激活状态
  activatedExtList: Extension[]; // 已激活的扩展插件列表
  groupId: string; // 群组ID
  guildId: string; // 公会ID（可能为空）
  channelId: string; // 频道ID（可能为空）
  groupName: string; // 群组名称
  diceIdActiveMap: { [diceId: string]: boolean }; // 激活的骰子ID映射
  diceIdExistsMap: { [diceId: string]: boolean }; // 存在的骰子ID映射
  // botList: { [botId: string]: any };  // 机器人列表
  diceSideNum: number; // 骰子的面数
  system: string; // 使用的系统（如 "coc7" 表示使用COC7规则）
  // helpPackages: any;  // 帮助包（可能为空）
  cocRuleIndex: number; // COC规则索引
  logCurName: string; // 当前日志文件名称
  logOn: boolean; // 是否启用日志记录
  recentDiceSendTime: number; // 最近一次发送骰子的时间戳
  showGroupWelcome: boolean; // 是否显示群组欢迎消息
  groupWelcomeMessage: string; // 群组欢迎消息内容
  enteredTime: number; // 群组的加入时间戳
  inviteUserId: string; // 邀请用户的ID
  inviter?: GroupInviterInfo; // 邀请人展示信息
  tmpPlayerNum: number; // 临时玩家数量
  tmpExtList: string[]; // 临时激活的扩展插件列表
  defaultHelpGroup: string; // 默认帮助组
  changed: boolean; // 是否有变更
};

type GroupInviterInfo = {
  userId: string; // Scardice 标准ID
  rawId: string; // 平台原始ID
  qq: string; // QQ号
  name: string; // 缓存昵称
  display: string; // 后端生成的展示文本
};

type Extension = {
  name: string; // 插件名称
  aliases: string[] | null; // 插件的别名（可能为空）
  version: string; // 插件版本
};
