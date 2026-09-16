import { defineStore } from 'pinia';
import { authApi, metaApi } from '@/api';
import type { MetaInfo, Role, UserInfo } from '@/types';

const TOKEN_KEY = 'school-erp-token';
const USER_KEY = 'school-erp-user';

function readUser(): UserInfo | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as UserInfo) : null;
  } catch {
    return null;
  }
}

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem(TOKEN_KEY) || '',
    user: readUser(),
    meta: null as MetaInfo | null,
    profile: null as Record<string, unknown> | null,
  }),

  getters: {
    isLogin: (state) => Boolean(state.token),
    role: (state): Role => state.user?.role ?? 'student',
    isAdmin: (state) => state.user?.role === 'admin',
    isTeacher: (state) => state.user?.role === 'teacher',
    isStudent: (state) => state.user?.role === 'student',
    displayName: (state) => state.user?.realName || state.user?.username || '',
    roleLabel: (state) => {
      const map: Record<string, string> = { admin: '系统管理员', teacher: '教师', student: '学生' };
      return map[state.user?.role ?? 'student'];
    },
    /** 侧边栏底部展示的版本号，来自后端 /meta */
    version: (state) => state.meta?.version ?? '0.1.0',
    appName: (state) => state.meta?.appName ?? '学生管理系统',
    currentSemester: (state) => state.meta?.currentSemester ?? '',
  },

  actions: {
    async login(payload: { username: string; password: string }) {
      const result = await authApi.login(payload);
      this.token = result.token;
      this.user = result.user;
      localStorage.setItem(TOKEN_KEY, result.token);
      localStorage.setItem(USER_KEY, JSON.stringify(result.user));
      return result.user;
    },

    async loadMeta() {
      if (this.meta) return this.meta;
      this.meta = await metaApi.info();
      return this.meta;
    },

    async loadProfile() {
      this.profile = await authApi.profile();
      return this.profile;
    },

    async logout() {
      try {
        await authApi.logout();
      } catch {
        /* 忽略退出接口异常，本地状态照常清理 */
      }
      this.reset();
    },

    reset() {
      this.token = '';
      this.user = null;
      this.profile = null;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    },
  },
});
