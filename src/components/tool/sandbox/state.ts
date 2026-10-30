export type GroupRole = 'owner' | 'admin' | 'member';

export interface SandboxUser {
  /** 形如 UI:1001 */
  id: string;
  name: string;
  /** avatarPalette 中的下标 */
  color: number;
}

export interface SandboxGroup {
  /** 形如 UI-Group:2001 */
  id: string;
  name: string;
  /** 用户 ID → 群内角色；不在表中即不在群里 */
  members: Record<string, GroupRole>;
}

export interface SandboxState {
  users: SandboxUser[];
  groups: SandboxGroup[];
  /** 当前会话键 */
  active: string;
  /** 群 ID → 当前发言的用户 ID */
  speakers: Record<string, string>;
}

export const roleLabels: Record<GroupRole, string> = {
  owner: '群主',
  admin: '管理员',
  member: '成员',
};

/** 头像底色：均为中等明度，白字对比度 ≥ 4.5 */
export const avatarPalette = [
  '#2a64c6',
  '#0b7d68',
  '#7a48c4',
  '#b83a6f',
  '#a2520e',
  '#3c7426',
  '#56668a',
  '#a33a3a',
];

export const privateKey = (userId: string) => `private:${userId}`;
export const groupKey = (groupId: string) => `group:${groupId}`;

const defaultState = (): SandboxState => ({
  users: [
    { id: 'UI:1001', name: '测试用户', color: 0 },
    { id: 'UI:1002', name: '群主', color: 1 },
  ],
  groups: [
    {
      id: 'UI-Group:2001',
      name: '测试群',
      members: { 'UI:1002': 'owner', 'UI:1001': 'member' },
    },
  ],
  active: privateKey('UI:1001'),
  speakers: { 'UI-Group:2001': 'UI:1002' },
});

export const sandbox = useStorage<SandboxState>('ui-test-sandbox', defaultState(), localStorage, {
  mergeDefaults: true,
});

/** 在已有 ID 的数字后缀基础上递增，生成新的 ID。 */
export function nextSandboxId(prefix: string, existing: string[], start: number): string {
  const numbers = existing
    .map(id => Number(id.slice(prefix.length)))
    .filter(n => Number.isInteger(n));
  return `${prefix}${Math.max(start - 1, ...numbers) + 1}`;
}

export function groupMembers(group: SandboxGroup): SandboxUser[] {
  return sandbox.value.users.filter(user => group.members[user.id]);
}

export function addSandboxUser(): SandboxUser {
  const state = sandbox.value;
  const id = nextSandboxId(
    'UI:',
    state.users.map(user => user.id),
    1001,
  );
  const user: SandboxUser = {
    id,
    name: `用户 ${id.slice(3)}`,
    color: state.users.length % avatarPalette.length,
  };
  state.users.push(user);
  return user;
}

export function addSandboxGroup(): SandboxGroup {
  const state = sandbox.value;
  const id = nextSandboxId(
    'UI-Group:',
    state.groups.map(group => group.id),
    2001,
  );
  const members: Record<string, GroupRole> = {};
  state.users.forEach((user, index) => {
    members[user.id] = index === 0 ? 'owner' : 'member';
  });
  const group: SandboxGroup = { id, name: `测试群 ${state.groups.length + 1}`, members };
  state.groups.push(group);
  if (state.users[0]) state.speakers[id] = state.users[0].id;
  return group;
}

export function removeSandboxUser(userId: string) {
  const state = sandbox.value;
  state.users = state.users.filter(user => user.id !== userId);
  for (const group of state.groups) {
    delete group.members[userId];
    if (Object.keys(group.members).length === 0 && state.users[0]) {
      group.members[state.users[0].id] = 'owner';
    }
    if (state.speakers[group.id] === userId || !group.members[state.speakers[group.id]]) {
      state.speakers[group.id] = Object.keys(group.members)[0] ?? '';
    }
  }
}

export function removeSandboxGroup(groupId: string) {
  const state = sandbox.value;
  state.groups = state.groups.filter(group => group.id !== groupId);
  delete state.speakers[groupId];
}

/** 设置群内角色；每个群只有一位群主，设新群主时原群主降为管理员。返回 false 表示操作被拒绝。 */
export function setGroupRole(
  group: SandboxGroup,
  userId: string,
  role: GroupRole | 'none',
): boolean {
  if (role === 'none') {
    if (Object.keys(group.members).length <= 1) return false;
    delete group.members[userId];
    const state = sandbox.value;
    if (state.speakers[group.id] === userId) {
      state.speakers[group.id] = Object.keys(group.members)[0];
    }
    return true;
  }
  if (role === 'owner') {
    for (const [id, current] of Object.entries(group.members)) {
      if (current === 'owner' && id !== userId) group.members[id] = 'admin';
    }
  }
  group.members[userId] = role;
  return true;
}
export function resetSandbox() {
  sandbox.value = defaultState();
}
