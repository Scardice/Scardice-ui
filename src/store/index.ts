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
  listEndpoints,
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

interface TalkLogItem {
  name?: string;
  content: string;
  isSeal?: boolean;
  mode: 'private' | 'group';
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
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function endpointViewToDiceConnection(endpoint: EndpointView): DiceConnection {
  const payload = recordPayload(endpoint);
  const mode = stringValue(payload.mode);
  const adapter: AdapterQQ = {
    DiceServing: true,
    connectUrl: stringValue(payload.url || payload.clientUrl || payload.connectUrl),
    curLoginFailedReason: stringValue(payload.loginFailedReason),
    curLoginIndex: numberValue(payload.curLoginIndex),
    loginState: numberValue(payload.loginState) as goCqHttpStateCode,
    inPackGoCqHttpLastRestricted: numberValue(payload.lastRestricted),
    inPackGoCqHttpProtocol: numberValue(payload.protocol),
    inPackGoCqHttpAppVersion: stringValue(payload.appVersion),
    implementation: stringValue(payload.implementation),
    useInPackGoCqhttp: mode === 'builtin' || Boolean(payload.useInPackGoCqhttp),
    goCqHttpLoginVerifyCode: stringValue(payload.loginVerifyCode),
    goCqHttpLoginDeviceLockUrl: stringValue(payload.loginDeviceLockUrl),
    ignoreFriendRequest:
      payload.friendRequestPolicy === 'ignore' || payload.ignoreFriendRequest === true,
    goCqHttpSmsNumberTip: stringValue(payload.smsNumberTip),
    useSignServer: payload.useSignServer === true,
    signServerConfig: payload.signServerConfig || {
      signServers: [{ url: '', key: '', authorization: '' }],
    },
    redVersion: stringValue(payload.redVersion),
    host: stringValue(payload.host),
    port: numberValue(payload.port),
    appID: numberValue(payload.appID),
    isReverse: mode === 'server' || Boolean(payload.isReverse),
    reverseAddr: stringValue(payload.listenAddress || payload.reverseUrl),
    builtinMode: stringValue(payload.builtinMode) as AdapterQQ['builtinMode'],
    built_in_mode: stringValue(payload.built_in_mode),
    signServerVer: stringValue(payload.signServerVersion),
    signServerName: stringValue(payload.signServerName),
    imageAssetBaseUrl: stringValue(payload.imageAssetBaseUrl),
    qrLoginState: numberValue(payload.qrLoginState) as OfficialQQQRLoginState,
  };
  const observedState = endpoint.observedState.toLowerCase();
  const operationState = endpoint.operationState.toLowerCase();
  const ambiguous = observedState === 'ambiguous' || operationState === 'ambiguous';
  const state =
    observedState === 'running' || observedState === 'connected'
      ? 1
      : observedState === 'starting'
        ? 2
        : observedState === 'failed'
          ? 3
          : 0;
  const userId = numberValue(payload.userId || payload.account || payload.accountHint);
  return {
    id: endpoint.endpointId,
    state,
    platform: stringValue(
      payload.platform,
      endpoint.adapterKey === 'pureonebot' ? 'QQ' : endpoint.adapterKey,
    ),
    workDir: stringValue(payload.workDir),
    enable: endpoint.desiredState.toLowerCase() !== 'disabled',
    ambiguous,
    protocolType: stringValue(
      payload.protocolType,
      endpoint.adapterKey === 'pureonebot' ? 'onebot' : endpoint.adapterKey,
    ),
    nickname: stringValue(payload.nickname, endpoint.endpointId),
    userId,
    groupNum: numberValue(payload.groupNum),
    cmdExecutedNum: numberValue(payload.cmdExecutedNum),
    cmdExecutedLastTime: numberValue(payload.cmdExecutedLastTime),
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
function sanitizeSignServerConfig(
  config: unknown,
  secrets: Record<string, string>,
): Record<string, unknown> | undefined {
  if (!config || typeof config !== 'object') return undefined;
  const source = config as Record<string, unknown>;
  const servers = Array.isArray(source.signServers) ? source.signServers : [];
  return {
    ...source,
    signServers: servers.map((value, index) => {
      if (!value || typeof value !== 'object') return {};
      const server = value as Record<string, unknown>;
      const sanitized: Record<string, unknown> = { url: stringValue(server.url) };
      for (const field of ['key', 'authorization']) {
        const secret = stringValue(server[field]);
        if (secret) {
          const ref = `signServer.${index}.${field}`;
          secrets[ref] = secret;
          sanitized[field] = { secretRef: ref, version: 1 };
        }
      }
      return sanitized;
    }),
  };
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

function isMeaningfulSignServerConfig(config: Record<string, unknown> | undefined): boolean {
  if (!config) return false;
  const servers = Array.isArray(config.signServers) ? config.signServers : [];
  return servers.some(server => {
    if (!server || typeof server !== 'object') return false;
    const entry = server as Record<string, unknown>;
    return (
      (typeof entry.url === 'string' && entry.url.trim() !== '') ||
      entry.key !== undefined ||
      entry.authorization !== undefined
    );
  });
}

function endpointRequestFromForm(form: addImConnectionForm): EndpointCreateRequest {
  const adapterKeys: Record<number, string> = {
    [ImConnectionTypeGocqLegacy]: 'gocq',
    [ImConnectionTypeDiscord]: 'discord',
    [ImConnectionTypeKook]: 'kook',
    [ImConnectionTypeTelegram]: 'telegram',
    [ImConnectionTypeMinecraft]: 'minecraft',
    [ImConnectionTypeDodo]: 'dodo',
    [ImConnectionTypeOnebotSeparate]: 'pureonebot',
    [ImConnectionTypeRed]: 'red',
    [ImConnectionTypeDingTalk]: 'dingtalk',
    [ImConnectionTypeSlack]: 'slack',
    [ImConnectionTypeOfficialQQ]: 'official_qq',
    [ImConnectionTypeOnebotReverse]: 'pureonebot',
    [ImConnectionTypeSealChat]: 'sealchat',
    [ImConnectionTypeSatori]: 'satori',
    [ImConnectionTypeLagrangeOnebot]: 'lagrange',
    [ImConnectionTypeMilkySeparate]: 'milky',
    [ImConnectionTypeMilkyInternal]: 'milky',
    [ImConnectionTypeMilkyInternalLagrange]: 'milky',
    [ImConnectionTypeMilkyInternalYogurt]: 'milky',
  };
  let adapterKey = adapterKeys[form.accountType] || `legacy-${form.accountType}`;
  const port = Number(form.port);
  const payload: Record<string, unknown> = {
    accountType: form.accountType,
    platform: form.platform,
    nickname: form.nickname,
    account: form.account,
    protocol: form.protocol,
    appVersion: form.appVersion,
    implementation: form.implementation,
    proxyURL: form.proxyURL,
    reverseProxyUrl: form.reverseProxyUrl,
    reverseProxyCDNUrl: form.reverseProxyCDNUrl,
    url: form.url,
    clientID: form.clientID,
    robotCode: form.robotCode,
    relWorkDir: form.relWorkDir,
    connectUrl: form.connectUrl,
    host: form.host,
    port: Number.isInteger(port) && port >= 0 ? port : undefined,
    onlyQQGuild: form.onlyQQGuild,
    appID: form.appID,
    signServerName: form.signServerName,
    signServerVersion: form.signServerVersion,
    reverseAddr: form.reverseAddr,
    wsGateway: form.wsGateway,
    restGateway: form.restGateway,
    friendRequestPolicy: form.ignoreFriendRequest ? 'ignore' : 'accept',
    useSignServer: form.useSignServer,
    imageAssetBaseUrl: form.imageAssetBaseUrl,
  };
  const secrets: Record<string, string> = {};
  const secretFields: Record<string, string> = {
    token: form.token,
    botToken: form.botToken,
    appToken: form.appToken,
    accessToken: form.accessToken,
    appSecret: form.appSecret,
    password: form.password,
  };
  for (const [name, value] of Object.entries(secretFields)) {
    if (value) secrets[name] = value;
  }
  const signServerConfig = sanitizeSignServerConfig(form.signServerConfig, secrets);
  if (isMeaningfulSignServerConfig(signServerConfig)) {
    payload.signServerConfig = signServerConfig;
  }
  if (form.accountType === ImConnectionTypeOnebotSeparate) {
    adapterKey = 'pureonebot';
    for (const key of Object.keys(secrets)) delete secrets[key];
    for (const key of Object.keys(payload)) delete payload[key];
    payload.mode = 'client';
    payload.url = form.connectUrl.trim();
    payload.friendRequestPolicy = form.ignoreFriendRequest ? 'ignore' : 'accept';
    payload.imageAssetBaseUrl = form.imageAssetBaseUrl;
    payload.accountHint = form.account;
    if (form.accessToken) {
      payload.token = { secretRef: 'accessToken', version: 1 };
      secrets.accessToken = form.accessToken;
    }
    payload.reverseSuffix = '/ws';
    delete payload.connectUrl;
  } else if (form.accountType === ImConnectionTypeOnebotReverse) {
    adapterKey = 'pureonebot';
    for (const key of Object.keys(secrets)) delete secrets[key];
    for (const key of Object.keys(payload)) delete payload[key];
    payload.mode = 'server';
    payload.listenAddress = form.reverseAddr.trim();
    payload.friendRequestPolicy = form.ignoreFriendRequest ? 'ignore' : 'accept';
    payload.imageAssetBaseUrl = form.imageAssetBaseUrl;
    payload.accountHint = form.account;
    if (form.accessToken) {
      payload.token = { secretRef: 'accessToken', version: 1 };
      secrets.accessToken = form.accessToken;
    }
    payload.reverseSuffix = '/ws';
    delete payload.reverseAddr;
    delete payload.account;
  }
  const compacted = compactEndpointPayload(payload);
  return {
    adapterKey,
    config: {
      version: 1,
      payload: (compacted && typeof compacted === 'object' ? compacted : {}) as Record<
        string,
        unknown
      >,
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

      talkLogs: [
        {
          content:
            '余烬已就绪。此界面可视为私聊窗口。\n设置中添加 Master 名为 UI:1001\n即可在此界面使用 master 命令！',
          isSeal: true,
          mode: 'private',
        },
        {
          content:
            '余烬已就绪。此界面可视为群聊窗口。\n设置中添加 Master 名为 UI:1002\n即可在此界面使用 master 命令！',
          isSeal: true,
          mode: 'group',
        },
        {
          content: '（请注意，当前会话记录在刷新页面后会消失）',
          isSeal: true,
          mode: 'private',
        },
        {
          content: '（请注意，当前会话记录在刷新页面后会消失）',
          isSeal: true,
          mode: 'group',
        },
      ] as TalkLogItem[],
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
      const connection = endpointViewToDiceConnection(response.endpoint);
      const current = this.diceServers[this.index].endpointViews.filter(
        endpoint => endpoint.endpointId !== response.endpoint?.endpointId,
      );
      this.diceServers[this.index].endpointViews = [...current, response.endpoint];
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
      const candidate = secret.trim();
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
      if (token && (await this.tryAdminToken(token))) {
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
