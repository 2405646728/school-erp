<template>
  <div class="admin-layout" :class="{ 'is-compact': compact, 'is-mobile': isMobile }">
    <!-- 移动端遮罩 -->
    <transition name="fade">
      <div v-if="isMobile && sidebarOpen" class="sidebar-backdrop" @click="sidebarOpen = false" />
    </transition>

    <!-- ============ 侧边栏 ============ -->
    <aside class="sidebar" :class="{ 'mobile-open': isMobile && sidebarOpen }">
      <div class="brand">
        <div class="brand-logo">
          <el-icon><School /></el-icon>
        </div>
        <div class="brand-text">
          <div class="brand-name">{{ userStore.appName }}</div>
          <div class="brand-sub">管理后台</div>
        </div>
        <button v-if="isMobile" class="sidebar-close" aria-label="收起菜单" @click="sidebarOpen = false">
          <el-icon><Close /></el-icon>
        </button>
      </div>

      <nav class="nav">
        <template v-for="group in visibleGroups" :key="group.name">
          <div v-if="group.name" class="nav-group-title">{{ group.name }}</div>
          <router-link
            v-for="item in group.items"
            :key="item.path"
            :to="item.path"
            class="nav-item"
            :class="{ active: isActive(item.path) }"
            @click="isMobile && (sidebarOpen = false)"
          >
            <el-icon class="nav-icon"><component :is="item.icon" /></el-icon>
            <span class="nav-label">{{ item.title }}</span>
          </router-link>
        </template>
      </nav>

      <div class="sidebar-foot">
        <span class="dot" />
        <span>school-erp-api v{{ userStore.version }}</span>
      </div>
    </aside>

    <!-- ============ 主区域 ============ -->
    <div class="main">
      <header class="header">
        <div class="header-left">
          <button v-if="isMobile" class="menu-btn" aria-label="展开菜单" @click="sidebarOpen = true">
            <el-icon><Fold /></el-icon>
          </button>
          <div class="crumb">
            <span class="crumb-item">首页</span>
            <template v-if="currentGroup">
              <span class="crumb-sep">/</span>
              <span class="crumb-item crumb-group">{{ currentGroup }}</span>
            </template>
            <span class="crumb-sep">/</span>
            <span class="crumb-current">{{ currentTitle }}</span>
          </div>
        </div>

        <div class="header-right">
          <!-- 页面/菜单搜索 -->
          <el-popover
            :visible="searchVisible && searchResults.length > 0"
            placement="bottom-end"
            :width="280"
            trigger="manual"
            popper-class="menu-search-popper"
          >
            <template #reference>
              <div class="menu-search">
                <el-icon class="search-icon"><Search /></el-icon>
                <input
                  v-model="searchKeyword"
                  placeholder="搜索菜单或页面"
                  @focus="searchVisible = true"
                  @blur="handleSearchBlur"
                  @keydown.enter="goFirstResult"
                />
              </div>
            </template>
            <div
              v-for="item in searchResults"
              :key="item.path"
              class="search-result"
              @mousedown.prevent="go(item.path)"
            >
              <span>{{ item.title }}</span>
              <small>{{ item.group || '工作台' }}</small>
            </div>
          </el-popover>

          <!-- 显示密度切换（紧凑 / 宽松） -->
          <div class="segmented">
            <button :class="{ on: !compact }" @click="setCompact(false)">宽松</button>
            <button :class="{ on: compact }" @click="setCompact(true)">紧凑</button>
          </div>

          <!-- 官网入口 -->
          <span class="header-link" @click="openSite">
            查看前台
            <el-icon><TopRight /></el-icon>
          </span>

          <!-- 服务状态 -->
          <el-popover placement="bottom-end" :width="300" trigger="click">
            <template #reference>
              <span class="header-link">
                接口状态
                <el-icon><TopRight /></el-icon>
              </span>
            </template>
            <div class="status-panel">
              <div class="status-row">
                <span class="t3">服务状态</span>
                <el-tag :type="health ? 'success' : 'danger'" size="small" effect="light">
                  {{ health ? '正常' : '异常' }}
                </el-tag>
              </div>
              <div class="status-row">
                <span class="t3">接口版本</span>
                <span class="mono">v{{ userStore.version }}</span>
              </div>
              <div class="status-row">
                <span class="t3">运行环境</span>
                <span>{{ userStore.meta?.env ?? '—' }}</span>
              </div>
              <div class="status-row">
                <span class="t3">当前学期</span>
                <span>{{ userStore.currentSemester || '—' }}</span>
              </div>
              <div class="status-row">
                <span class="t3">在库数据</span>
                <span class="mono">
                  {{ userStore.meta?.counts.students ?? 0 }} 生 /
                  {{ userStore.meta?.counts.teachers ?? 0 }} 师 /
                  {{ userStore.meta?.counts.courses ?? 0 }} 课
                </span>
              </div>
            </div>
          </el-popover>

          <div class="user-block">
            <div class="avatar">{{ avatarText }}</div>
            <div class="user-meta">
              <span class="user-name">{{ userStore.displayName }}</span>
              <span class="user-role">{{ userStore.roleLabel }}</span>
            </div>
            <span class="clock mono">{{ clock }}</span>
            <el-button link type="primary" @click="handleLogout">退出</el-button>
          </div>
        </div>
      </header>

      <main class="content">
        <!-- 页面入场动画由 CSS keyframes 完成，不用 <Transition mode="out-in">，
             避免过渡未结束而阻塞新页面渲染 -->
        <router-view v-slot="{ Component }">
          <keep-alive :max="6">
            <component :is="Component" :key="route.fullPath" />
          </keep-alive>
        </router-view>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { metaApi } from '@/api';
