/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 官网（前台）地址，用于后台头部「查看前台」入口 */
  readonly VITE_SITE_URL?: string;
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}
