<template>
  <header class="site-header" :class="{ scrolled }">
    <!-- 顶部状态条 -->
    <div class="utility">
      <div class="container">
        <div class="left">
          <span class="pulse-dot" />
          <span class="mono">{{ setting('site_slogan', '明德 · 格物 · 笃行 · 致远') }}</span>
        </div>
        <div class="right mono">
          <a :href="adminUrl + '/login'" target="_blank" rel="noopener" class="strong">统一身份认证</a>
          <span class="sep">/</span>
          <a :href="adminUrl" target="_blank" rel="noopener">教务系统</a>
          <span class="sep">/</span>
          <a :href="'mailto:' + setting('email')">{{ setting('email', 'office@university.edu.cn') }}</a>
          <span class="sep">/</span>
          <span class="dim">{{ setting('phone', '010-62785000') }}</span>
        </div>
      </div>
    </div>

    <!-- 主导航 -->
    <div class="navbar">
      <div class="container">
        <router-link to="/" class="brand">
          <span class="logo">
            <span class="logo-inner">启</span>
          </span>
          <span class="brand-text">
            <span class="cn">{{ setting('site_name', '启明大学') }}</span>
            <span class="en mono">QIMING UNIVERSITY</span>
          </span>
        </router-link>

        <nav class="menu">
          <router-link
            v-for="item in menus"
            :key="item.path"
            :to="item.path"
            class="menu-item"
            :class="{ active: isActive(item) }"
          >
            {{ item.label }}
          </router-link>
        </nav>

        <div class="actions">
          <div class="search">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" stroke-linecap="round" />
            </svg>
            <input v-model="keyword" type="text" placeholder="站内搜索" @keydown.enter="handleSearch" />
          </div>
          <a :href="adminUrl + '/login'" target="_blank" rel="noopener" class="cta mono">教务入口</a>
          <button class="menu-toggle" aria-label="展开菜单" @click="mobileOpen = !mobileOpen">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <path :d="mobileOpen ? 'M6 6l12 12M18 6L6 18' : 'M4 7h16M4 12h16M4 17h16'" stroke-linecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- 移动端菜单：入场用 CSS 动画，关闭时立即移除节点，
         不依赖 transitionend，避免动画帧被推迟时残留占位块 -->
    <nav v-if="mobileOpen" class="mobile-menu">
      <div class="container">
        <router-link
          v-for="item in menus"
          :key="item.path"
          :to="item.path"
          class="mobile-item"
          :class="{ active: isActive(item) }"
          @click="mobileOpen = false"
        >
          <span>{{ item.label }}</span>
          <span class="mono idx">{{ String(menus.indexOf(item) + 1).padStart(2, '0') }}</span>
        </router-link>
      </div>
    </nav>
  </header>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { adminUrl, setting, siteState } from '@/store/site';

const route = useRoute();
const router = useRouter();
const keyword = ref('');
const scrolled = ref(false);
const mobileOpen = ref(false);

const menus = computed(() => {
  const items = [
    { label: '首页', path: '/' },
    { label: '学校概况', path: '/page/about' },
    { label: '院系专业', path: '/departments' },
    { label: '师资队伍', path: '/teachers' },
    { label: '课程资源', path: '/courses' },
    { label: '新闻公告', path: '/news' },
    { label: '招生信息', path: '/page/admissions' },
    { label: '校园生活', path: '/page/campus' },
    { label: '联系我们', path: '/page/contact' },
  ];

  // 后台新增的自定义单页自动追加到导航
  const builtin = ['about', 'admissions', 'campus', 'contact'];
  const extra = (siteState.info?.pages ?? [])
    .filter((page) => !builtin.includes(page.slug))
    .map((page) => ({ label: page.title, path: `/page/${page.slug}` }));

  return [...items, ...extra];
});

function isActive(item: { path: string }) {
  if (item.path === '/') return route.path === '/';
  if (item.path === '/news') return route.path.startsWith('/news');
  return route.path === item.path;
}

function handleSearch() {
  const value = keyword.value.trim();
  if (!value) return;
  mobileOpen.value = false;
  router.push({ path: '/search', query: { keyword: value } });
}

function onScroll() {
  scrolled.value = window.scrollY > 12;
}

onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }));
onUnmounted(() => window.removeEventListener('scroll', onScroll));
</script>

<style scoped lang="scss">
.site-header {
  position: sticky;
  top: 0;
  z-index: 40;
}

/* ---------- 顶部状态条（深蓝，压住版面） ---------- */
.utility {
  height: 40px;
  background: var(--dark-bg);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);

  .container {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  .left {
    display: flex;
    align-items: center;
    gap: 9px;
    font-size: 12px;
    letter-spacing: 0.08em;
    color: var(--dark-text-2);
  }
  .right {
    display: flex;
    align-items: center;
    font-size: 12px;
    color: var(--dark-text-2);
  }
  a:hover {
    color: #fff;
  }
  .strong {
    color: #dce8ff;
  }
  .sep {
    margin: 0 10px;
    color: rgba(255, 255, 255, 0.28);
  }
  .dim {
    color: rgba(255, 255, 255, 0.42);
  }
}
@media (max-width: 1080px) {
  .utility .right a:nth-of-type(3),
  .utility .right .sep:nth-of-type(3) {
    display: none;
  }
}
@media (max-width: 820px) {
  .utility .left {
    display: none;
  }
  .utility .container {
    justify-content: flex-end;
  }
}
@media (max-width: 620px) {
  .utility .right a:not(.strong),
  .utility .right .sep {
    display: none;
  }
}