import { useUserStore } from '@/stores/user';
import { siteUrl } from '@/utils/env';
import type { Role } from '@/types';

interface MenuItem {
  path: string;
  title: string;
  icon: string;
  group: string;
  roles?: Role[];
}

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const compact = ref(localStorage.getItem('school-erp-density') === 'compact');
const health = ref(true);
const clock = ref('');
const searchKeyword = ref('');
const searchVisible = ref(false);
/** 窄屏（平板/手机）下侧边栏改为抽屉式，通过头部按钮展开 */
const isMobile = ref(false);
const sidebarOpen = ref(false);

function syncViewport() {
  isMobile.value = window.innerWidth <= 1024;
  if (!isMobile.value) sidebarOpen.value = false;
}

// 路由切换后自动收起移动端抽屉
watch(
  () => route.path,
  () => {
    if (isMobile.value) sidebarOpen.value = false;
  },
);

/** 从路由表推导菜单，保证菜单与权限、页面三者始终一致 */
const allMenus = computed<MenuItem[]>(() => {
  const root = router.getRoutes().find((item) => item.path === '/');
  const children = root?.children ?? [];
  return children
    .filter((child) => child.meta?.title && child.meta?.icon)
    .map((child) => ({
      path: `/${String(child.path).replace(/^\//, '')}`,
      title: child.meta!.title as string,
      icon: child.meta!.icon as string,
      group: (child.meta!.group as string) ?? '',
      roles: child.meta!.roles as Role[] | undefined,
    }));
});

const roleMenus = computed(() =>
  allMenus.value.filter((item) => !item.roles || item.roles.includes(userStore.role)),
);

