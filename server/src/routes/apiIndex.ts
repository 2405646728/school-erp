/** API 根路径索引页：直接打开 http://localhost:8000/api 时可看到接口总览与常用入口 */
import { config } from '../config';

interface EndpointGroup {
  title: string;
  en: string;
  auth: string;
  items: [string, string, string][];
}

const GROUPS: EndpointGroup[] = [
  {
    title: '服务与认证',
    en: 'service & auth',
    auth: '公开',
    items: [
      ['GET', '/api', '本索引页'],
      ['GET', '/api/health', '健康检查'],
      ['GET', '/api/meta', '服务元信息（版本、当前学期、数据量）'],
      ['POST', '/api/auth/login', '登录，返回 JWT'],
      ['POST', '/api/auth/logout', '退出登录'],
      ['GET', '/api/auth/profile', '当前账号与关联档案'],
      ['PUT', '/api/auth/profile', '更新个人资料'],
      ['PUT', '/api/auth/password', '修改密码'],
    ],
  },
  {
    title: '教务管理',
    en: 'academic affairs',
    auth: '需登录',
    items: [
      ['GET', '/api/dashboard/overview', '仪表盘聚合数据'],
      ['GET/POST/PUT/DELETE', '/api/students', '学生档案 CRUD（含 /statistics）'],
      ['POST', '/api/students/import', '批量导入学生'],
      ['POST', '/api/students/batch-delete', '批量删除学生'],
      ['GET', '/api/students/export', '导出学生 CSV'],
      ['GET/POST/PUT/DELETE', '/api/teachers', '教师管理'],
      ['GET/POST/PUT/DELETE', '/api/courses', '课程库管理'],
      ['GET/POST/PUT/DELETE', '/api/offerings', '教学班管理'],
      ['POST', '/api/offerings/:id/students', '教学班添加学生'],
      ['GET', '/api/enrollments', '选课记录查询'],
      ['POST', '/api/enrollments/batch-score', '批量录入成绩'],
      ['GET', '/api/enrollments/my-courses', '学生：我的课程'],
      ['GET', '/api/enrollments/my-scores', '学生：我的成绩'],
      ['GET', '/api/enrollments/my-teachings', '教师：我的授课'],
    ],
  },
  {
    title: '组织架构与系统',
    en: 'organization & system',
    auth: '需登录',
    items: [
      ['GET/POST/PUT/DELETE', '/api/departments', '院系管理'],
      ['GET/POST/PUT/DELETE', '/api/majors', '专业管理'],
      ['GET/POST/PUT/DELETE', '/api/classes', '班级管理'],
      ['GET/POST/PUT/DELETE', '/api/users', '系统账号管理（仅管理员）'],
      ['GET/DELETE', '/api/logs', '操作日志（仅管理员）'],
    ],
  },
  {
    title: '官网公开接口',
    en: 'public site',
    auth: '公开',
    items: [
      ['GET', '/api/public/site', '站点设置与导航'],
      ['GET', '/api/public/banners', '首页轮播图'],
      ['GET', '/api/public/headline', '首页要闻与公告'],
      ['GET', '/api/public/articles', '新闻列表（分类 / 关键字 / 分页）'],
      ['GET', '/api/public/articles/:id', '新闻详情（浏览量自增）'],
      ['GET', '/api/public/pages/:slug', '单页内容'],
      ['GET', '/api/public/departments', '院系与专业'],
      ['GET', '/api/public/teachers', '师资队伍'],
      ['GET', '/api/public/courses', '课程资源'],
      ['GET', '/api/public/search', '站内搜索'],
    ],
  },
  {
    title: '官网内容管理',
    en: 'cms',
    auth: '仅管理员',
    items: [
      ['GET/POST/PUT/DELETE', '/api/cms/banners', '轮播图管理'],
      ['POST', '/api/cms/banners/:id/move', '轮播图排序'],
      ['GET/POST/PUT/DELETE', '/api/cms/articles', '新闻公告管理'],
      ['POST', '/api/cms/articles/:id/toggle-status', '发布 / 转草稿'],
      ['POST', '/api/cms/articles/:id/toggle-top', '置顶切换'],
      ['GET/POST/PUT/DELETE', '/api/cms/pages', '单页管理'],
      ['GET/PUT', '/api/cms/settings', '站点设置'],
    ],
  },
];

function renderGroup(group: EndpointGroup) {
  const rows = group.items
    .map(
      ([method, path, desc]) => `
        <tr>
          <td><span class="method">${method}</span></td>
          <td class="path">${path}</td>
          <td class="desc">${desc}</td>
        </tr>`,
    )
    .join('');

  return `
    <section class="group">
      <header>
        <h2>${group.title}<small>${group.en}</small></h2>
        <span class="auth ${group.auth === '公开' ? 'open' : 'locked'}">${group.auth}</span>
      </header>
      <table>${rows}</table>
    </section>`;
}

