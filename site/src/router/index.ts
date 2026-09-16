import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/Home.vue'),
    meta: { title: '' },
  },
  {
    path: '/news',
    name: 'news',
    component: () => import('@/views/NewsList.vue'),
    meta: { title: '新闻公告', crumb: '新闻公告' },
  },
  {
    path: '/news/:id',
    name: 'news-detail',
    component: () => import('@/views/NewsDetail.vue'),
    meta: { title: '新闻详情', crumb: '新闻公告' },
  },
  {
    path: '/departments',
    name: 'departments',
    component: () => import('@/views/Departments.vue'),
    meta: { title: '院系专业', crumb: '院系专业' },
  },
  {
    path: '/teachers',
    name: 'teachers',
    component: () => import('@/views/Teachers.vue'),
    meta: { title: '师资队伍', crumb: '师资队伍' },
  },
  {
    path: '/courses',
    name: 'courses',
    component: () => import('@/views/Courses.vue'),
    meta: { title: '课程资源', crumb: '课程资源' },
  },
  {
    path: '/search',
    name: 'search',
    component: () => import('@/views/SearchResult.vue'),
    meta: { title: '搜索结果', crumb: '站内搜索' },
  },
  {
    path: '/page/:slug',
    name: 'page',
    component: () => import('@/views/PageView.vue'),
    meta: { title: '页面' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFound.vue'),
    meta: { title: '页面不存在' },
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: (to, _from, savedPosition) => (savedPosition || { top: 0 }),
});

router.afterEach((to) => {
  const title = (to.meta.title as string) || '';
  document.title = title ? `${title} - 启明大学` : '启明大学';
});

export default router;