/* ---------- 主导航（白色毛玻璃） ---------- */
.navbar {
  background: rgba(255, 255, 255, 0.86);
  backdrop-filter: var(--blur);
  -webkit-backdrop-filter: var(--blur);
  border-bottom: 1px solid transparent;
  transition: border-color 0.3s var(--ease), box-shadow 0.3s var(--ease), background 0.3s var(--ease);

  .container {
    height: 72px;
    display: flex;
    align-items: center;
    gap: 22px;
  }
}
.scrolled .navbar {
  background: rgba(255, 255, 255, 0.95);
  border-bottom-color: var(--line);
  box-shadow: 0 10px 30px rgba(15, 42, 92, 0.08);
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 0 0 auto;
}
.logo {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--grad-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 20px rgba(31, 95, 224, 0.32);
}
.logo-inner {
  font-size: 19px;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.02em;
}
.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}
.brand-text .cn {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--text-1);
}
.brand-text .en {
  font-size: 9.5px;
  letter-spacing: 0.24em;
  color: var(--text-4);
}

.menu {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  overflow-x: auto;
  scrollbar-width: none;
}
.menu::-webkit-scrollbar {
  display: none;
}
.menu-item {
  position: relative;
  /* 注意：容器宽度封顶（不随窗口变宽），所以这里始终用紧凑尺寸，
     否则宽屏下单个菜单项变宽会把最后一个栏目挤出可视区域 */
  padding: 9px 8px;
  font-size: 14px;
  color: var(--text-2);
  white-space: nowrap;
  border-radius: 8px;
  flex: 0 0 auto;
  transition: color 0.22s var(--ease), background 0.22s var(--ease);

  &::after {
    content: '';
    position: absolute;
    left: 8px;
    right: 8px;
    bottom: 2px;
    height: 2px;
    border-radius: 2px;
    background: var(--grad-primary);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.3s var(--ease);
  }
  &:hover {
    color: var(--c-blue);
    background: rgba(31, 95, 224, 0.06);
  }
  &.active {
    color: var(--c-blue);
    font-weight: 600;
  }
  &.active::after {
    transform: scaleX(1);
  }
}

.actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 0 0 auto;
}
.search {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 14px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--bg-1);
  color: var(--text-4);
  transition: all 0.24s var(--ease);

  &:focus-within {
    border-color: var(--c-blue);
    background: #fff;
    box-shadow: 0 0 0 4px rgba(31, 95, 224, 0.1);
    color: var(--c-blue);
  }
  input {
    width: 132px;
    border: 0;
    outline: none;
    background: transparent;
    font-size: 13.5px;
    color: var(--text-1);

    &::placeholder {
      color: var(--text-4);
    }
  }
}

.cta {
  display: inline-flex;
  align-items: center;
  height: 38px;
  padding: 0 18px;
  border-radius: 999px;
  background: var(--grad-primary);
  color: #fff;
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: 0.06em;
  box-shadow: 0 8px 20px rgba(31, 95, 224, 0.28);
  transition: transform 0.22s var(--ease), filter 0.22s var(--ease);
}
.cta:hover {
  color: #fff;
  transform: translateY(-1px);
  filter: brightness(1.06);
}

.menu-toggle {
  display: none;
  width: 38px;
  height: 38px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #fff;
  color: var(--text-1);
  cursor: pointer;
}

/* ---------- 移动端菜单 ---------- */
.mobile-menu {
  background: #fff;
  border-bottom: 1px solid var(--line);
  box-shadow: 0 18px 40px rgba(15, 42, 92, 0.12);
  max-height: calc(100vh - 100px);
  overflow-y: auto;
  animation: drop-in 0.24s var(--ease) both;

  .container {
    display: flex;
    flex-direction: column;
    padding-top: 8px;
    padding-bottom: 16px;
  }
}
.mobile-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 4px;
  border-bottom: 1px solid var(--line);
  font-size: 15px;
  color: var(--text-2);

  .idx {
    font-size: 11px;
    color: var(--text-4);
    letter-spacing: 0.1em;
  }
  &.active {
    color: var(--c-blue);
    font-weight: 600;
  }
  &.active .idx {
    color: var(--c-blue);
  }
}

@keyframes drop-in {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

/* 窄一些的桌面：收窄搜索框与品牌字号，优先把空间留给导航 */
@media (max-width: 1440px) {
  .navbar .container {
    gap: 14px;
  }
  .brand-text .cn {
    font-size: 17px;
  }
  .search {
    padding: 0 12px;
  }
  .search input {
    width: 96px;
  }
  .cta {
    padding: 0 15px;
  }
}
/* 1366 及以下：收起搜索框，把空间让给导航 */
@media (max-width: 1366px) {
  .search {
    display: none;
  }
}
@media (max-width: 1240px) {
  .menu {
    display: none;
  }
  .menu-toggle {
    display: inline-flex;
  }
  .navbar .container {
    height: 64px;
    justify-content: space-between;
  }
}
@media (max-width: 620px) {
  .brand-text .en {
    display: none;
  }
  .cta {
    padding: 0 14px;
  }
}
</style>