export function renderApiIndex(): string {
  const adminUrl = process.env.ADMIN_URL || 'http://127.0.0.1:5173';
  const siteUrl = process.env.SITE_URL || 'http://127.0.0.1:5174';

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${config.appName} API v${config.version}</title>
  <style>
    :root { --brand:#2b6cf6; --text-1:#1d2129; --text-2:#4e5969; --text-3:#86909c; --border:#e5e6eb; --soft:#f6f7f9; }
    * { box-sizing: border-box; }
    body { margin:0; padding:0 0 60px; background:var(--soft); color:var(--text-1);
           font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei','Segoe UI',Arial,sans-serif; font-size:14px; line-height:1.7; }
    .hero { background:linear-gradient(130deg,#12307a,#2b6cf6); color:#fff; padding:34px 0 30px; }
    .wrap { max-width:980px; margin:0 auto; padding:0 20px; }
    .hero h1 { margin:0 0 6px; font-size:23px; }
    .hero p { margin:0; opacity:.82; font-size:13.5px; }
    .hero .meta { margin-top:16px; display:flex; flex-wrap:wrap; gap:10px; }
    .chip { display:inline-flex; align-items:center; gap:6px; padding:5px 12px; border-radius:999px;
            background:rgba(255,255,255,.16); border:1px solid rgba(255,255,255,.24); font-size:12.5px; }
    .chip a { color:#fff; text-decoration:none; border-bottom:1px dashed rgba(255,255,255,.5); }
    .ok { width:7px; height:7px; border-radius:50%; background:#5be36b; }
    .group { background:#fff; border:1px solid #eef0f2; border-radius:10px; margin-top:18px; overflow:hidden;
             box-shadow:0 1px 2px rgba(29,33,41,.04); }
    .group header { display:flex; align-items:center; justify-content:space-between; gap:12px;
                    padding:14px 18px; border-bottom:1px solid #f0f1f3; }
    .group h2 { margin:0; font-size:15.5px; font-weight:600; }
    .group h2 small { margin-left:8px; font-size:12px; font-weight:400; color:#a9aeb8; }
    .auth { font-size:12px; padding:2px 9px; border-radius:999px; }
    .auth.open { color:#00a63d; background:#e8ffea; }
    .auth.locked { color:#d98b2b; background:#fff7e8; }
    table { width:100%; border-collapse:collapse; }
    td { padding:9px 18px; border-bottom:1px solid #f7f8fa; vertical-align:top; }
    tr:last-child td { border-bottom:0; }
    tr:hover td { background:#fafbff; }
    .method { display:inline-block; min-width:132px; font-size:11.5px; font-weight:600; color:var(--brand);
              background:#eaf1ff; padding:2px 8px; border-radius:4px; font-family:Consolas,monospace; }
    .path { width:270px; font-family:Consolas,monospace; font-size:13px; color:var(--text-1); }
    .desc { color:var(--text-2); font-size:13px; }
    .foot { margin-top:22px; text-align:center; font-size:12.5px; color:var(--text-3); }
    .foot a { color:var(--brand); text-decoration:none; }
    @media (max-width:640px) {
      .path { width:auto; }
      .method { min-width:0; margin-bottom:4px; }
      td { padding:10px 14px; }
      .hero h1 { font-size:19px; }
    }
  </style>
</head>
<body>
  <div class="hero">
    <div class="wrap">
      <h1>${config.appName} · 后端 API</h1>
      <p>版本 v${config.version} · 运行环境 ${config.env} · 统一响应体 { code, message, data }</p>
      <div class="meta">
        <span class="chip"><span class="ok"></span> 服务运行中</span>
        <span class="chip">管理后台 <a href="${adminUrl}" target="_blank" rel="noopener">${adminUrl.replace(/^https?:\/\//, '')}</a></span>
        <span class="chip">学校官网 <a href="${siteUrl}" target="_blank" rel="noopener">${siteUrl.replace(/^https?:\/\//, '')}</a></span>
        <span class="chip">健康检查 <a href="/api/health">/api/health</a></span>
      </div>
    </div>
  </div>

  <div class="wrap">
    ${GROUPS.map(renderGroup).join('')}
    <div class="foot">
      需要携带身份令牌的接口，请在请求头加入 <code>Authorization: Bearer &lt;token&gt;</code><br />
      演示账号：admin / admin123（管理员）、T0001 / 123456（教师）、2024080901001 / 123456（学生）
    </div>
  </div>
</body>
</html>`;
}
