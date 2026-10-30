import { getCustomText, saveCustomText } from '~/api/configs';
import {
  getAdvancedConfig,
  getDiceConfig,
  setAdvancedConfig,
  setDiceConfig,
  type DiceConfig,
} from '~/api/dice';
import {
  createEndpoint,
  enableEndpoint,
  getEndpoint,
  listEndpoints,
  waitForOperation,
  type EndpointCreateRequest,
  type EndpointView,
} from '~/api/endpoints';
import { getBaseInfo, getHello, getLogFetchAndClear, getPreInfo } from '~/api/others';
import { getSalt, signin } from '~/api/signin';

import type { addImConnectionForm } from '~/components/PageConnectInfoItems.vue';
import type { AdvancedConfig } from '~/type.d.ts';

// 为了区分无法连接到后端和可以连接到但有密码
function isNetworkError(e: unknown): boolean {
  const err = e as { response?: unknown; code?: string } | null;
  if (!err || !err.response) {
    return true;
  }
  return err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK';
}
export enum goCqHttpStateCode {
  Init = 0,
  InLogin = 1,
  InLoginQrCode = 2,
  InLoginBar = 3,
  MilkyLoginConnected = 4,
  MilkyLoginFailed = 5,
  InLoginVerifyCode = 6,
  InLoginDeviceLock = 7,
  MilkyLoginWaitingForConfirm = 8,
  MilkyLoginCancelled = 9,
  LoginSuccessed = 10,
  LoginFailed = 11,
  MilkyLoginCodeExpired = 12,
  Closed = 20,
}

export enum OfficialQQQRLoginState {
  Initial = 0,
  WaitingForScan = 1,
  Failed = 2,
}

export const ImConnectionTypeGocqLegacy = 0;
export const ImConnectionTypeDiscord = 1;
export const ImConnectionTypeKook = 2;
export const ImConnectionTypeTelegram = 3;
export const ImConnectionTypeMinecraft = 4;
export const ImConnectionTypeDodo = 5;
export const ImConnectionTypeOnebotSeparate = 6;
export const ImConnectionTypeRed = 7;
export const ImConnectionTypeDingTalk = 8;
export const ImConnectionTypeSlack = 9;
export const ImConnectionTypeOfficialQQ = 10;
export const ImConnectionTypeOnebotReverse = 11;
// no 12 type here
export const ImConnectionTypeSealChat = 13;
export const ImConnectionTypeSatori = 14;
export const ImConnectionTypeLagrangeOnebot = 15;
// 16 is langrange gocq, deprecated
export const ImConnectionTypeMilkySeparate = 17;
export const ImConnectionTypeMilkyInternal = 18;
export const ImConnectionTypeMilkyInternalLagrange = 19;
export const ImConnectionTypeMilkyInternalYogurt = 20;

export interface AdapterQQ {
  DiceServing: boolean;
  connectUrl: string;
  curLoginFailedReason: string;
  curLoginIndex: number;
  loginState: goCqHttpStateCode;
  inPackGoCqHttpLastRestricted: number;
  inPackGoCqHttpProtocol: number;
  inPackGoCqHttpAppVersion: string;
  implementation: string;
  useInPackGoCqhttp: boolean;
  goCqHttpLoginVerifyCode: string;
  goCqHttpLoginDeviceLockUrl: string;
  ignoreFriendRequest: boolean;
  goCqHttpSmsNumberTip: string;
  useSignServer: boolean;
  signServerConfig: any;
  redVersion: string;
  host: string;
  port: number;
  appID: number;
  isReverse: boolean;
  reverseAddr: string;
  builtinMode: 'gocq' | 'lagrange' | 'yogurt';
  built_in_mode: string; // Milky 的字段，跟 ob 不太一样
  signServerVer: string;
  signServerName: string;
  imageAssetBaseUrl: string;
  qrLoginState?: OfficialQQQRLoginState;
}

