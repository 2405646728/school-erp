/** 运行期地址配置：一键部署时由构建变量注入，开发环境回落到本机端口 */

/** 学校官网地址（后台「查看前台」入口使用） */
export const siteUrl = import.meta.env.VITE_SITE_URL || 'http://127.0.0.1:5174';

/** 后台自身地址（用于生成需要绝对地址的链接） */
export const adminBase = import.meta.env.BASE_URL || '/';
