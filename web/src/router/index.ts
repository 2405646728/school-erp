import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { ElMessage } from 'element-plus';
import AdminLayout from '@/layout/AdminLayout.vue';
import { useUserStore } from '@/stores/user';
import type { Role } from '@/types';

/**
 * meta 约定：
 *   title  面包屑与菜单标题
 *   group  侧边栏分组标题（同 group 的菜单归为一组）
 *   icon   菜单图标（Element Plus 图标组件名）
 *   roles  可访问角色，缺省表示所有已登录用户
 */
const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/login/index.vue'),
    meta: { public: true, title: '登录' },
  },
  {
    path: '/',
    component: AdminLayout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: '数据看板', group: '工作台', icon: 'DataLine' },
      },

      // ---------------- 教务管理 ----------------
      {
        path: 'students',
        name: 'students',
        component: () => import('@/views/student/index.vue'),
        meta: { title: '学生管理', group: '教务管理', icon: 'User', roles: ['admin', 'teacher'] },
      },
      {
        path: 'teachers',
        name: 'teachers',
        component: () => import('@/views/teacher/index.vue'),
        meta: { title: '教师管理', group: '教务管理', icon: 'Avatar', roles: ['admin', 'teacher'] },
      },
      {
        path: 'courses',
        name: 'courses',
        component: () => import('@/views/course/index.vue'),
        meta: { title: '课程管理', group: '教务管理', icon: 'Notebook', roles: ['admin', 'teacher'] },
      },
      {
        path: 'offerings',
        name: 'offerings',
        component: () => import('@/views/offering/index.vue'),
        meta: { title: '教学班管理', group: '教务管理', icon: 'Calendar', roles: ['admin', 'teacher'] },
      },
      {
        path: 'enrollments',
        name: 'enrollments',
        component: () => import('@/views/enrollment/index.vue'),
        meta: { title: '选课与成绩', group: '教务管理', icon: 'EditPen', roles: ['admin', 'teacher'] },
      },

      // ---------------- 组织架构 ----------------
      {
        path: 'departments',
        name: 'departments',
        component: () => import('@/views/org/department.vue'),
        meta: { title: '院系管理', group: '组织架构', icon: 'OfficeBuilding', roles: ['admin'] },
      },
      {
        path: 'majors',
        name: 'majors',
        component: () => import('@/views/org/major.vue'),
        meta: { title: '专业管理', group: '组织架构', icon: 'Collection', roles: ['admin'] },
      },
      {
        path: 'classes',
        name: 'classes',
        component: () => import('@/views/org/class.vue'),
        meta: { title: '班级管理', group: '组织架构', icon: 'Grid', roles: ['admin', 'teacher'] },
      },

      // ---------------- 学生中心 ----------------
      {
        path: 'my/courses',
        name: 'my-courses',
        component: () => import('@/views/center/my-courses.vue'),
        meta: { title: '我的课程', group: '学生中心', icon: 'Reading', roles: ['student'] },
      },
      {
        path: 'my/scores',
        name: 'my-scores',
        component: () => import('@/views/center/my-scores.vue'),
        meta: { title: '我的成绩', group: '学生中心', icon: 'Medal', roles: ['student'] },
      },

      // ---------------- 教师中心 ----------------
      {
        path: 'my/teachings',
        name: 'my-teachings',
        component: () => import('@/views/center/my-teachings.vue'),
        meta: { title: '我的授课', group: '教师中心', icon: 'Tickets', roles: ['teacher'] },
      },

      // ---------------- 官网管理 ----------------
      {
        path: 'cms/banners',
        name: 'cms-banners',
        component: () => import('@/views/cms/banner.vue'),
        meta: { title: '轮播图管理', group: '官网管理', icon: 'Picture', roles: ['admin'] },
      },
      {
        path: 'cms/articles',
        name: 'cms-articles',
        component: () => import('@/views/cms/article.vue'),
        meta: { title: '新闻公告', group: '官网管理', icon: 'Document', roles: ['admin'] },
      },
      {
        path: 'cms/pages',
        name: 'cms-pages',
        component: () => import('@/views/cms/page.vue'),
        meta: { title: '单页管理', group: '官网管理', icon: 'Files', roles: ['admin'] },
      },
      {
        path: 'cms/settings',
        name: 'cms-settings',
        component: () => import('@/views/cms/setting.vue'),
        meta: { title: '站点设置', group: '官网管理', icon: 'Promotion', roles: ['admin'] },
      },

      // ---------------- 系统设置 ----------------
      {
        path: 'system/users',
        name: 'users',
        component: () => import('@/views/system/user.vue'),
        meta: { title: '用户管理', group: '系统设置', icon: 'Key', roles: ['admin'] },
      },
      {
        path: 'system/logs',
        name: 'logs',
        component: () => import('@/views/system/log.vue'),
        meta: { title: '操作日志', group: '系统设置', icon: 'Document', roles: ['admin'] },
      },
      {
        path: 'system/profile',
        name: 'profile',
        component: () => import('@/views/system/profile.vue'),
        meta: { title: '个人资料', group: '系统设置', icon: 'Setting' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/error/404.vue'),
    meta: { public: true, title: '页面不存在' },
  },
];

const router = createRouter({
  // 跟随 Vite 的 base（一键部署时后台位于 /admin/ 下）
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

/** 按角色决定登录后的默认落地页 */
export function homePathFor(role: Role): string {
  if (role === 'student') return '/my/courses';
  if (role === 'teacher') return '/my/teachings';
  return '/dashboard';
}

router.beforeEach((to) => {
  const userStore = useUserStore();
  const isPublic = Boolean(to.meta.public);

  if (!userStore.isLogin) {
    if (isPublic) return true;
    return { path: '/login', query: { redirect: to.fullPath } };
  }

  if (to.path === '/login') {
    return homePathFor(userStore.role);
  }

  const roles = to.meta.roles as Role[] | undefined;
  if (roles && !roles.includes(userStore.role)) {
    ElMessage.warning('当前角色无权访问该页面');
    return homePathFor(userStore.role);
  }

  return true;
});

router.afterEach((to) => {
  const title = (to.meta.title as string) || '';
  document.title = title ? `${title} · 学生管理系统` : '学生管理系统';
});

export default router;