export interface TalkLogItem {
  id: number;
  /** 会话键：private:UI:1001 或 group:UI-Group:2001 */
  conversation: string;
  /** bot 为骰子回复，user 为测试用户发言，system 为界面提示 */
  kind: 'bot' | 'user' | 'system';
  /** 测试用户 ID（UI:xxx），仅 kind=user */
  senderId?: string;
  content: string;
  at: number;
}

export interface DiceConnection {
  id: string;
  state: number;
  platform: string;
  workDir: string;
  enable: boolean;
  ambiguous: boolean;
  protocolType: string;
  nickname: string;
  userId: number;
  groupNum: number;
  cmdExecutedNum: number;
  cmdExecutedLastTime: number;
  isPublic: boolean;
  endpointView: EndpointView;
  adapter: AdapterQQ;
}

function recordPayload(endpoint: EndpointView): Record<string, unknown> {
  return endpoint.config.payload;
}

function numberValue(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function endpointUserId(endpoint: EndpointView, payload: Record<string, unknown>): number {
  for (const value of [endpoint.providerId, payload.userId, payload.account, payload.accountHint]) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value !== 'string') continue;
    const separator = value.lastIndexOf(':');
    const candidate = separator >= 0 ? value.slice(separator + 1) : value;
    const parsed = Number(candidate);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function endpointPlatform(endpoint: EndpointView, payload: Record<string, unknown>): string {
  const platform = stringValue(payload.platform);
  if (platform.toLowerCase() === 'qq') return 'QQ';
  if (
    ['gocq', 'lagrange', 'milky', 'official_qq', 'pureonebot', 'red'].includes(endpoint.adapterKey)
  ) {
    return 'QQ';
  }
  return platform || endpoint.adapterKey;
}

function endpointProtocolType(endpoint: EndpointView): string {
  switch (endpoint.adapterKey) {
    case 'gocq':
    case 'lagrange':
    case 'pureonebot':
      return 'onebot';
    case 'official_qq':
      return 'official';
    default:
      return endpoint.adapterKey;
  }
}

export function endpointViewToDiceConnection(endpoint: EndpointView): DiceConnection {
  const payload = recordPayload(endpoint);
  const mode = stringValue(payload.mode);
  const observedState = endpoint.observedState.toLowerCase();
  const operationState = endpoint.operationState.toLowerCase();
  const hasBuiltinRuntime =
    mode === 'builtin' ||
    Boolean(payload.useInPackGoCqhttp) ||
    Boolean(payload.builtinMode) ||
    (endpoint.adapterKey === 'milky' && Boolean(payload.built_in_mode));
  let loginState = numberValue(payload.loginState);
  if (
    payload.loginState === undefined &&
    (hasBuiltinRuntime || endpoint.adapterKey === 'official_qq')
  ) {
    loginState =
      observedState === 'starting'
        ? endpoint.adapterKey === 'official_qq'
          ? goCqHttpStateCode.Init
          : goCqHttpStateCode.InLoginQrCode
        : observedState === 'connected'
          ? endpoint.adapterKey === 'milky'
            ? goCqHttpStateCode.MilkyLoginConnected
            : goCqHttpStateCode.LoginSuccessed
          : observedState === 'failed'
            ? goCqHttpStateCode.LoginFailed
            : goCqHttpStateCode.Init;
  }
  const adapter: AdapterQQ = {
    DiceServing: true,
    connectUrl: stringValue(
      payload.url || payload.clientUrl || payload.connectUrl || payload.ws_gateway,
    ),
    curLoginFailedReason: stringValue(payload.loginFailedReason),
    curLoginIndex: numberValue(payload.curLoginIndex),
    loginState: loginState as goCqHttpStateCode,
    inPackGoCqHttpLastRestricted: numberValue(payload.lastRestricted),
    inPackGoCqHttpProtocol: numberValue(payload.protocol),
    inPackGoCqHttpAppVersion: stringValue(payload.appVersion),
    implementation: stringValue(payload.implementation),
    useInPackGoCqhttp: hasBuiltinRuntime,
    goCqHttpLoginVerifyCode: stringValue(payload.loginVerifyCode),
    goCqHttpLoginDeviceLockUrl: stringValue(payload.loginDeviceLockUrl),
    ignoreFriendRequest:
      payload.friendRequestPolicy === 'ignore' ||
      payload.ignoreFriendRequest === true ||
      payload.ignore_friend_request === true,
    goCqHttpSmsNumberTip: stringValue(payload.smsNumberTip),
    useSignServer: payload.useSignServer === true,
    signServerConfig: payload.signServerConfig || {
      signServers: [{ url: '', key: '', authorization: '' }],
    },
    redVersion: stringValue(payload.redVersion),
    host: stringValue(payload.host),
    port: numberValue(payload.port),
    appID: numberValue(payload.appID ?? payload.appId),
    isReverse: mode === 'server' || Boolean(payload.isReverse),
    reverseAddr: stringValue(payload.listenAddress || payload.reverseUrl),
    builtinMode: stringValue(payload.builtinMode) as AdapterQQ['builtinMode'],
    built_in_mode: stringValue(payload.built_in_mode),
    signServerVer: stringValue(payload.signServerVersion),
    signServerName: stringValue(payload.signServerName),
    imageAssetBaseUrl: stringValue(payload.imageAssetBaseUrl),
    qrLoginState: numberValue(payload.qrLoginState) as OfficialQQQRLoginState,
  };
  const ambiguous = observedState === 'ambiguous' || operationState === 'ambiguous';
  const state =
    observedState === 'connected'
      ? 1
      : observedState === 'starting'
        ? 2
        : observedState === 'failed'
          ? 3
          : 0;
  const userId = endpointUserId(endpoint, payload);
  return {
    id: endpoint.endpointId,
    state,
    platform: endpointPlatform(endpoint, payload),
    workDir: stringValue(payload.workDir),
    enable: endpoint.desiredState.toLowerCase() !== 'disabled',
    ambiguous,
    protocolType: endpointProtocolType(endpoint),
    nickname: stringValue(endpoint.displayName || payload.nickname, endpoint.endpointId),
    userId,
    groupNum: numberValue(endpoint.groupNum ?? payload.groupNum),
    cmdExecutedNum: numberValue(endpoint.cmdExecutedNum ?? payload.cmdExecutedNum),
    cmdExecutedLastTime: numberValue(endpoint.cmdExecutedLastTime ?? payload.cmdExecutedLastTime),
    isPublic: Boolean(payload.isPublic),
    endpointView: endpoint,
    adapter,
  };
}
export const urlPrefix = 'sd-api';
export const adminAuthModeKey = 'scardice-auth-mode';
export const isAdminAuthMode = () => localStorage.getItem(adminAuthModeKey) === 'admin';

interface DiceServer {
  config: any;
  customTextsHelpInfo: {
    [k: string]: {
      [k: string]: {
        filename: string[];
        origin: string[][];
        vars: string[];
        modified: boolean;
        notBuiltin: boolean;
        topOrder: number;
        subType: string;
        extraText: string;
      };
    };
  };
  customTexts: { [k: string]: { [k: string]: string[][] } };
  previewInfo: {
    [key: string]: {
      version: string;
      textV2: string;
      textV1: string;
      presetExists: boolean;
      errV1: string;
      errV2: string;
    };
  };
  logs: { level: string; ts: number; caller: string; msg: string }[];
  conns: DiceConnection[];
  endpointViews: EndpointView[];
  baseInfo: DiceBaseInfo;
  qrcodes: { [key: string]: string };
}

interface DiceBaseInfo {
  appChannel: string;
  version: string;
  versionSimple: string;
  versionNew: string;
  versionNewNote: string;
  versionCode: number;
  versionNewCode: number;
  memoryAlloc: number;
  memoryUsedSys: number;
  uptime: number;
  OS: string;
  arch: string;
  justForTest: boolean;
  containerMode: boolean;
}

export type ResourceType = 'image' | 'audio' | 'video';

export interface Resource {
  type: ResourceType | 'unknown';
  name: string;
  ext: string;
  path: string;
  size: number;
}
type EndpointSecretReference = {
  secretRef: string;
  version: number;
};

function requireEndpointText(value: unknown, label: string): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) {
    throw new Error(`${label}不能为空`);
  }
  return text;
}

