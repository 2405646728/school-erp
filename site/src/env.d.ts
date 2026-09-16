/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 后台管理端地址，用于「统一身份认证登录 / 查看前台」互跳 */
  readonly VITE_ADMIN_URL?: string;
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}