const visibleGroups = computed(() => {
  const groups: { name: string; items: MenuItem[] }[] = [];
  for (const item of roleMenus.value) {
    let group = groups.find((g) => g.name === item.group);
    if (!group) {
      group = { name: item.group, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
});

const searchResults = computed(() => {
  const keyword = searchKeyword.value.trim();
  if (!keyword) return [];
  return roleMenus.value.filter(
    (item) => item.title.includes(keyword) || item.group.includes(keyword),
  );
});

const currentTitle = computed(() => (route.meta.title as string) || '数据看板');
const currentGroup = computed(() => (route.meta.group as string) || '');

const avatarText = computed(() => userStore.displayName.slice(0, 1) || 'U');

function isActive(path: string) {
  return route.path === path;
}

/** 打开学校官网（地址由构建变量注入） */
function openSite() {
  window.open(siteUrl, '_blank');
}

function setCompact(value: boolean) {
  compact.value = value;
  localStorage.setItem('school-erp-density', value ? 'compact' : 'normal');
}

function handleSearchBlur() {
  setTimeout(() => {
    searchVisible.value = false;
  }, 120);
}

function go(path: string) {
  searchKeyword.value = '';
  searchVisible.value = false;
  router.push(path);
}

function goFirstResult() {
  if (searchResults.value.length) go(searchResults.value[0].path);
}

async function handleLogout() {
  try {
    await ElMessageBox.confirm('确认退出当前账号吗？', '退出登录', {
      confirmButtonText: '退出',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch {
    return;
  }
  await userStore.logout();
  ElMessage.success('已安全退出');
  router.replace('/login');
}

let timer: number | undefined;

function tick() {
  const now = new Date();
  clock.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

onMounted(async () => {
  tick();
  syncViewport();
  window.addEventListener('resize', syncViewport);
  timer = window.setInterval(tick, 20000);
  try {
    await userStore.loadMeta();
  } catch {
    /* 元信息失败不阻塞主流程 */
  }
  try {
    const result = await metaApi.health();
    health.value = result.status === 'UP';
  } catch {
    health.value = false;
  }
});

onUnmounted(() => {
  if (timer) window.clearInterval(timer);
  window.removeEventListener('resize', syncViewport);
});
</script>

<style scoped lang="scss">
.admin-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: var(--c-page-bg);
}

/* ---------------- 侧边栏 ---------------- */
.sidebar {
  width: var(--sidebar-w);
  flex: 0 0 var(--sidebar-w);
  display: flex;
  flex-direction: column;
  background: var(--c-sidebar-bg);
  border-right: 1px solid var(--c-border-light);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px 12px;
}
.brand-logo {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  background: linear-gradient(135deg, #2b6cf6, #4d8bff);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  box-shadow: 0 2px 6px rgba(43, 108, 246, 0.3);
}
.brand-name {
  font-size: 15px;
  font-weight: 600;
  line-height: 20px;
}
.brand-sub {
  font-size: 12px;
  color: var(--c-text-3);
  line-height: 16px;
}

.nav {
  flex: 1;
  overflow-y: auto;
  padding: 4px 8px 12px;
}
.nav-group-title {
  padding: 14px 12px 6px;
  font-size: 12px;
  color: var(--c-text-3);
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 38px;
  padding: 0 10px;
  margin-bottom: 2px;
  border-radius: var(--radius);
  color: var(--c-text-1);
  font-size: 14px;
  transition: background 0.16s, color 0.16s;
  cursor: pointer;

  &:hover {
    background: #f0f1f3;
  }
  &.active {
    background: var(--c-primary-soft);
    color: var(--c-primary);
    font-weight: 500;
  }
  .nav-icon {
    font-size: 16px;
    color: currentColor;
    opacity: 0.85;
  }
  .nav-label {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .nav-badge {
    font-size: 12px;
    color: var(--c-text-3);
  }
}

.sidebar-foot {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  border-top: 1px solid var(--c-border-light);
  font-size: 12px;
  color: var(--c-text-4);

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--c-success);
  }
}

/* ---------------- 头部 ---------------- */
.main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.header {
  height: var(--header-h);
  flex: 0 0 var(--header-h);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 20px;
  background: #fff;
  border-bottom: 1px solid var(--c-border-light);
}

.crumb {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--c-text-3);

  .crumb-current {
    color: var(--c-text-1);
    font-weight: 500;
  }
  .crumb-sep {
    color: var(--c-text-4);
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.menu-search {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 260px;
  height: 34px;
  padding: 0 12px;
  background: var(--c-fill);
  border-radius: var(--radius);
  transition: box-shadow 0.16s;

  &:focus-within {
    box-shadow: 0 0 0 2px rgba(43, 108, 246, 0.15);
    background: #fff;
  }
  .search-icon {
    color: var(--c-text-4);
    font-size: 15px;
  }
  input {
    flex: 1;
    border: 0;
    outline: none;
    background: transparent;
    font-size: 13px;
    color: var(--c-text-1);

    &::placeholder {
      color: var(--c-text-4);
    }
  }
}

.search-result {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 13px;

  &:hover {
    background: var(--c-fill-2);
  }
  small {
    color: var(--c-text-4);
  }
}

.segmented {
  display: flex;
  padding: 2px;
  background: var(--c-fill);
  border-radius: var(--radius);

  button {
    border: 0;
    background: transparent;
    padding: 4px 12px;
    font-size: 13px;
    color: var(--c-text-2);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.16s;

    &.on {
      background: var(--c-primary);
      color: #fff;
    }
  }
}

.header-link {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 13px;
  color: var(--c-text-2);
  cursor: pointer;

  &:hover {
    color: var(--c-primary);
  }
}

.status-panel {
  .status-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 0;
    font-size: 13px;
  }
}

.user-block {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-left: 14px;
  border-left: 1px solid var(--c-border-light);
}
.avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--c-primary);
  color: #fff;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.user-meta {
  display: flex;
  flex-direction: column;
  line-height: 16px;
}
.user-name {
  font-size: 13px;
  font-weight: 500;
}
.user-role {
  font-size: 11px;
  color: var(--c-text-4);
}
.clock {
  font-size: 12px;
  color: var(--c-text-3);
}

/* ---------------- 内容区 ---------------- */
.content {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 0;
}

/* ---------------- 紧凑模式 ---------------- */
.is-compact {
  :deep(.el-table .el-table__cell) {
    padding: 5px 0;
  }
  :deep(.el-table) {
    font-size: 12px;
  }
  :deep(.panel) {
    padding: 14px 16px;
  }
  :deep(.page) {
    padding: 12px 16px 0;
  }
}

/* ---------------- 移动端 ---------------- */
.sidebar-backdrop {
  position: fixed;
  inset: 0;
  z-index: 55;
  background: rgba(29, 33, 41, 0.42);
  backdrop-filter: blur(1px);
}

.sidebar-close,
.menu-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--c-border-light);
  border-radius: var(--radius);
  background: #fff;
  color: var(--c-text-2);
  font-size: 16px;
  cursor: pointer;
  transition: all 0.18s;
}
.sidebar-close {
  margin-left: auto;
  border-color: transparent;
  background: transparent;
}
.sidebar-close:hover,
.menu-btn:hover {
  background: var(--c-fill-2);
  color: var(--c-primary);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.22s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 1024px) {
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 60;
    width: 268px;
    transform: translateX(-102%);
    transition: transform 0.28s cubic-bezier(0.22, 0.61, 0.36, 1);
    box-shadow: none;
  }
  .sidebar.mobile-open {
    transform: translateX(0);
    box-shadow: var(--shadow-lg);
  }
  .content {
    -webkit-overflow-scrolling: touch;
  }
}

@media (max-width: 900px) {
  .menu-search,
  .segmented,
  .header-link {
    display: none;
  }
  .header {
    padding: 0 14px;
  }
  .crumb-group,
  .crumb-group + .crumb-sep {
    display: none;
  }
  .user-meta {
    display: none;
  }
  .user-block {
    padding-left: 10px;
    gap: 8px;
  }
}

@media (max-width: 560px) {
  .clock {
    display: none;
  }
  .brand-name {
    font-size: 14px;
  }
}

</style>