function requireEndpointPort(value: unknown, label: string): number {
  const port = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${label}必须是 1 到 65535 之间的整数`);
  }
  return port;
}

function setEndpointSecret(
  payload: Record<string, unknown>,
  secrets: Record<string, string>,
  field: string,
  secretRef: string,
  value: unknown,
  required = true,
) {
  const secret = typeof value === 'string' ? value.trim() : '';
  if (!secret) {
    if (required) {
      throw new Error(`${field}不能为空`);
    }
    return;
  }
  const reference: EndpointSecretReference = { secretRef, version: 1 };
  payload[field] = reference;
  secrets[secretRef] = secret;
}
function compactEndpointPayload(value: unknown): unknown {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }
  if (Array.isArray(value)) {
    const compacted = value
      .map(item => compactEndpointPayload(item))
      .filter(item => item !== undefined);
    return compacted.length > 0 ? compacted : undefined;
  }
  if (value && typeof value === 'object') {
    const compacted: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      const next = compactEndpointPayload(item);
      if (next !== undefined) compacted[key] = next;
    }
    return Object.keys(compacted).length > 0 ? compacted : undefined;
  }
  return value;
}

function endpointRequestFromForm(form: addImConnectionForm): EndpointCreateRequest {
  const payload: Record<string, unknown> = {};
  const secrets: Record<string, string> = {};
  let adapterKey: string;

  switch (form.accountType) {
    case ImConnectionTypeDiscord:
      adapterKey = 'discord';
      payload.version = '1';
      payload.guild = '';
      payload.channel = '';
      payload.proxyURL = form.proxyURL;
      payload.reverseProxyUrl = form.reverseProxyUrl;
      payload.reverseProxyCDNUrl = form.reverseProxyCDNUrl;
      setEndpointSecret(payload, secrets, 'token', 'token', form.token);
      break;
    case ImConnectionTypeKook:
      adapterKey = 'kook';
      payload.version = '1';
      payload.guild = '';
      payload.channel = '';
      payload.apiBaseURL = '';
      setEndpointSecret(payload, secrets, 'token', 'token', form.token);
      break;
    case ImConnectionTypeTelegram:
      adapterKey = 'telegram';
      payload.chatId = '';
      payload.webhookUrl = '';
      payload.proxyURL = form.proxyURL;
      payload.apiBaseURL = '';
      setEndpointSecret(payload, secrets, 'token', 'token', form.token);
      break;
    case ImConnectionTypeMinecraft:
      adapterKey = 'minecraft';
      payload.serverAddress = form.host;
      payload.username = form.account;
      payload.authMode = 'none';
      payload.connectUrl = requireEndpointText(form.url, 'Minecraft 连接地址');
      break;
    case ImConnectionTypeDodo:
      adapterKey = 'dodo';
      payload.islandId = '';
      payload.botId = '';
      payload.clientID = requireEndpointText(form.clientID, 'Dodo ClientID');
      payload.apiBaseURL = '';
      setEndpointSecret(payload, secrets, 'token', 'token', form.token);
      break;
    case ImConnectionTypeOnebotSeparate:
      adapterKey = 'pureonebot';
      payload.mode = 'client';
      payload.url = requireEndpointText(form.connectUrl, 'OneBot 连接地址');
      payload.reverseSuffix = '/ws';
      payload.accountHint = form.account;
      payload.friendRequestPolicy = form.ignoreFriendRequest ? 'ignore' : 'accept';
      payload.imageAssetBaseUrl = form.imageAssetBaseUrl;
      setEndpointSecret(payload, secrets, 'token', 'accessToken', form.accessToken, false);
      break;
    case ImConnectionTypeOnebotReverse:
      adapterKey = 'pureonebot';
      payload.mode = 'server';
      payload.listenAddress = requireEndpointText(form.reverseAddr, 'OneBot 监听地址');
      payload.reverseSuffix = '/ws';
      payload.accountHint = form.account;
      payload.friendRequestPolicy = form.ignoreFriendRequest ? 'ignore' : 'accept';
      payload.imageAssetBaseUrl = form.imageAssetBaseUrl;
      setEndpointSecret(payload, secrets, 'token', 'accessToken', form.accessToken);
      break;
    case ImConnectionTypeRed:
      adapterKey = 'red';
      payload.version = '1';
      payload.device = '';
      payload.protocol = String(form.protocol);
      payload.appId = '';
      payload.host = requireEndpointText(form.host, 'Red 主机');
      payload.port = requireEndpointPort(form.port, 'Red 端口');
      payload.redVersion = '';
      setEndpointSecret(payload, secrets, 'token', 'token', form.token);
      break;
    case ImConnectionTypeDingTalk:
      adapterKey = 'dingtalk';
      payload.clientId = requireEndpointText(form.clientID, '钉钉 ClientID');
      payload.robotCode = requireEndpointText(form.robotCode, '钉钉 RobotCode');
      payload.coolAppCode = '';
      payload.stream = true;
      setEndpointSecret(payload, secrets, 'token', 'token', form.token);
      break;
    case ImConnectionTypeSlack:
      adapterKey = 'slack';
      payload.version = '1';
      payload.channel = '';
      payload.apiBaseURL = '';
      setEndpointSecret(payload, secrets, 'appToken', 'appToken', form.appToken);
      setEndpointSecret(payload, secrets, 'botToken', 'botToken', form.botToken);
      break;
    case ImConnectionTypeOfficialQQ: {
      adapterKey = 'official_qq';
      const appID = form.appID;
      if (typeof appID !== 'number' || !Number.isInteger(appID) || appID <= 0) {
        throw new Error('官方 QQ AppID 必须是正整数');
      }
      payload.appId = appID;
      payload.onlyQQGuild = form.onlyQQGuild;
      payload.accountHint = form.account;
      setEndpointSecret(payload, secrets, 'appSecret', 'appSecret', form.appSecret);
      setEndpointSecret(payload, secrets, 'token', 'token', form.token);
      break;
    }
    case ImConnectionTypeSealChat:
      adapterKey = 'sealchat';
      payload.appId = '';
      payload.tenant = '';
      payload.connectUrl = requireEndpointText(form.url, 'SealChat 连接地址');
      setEndpointSecret(payload, secrets, 'token', 'token', form.token);
      break;
    case ImConnectionTypeSatori:
      adapterKey = 'satori';
      payload.version = '1';
      payload.platform = requireEndpointText(form.platform, 'Satori 平台').toLowerCase();
      payload.host = requireEndpointText(form.host, 'Satori 主机');
      payload.port = requireEndpointPort(form.port, 'Satori 端口');
      setEndpointSecret(payload, secrets, 'token', 'token', form.token);
      break;
    case ImConnectionTypeMilkySeparate:
      adapterKey = 'milky';
      payload.version = '1';
      payload.ws_gateway = requireEndpointText(form.wsGateway, 'Milky WebSocket Gateway');
      payload.rest_gateway = requireEndpointText(form.restGateway, 'Milky REST Gateway');
      payload.built_in_mode = '';
      payload.ignore_friend_request = form.ignoreFriendRequest;
      setEndpointSecret(payload, secrets, 'token', 'token', form.token);
      break;
    case ImConnectionTypeGocqLegacy:
      adapterKey = 'gocq';
      payload.useInPackGoCqhttp = true;
      payload.builtinMode = 'gocq';
      payload.account = requireEndpointText(form.account, 'QQ账号');
      payload.protocol = form.protocol;
      payload.appVersion = form.appVersion;
      payload.ignoreFriendRequest = form.ignoreFriendRequest;
      setEndpointSecret(payload, secrets, 'password', 'password', form.password, false);
      break;
    case ImConnectionTypeLagrangeOnebot:
      adapterKey = 'lagrange';
      payload.useInPackGoCqhttp = true;
      payload.builtinMode = 'lagrange';
      payload.account = requireEndpointText(form.account, 'QQ账号');
      payload.protocol = form.protocol;
      payload.appVersion = form.appVersion;
      payload.signServerName = form.signServerName;
      payload.signServerVersion = form.signServerVersion;
      payload.ignoreFriendRequest = form.ignoreFriendRequest;
      payload.imageAssetBaseUrl = form.imageAssetBaseUrl;
      break;
    case ImConnectionTypeMilkyInternal:
    case ImConnectionTypeMilkyInternalLagrange:
    case ImConnectionTypeMilkyInternalYogurt:
      adapterKey = 'milky';
      payload.version = '1';
      payload.built_in_mode =
        form.accountType === ImConnectionTypeMilkyInternalYogurt ? 'yogurt' : 'lagrangeV2';
      payload.account = requireEndpointText(form.account, 'QQ账号');
      payload.ignore_friend_request = form.ignoreFriendRequest;
      break;
    default:
      throw new Error('当前核心不支持该连接类型');
  }

  const compacted = compactEndpointPayload(payload);
  if (!compacted || typeof compacted !== 'object' || Array.isArray(compacted)) {
    throw new Error('连接配置不能为空');
  }
  return {
    displayName: form.nickname.trim() || undefined,
    adapterKey,
    config: {
      version: 1,
      payload: compacted as Record<string, unknown>,
    },
    secrets,
  };
}

export const useStore = defineStore('main', {
  state: () => {
    return {
      salt: '',
      token: '',
      index: 0,
      canAccess: false,
      backendOffline: false,
      diceServers: [] as DiceServer[],

      talkLogs: [] as TalkLogItem[],
    };
  },
  getters: {
    curDice(): DiceServer {
      if (this.diceServers.length === 0) {
        this.diceServers.push({
          baseInfo: {
            appChannel: 'stable',
            version: '0.0',
            versionSimple: '0.0',
            versionNew: '0.0',
            memoryUsedSys: 0,
            memoryAlloc: 0,
            uptime: 0,
            versionNewNote: '',
            versionCode: 0,
            versionNewCode: 0,
            OS: '',
            arch: '',
            justForTest: false,
            containerMode: false,
          },
          customTexts: {},
          customTextsHelpInfo: {},
          previewInfo: {},
          logs: [],
          conns: [],
          endpointViews: [],
          qrcodes: {},
          config: {},
        });
      }

      return this.diceServers[this.index];
    },
  },
  actions: {
    async customTextSave(category: string) {
      await saveCustomText(category, this.curDice.customTexts[category]);
    },

    async getPreInfo() {
      const info: {
        testMode: boolean;
      } = await getPreInfo();
      return info;
    },

    async getBaseInfo() {
      const info = await getBaseInfo();
      if (!document.title.includes('-')) {
        if (info.extraTitle && info.extraTitle !== '') {
          document.title = `${info.extraTitle} - ${document.title}`;
        }
      }
      this.curDice.baseInfo = info;
      return info;
    },

    async getCustomText() {
      const data = await getCustomText();
      this.curDice.customTexts = data.texts;
      this.curDice.customTextsHelpInfo = data.helpInfo;
      this.curDice.previewInfo = data.previewInfo;
      return data;
    },

    async getImConnections() {
      const endpointViews = await listEndpoints();
      const connections = endpointViews.map(endpointViewToDiceConnection);
      this.diceServers[this.index].endpointViews = endpointViews;
      this.diceServers[this.index].conns = connections;
      return connections;
    },

    async addImConnection(form: addImConnectionForm, officialQQTestOnly?: boolean) {
      void officialQQTestOnly;
      const response = await createEndpoint(endpointRequestFromForm(form));
      if (!response.endpoint) {
        throw new Error(`创建账号操作未返回端点（operationId=${response.operationId}）`);
      }
      const enableResponse = await enableEndpoint(response.endpoint.endpointId, {
        expectedAggregateVersion: response.endpoint.version,
        confirm: false,
      });
      const enableOperation = await waitForOperation(enableResponse.operationId);
      if (enableOperation.status !== 'succeeded') {
        throw new Error(
          enableOperation.status === 'ambiguous'
            ? '账号启用状态不明确，请刷新后确认'
            : '账号启用失败',
        );
      }
      const endpoint = await getEndpoint(response.endpoint.endpointId);
      const connection = endpointViewToDiceConnection(endpoint);
      const current = this.diceServers[this.index].endpointViews.filter(
        item => item.endpointId !== endpoint.endpointId,
      );
      this.diceServers[this.index].endpointViews = [...current, endpoint];
      this.diceServers[this.index].conns = this.diceServers[this.index].endpointViews.map(
        endpointViewToDiceConnection,
      );
      return connection;
    },
    async logFetchAndClear() {
      const info = await getLogFetchAndClear();
      this.curDice.logs = info;
    },

    async diceConfigGet() {
      const info = await getDiceConfig();
      this.curDice.config = info;
    },

    async diceConfigSet(data: DiceConfig) {
      await setDiceConfig(data);
      if (data.uiPassword) {
        window.location.reload();
      }
      await this.diceConfigGet();
    },

    async diceAdvancedConfigGet() {
      const info: AdvancedConfig = await getAdvancedConfig();
      return info;
    },

    async diceAdvancedConfigSet(data: AdvancedConfig) {
      await setAdvancedConfig(data);
      await this.diceAdvancedConfigGet();
    },

    // async toolOnebot() {
    //   return await backend.post(
    //     urlPrefix + '/tool/onebot',
    //     undefined,
    //     { headers: { token: this.token } }
    //   ) as {
    //     ok: boolean,
    //     ip: string,
    //     errText: string
    //   }
    // },

    async tryAdminToken(secret: string): Promise<boolean> {
      const candidate = secret
        .trim()
        .replace(/^Bearer\s+/i, '')
        .trim();
      if (!candidate) {
        return false;
      }
      const previousToken = localStorage.getItem('t');
      const previousMode = localStorage.getItem(adminAuthModeKey);
      localStorage.setItem('t', candidate);
      localStorage.setItem(adminAuthModeKey, 'admin');
      try {
        await listEndpoints();
        this.token = candidate;
        this.canAccess = true;
        this.backendOffline = false;
        return true;
      } catch {
        if (previousToken === null) {
          localStorage.removeItem('t');
        } else {
          localStorage.setItem('t', previousToken);
        }
        if (previousMode === null) {
          localStorage.removeItem(adminAuthModeKey);
        } else {
          localStorage.setItem(adminAuthModeKey, previousMode);
        }
        return false;
      }
    },
    async signIn(password: string) {
      try {
        const ret = await signin(password);
        const token = ret.token;
        this.token = token;
        localStorage.setItem('t', token);
        localStorage.removeItem(adminAuthModeKey);
        this.canAccess = true;
      } catch {
        this.canAccess = false;
      }
    },
    async trySignIn(): Promise<boolean> {
      const token = localStorage.getItem('t');
      if (token && isAdminAuthMode() && (await this.tryAdminToken(token))) {
        return true;
      }
      try {
        this.salt = (await getSalt()).salt;
        this.backendOffline = false;
      } catch {
        this.backendOffline = true;
        this.canAccess = false;
        return false;
      }

      try {
        await getHello();
        this.token = token as string;
        this.canAccess = true;
        localStorage.removeItem(adminAuthModeKey);
      } catch (e) {
        this.canAccess = false;
        if (isNetworkError(e)) {
          this.backendOffline = true;
          return false;
        }
        this.backendOffline = false;
        // 试图做一次登录，以获取 token
        await this.signIn('defaultSignin');
      }
      return this.token !== '';
    },
  },
});
