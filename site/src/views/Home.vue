<template>
  <div class="home">
    <!-- ============ 首屏 ============ -->
    <section class="hero">
      <!-- 背景层：光晕 + 扫描线 + 轨道环 -->
      <div class="hero-bg" aria-hidden="true">
        <span class="orb orb-1" />
        <span class="orb orb-2" />
        <span class="orb orb-3" />
        <span class="grid-plane" />
        <span class="scan" />
      </div>

      <div class="container hero-inner">
        <div class="hero-main">
          <div class="eyebrow-chip">
            <span class="pulse-dot" />
            <span class="mono">{{ setting('site_name', '启明大学') }} · 2026</span>
          </div>

          <h1 class="hero-title">{{ activeBanner?.title || setting('site_name', '启明大学') }}</h1>
          <p class="hero-sub">{{ activeBanner?.subtitle || setting('site_description') }}</p>

          <div class="hero-actions">
            <router-link v-if="activeBanner?.link" :to="activeBanner.link" class="btn">
              查看详情
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h13M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </router-link>
            <router-link to="/page/admissions" class="btn ghost">招生信息</router-link>
          </div>

          <div class="hero-metrics">
            <div v-for="item in heroMetrics" :key="item.label" class="metric">
              <span class="value mono"><CountUp :value="item.value" /></span>
              <span class="unit mono">{{ item.unit }}</span>
              <span class="label">{{ item.label }}</span>
            </div>
          </div>
        </div>

        <!-- 轮播切换器 -->
        <div class="hero-switch">
          <div class="switch-head mono">
            <span>FOCUS</span>
            <span>{{ String(current + 1).padStart(2, '0') }} / {{ String(banners.length || 1).padStart(2, '0') }}</span>
          </div>
          <button
            v-for="(banner, index) in banners"
            :key="banner.id"
            class="switch-item"
            :class="{ on: index === current }"
            @click="selectBanner(index)"
          >
            <span class="idx mono">{{ String(index + 1).padStart(2, '0') }}</span>
            <span class="txt">{{ banner.title }}</span>
            <span class="bar"><i :style="{ width: index === current ? progress + '%' : '0%' }" /></span>
          </button>
        </div>
      </div>

      <!-- 数据跑马灯 -->
      <div class="ticker">
        <div class="ticker-track">
          <span v-for="(item, index) in tickerLoop" :key="index" class="ticker-item mono">
            <em>{{ item.k }}</em>{{ item.v }}
          </span>
        </div>
      </div>
    </section>

    <!-- ============ 快捷入口 ============ -->
    <section class="quick">
      <div class="container">
        <div class="quick-grid">
          <a
            v-for="(item, index) in quickEntries"
            :key="item.label"
            v-reveal="`${index * 60}ms`"
            class="quick-item card"
            :href="item.href"
            :target="item.external ? '_blank' : undefined"
            rel="noopener"
          >
            <span class="icon" :style="{ background: item.grad }">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9">
                <path :d="item.icon" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </span>
            <span class="text">
              <b>{{ item.label }}</b>
              <small class="mono">{{ item.desc }}</small>
            </span>
            <span class="arrow mono">→</span>
          </a>
        </div>
      </div>
    </section>

    <!-- ============ 数据面板（深色数据墙） ============ -->
    <section class="data-band">
      <div class="container">
        <div class="section-head">
          <div class="titles">
            <span class="en">Data Overview</span>
            <h2>数字启明</h2>
          </div>
          <span class="more mono">实时读取教务库</span>
        </div>

        <div class="data-grid">
          <div v-for="(item, index) in statItems" :key="item.label" v-reveal="`${index * 70}ms`" class="data-card card">
            <div class="data-top">
              <span class="mono label">{{ item.label }}</span>
              <span class="mono code">{{ String(index + 1).padStart(2, '0') }}</span>
            </div>
            <div class="data-value">
              <CountUp :value="item.value" />
              <small class="mono">{{ item.unit }}</small>
            </div>
            <div class="data-bars" aria-hidden="true">
              <i v-for="n in 12" :key="n" :style="{ height: barHeight(n, index) }" />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ 新闻 & 公告 ============ -->
    <section v-reveal class="page-section">
      <div class="container">
        <div class="news-layout">
          <div class="news-main">
            <div class="section-head">
              <div class="titles">
                <span class="en">News</span>
                <h2>学校新闻</h2>
              </div>
              <router-link class="more mono" to="/news?category=学校新闻">MORE →</router-link>
            </div>

            <div v-if="loading" class="news-skeleton">
              <div v-for="i in 3" :key="i" class="skeleton" style="height: 104px; margin-bottom: 14px" />
            </div>

            <div v-else class="news-cards">
              <router-link
                v-for="(article, index) in newsList"
                :key="article.id"
                v-reveal="`${index * 55}ms`"
                class="news-card card"
                :to="`/news/${article.id}`"
              >
                <div class="date mono">
                  <b>{{ toDateParts(article.published_at).date.replace('日', '') }}</b>
                  <span>{{ toDateParts(article.published_at).year }}.{{ toDateParts(article.published_at).month.replace('月', '') }}</span>
                </div>
                <div class="content">
                  <div class="meta-row mono">
                    <span class="chip">{{ article.category }}</span>
                    <span class="src">{{ article.source || '启明大学' }}</span>
                  </div>
                  <h3>{{ article.title }}</h3>
                  <p>{{ article.summary }}</p>
                </div>
              </router-link>
            </div>
          </div>

          <aside class="news-side">
            <div class="section-head">
              <div class="titles">
                <span class="en">Notices</span>
                <h2>通知公告</h2>
              </div>
              <router-link class="more mono" to="/news?category=通知公告">MORE →</router-link>
            </div>

            <ul class="notice-list">
              <li v-for="notice in notices" :key="notice.id">
                <router-link :to="`/news/${notice.id}`">
                  <span class="mono day">{{ formatDay(notice.published_at).slice(5) }}</span>
                  <span class="title">{{ notice.title }}</span>
                  <span class="arrow mono">→</span>
                </router-link>
              </li>
            </ul>

            <div class="admission-card">
              <span class="eyebrow">ADMISSION</span>
              <h3>2026 年本科招生</h3>
              <p>19 个本科专业面向全国 31 个省份招生，欢迎报考启明大学。</p>
              <router-link to="/page/admissions" class="btn">查看招生章程</router-link>
            </div>
          </aside>
        </div>
      </div>
    </section>

    <!-- ============ 院系专业 ============ -->
    <section v-reveal class="page-section soft">
      <div class="container">
        <div class="section-head">
          <div class="titles">
            <span class="en">Schools &amp; Programs</span>
            <h2>院系与专业</h2>
          </div>
          <router-link class="more mono" to="/departments">ALL SCHOOLS →</router-link>
        </div>

        <div class="dept-grid">
          <router-link
            v-for="(dept, index) in departments.slice(0, 6)"
            :key="dept.id"
            v-reveal="`${index * 65}ms`"
            class="dept-card card"
            :to="`/departments#dept-${dept.id}`"
          >
            <div class="dept-head">
              <span class="code mono">{{ dept.code }}</span>
              <span class="count mono">{{ dept.major_count }} MAJORS</span>
            </div>
            <h3>{{ dept.name }}</h3>
            <p class="desc">{{ dept.description }}</p>
            <div class="tags">
              <span v-for="major in dept.majors.slice(0, 3)" :key="major.id" class="mono">{{ major.name }}</span>
            </div>
            <div class="foot mono">
              <span>学生 {{ dept.student_count }}</span>
              <span>教师 {{ dept.teacher_count }}</span>
            </div>
          </router-link>
        </div>
      </div>
    </section>

    <!-- ============ 师资 ============ -->
    <section v-reveal class="page-section">
      <div class="container">
        <div class="section-head">
          <div class="titles">
            <span class="en">Faculty</span>
            <h2>师资队伍</h2>
          </div>
          <router-link class="more mono" to="/teachers">ALL FACULTY →</router-link>
        </div>

        <div class="teacher-grid">
          <router-link
            v-for="(teacher, index) in teachers"
            :key="teacher.id"
            v-reveal="`${index * 50}ms`"
            class="teacher-card card"
            :to="`/teachers?departmentId=${teacher.department_name}`"
          >
            <span class="avatar">{{ teacher.name.slice(0, 1) }}</span>
            <span class="info">
              <span class="name">
                {{ teacher.name }}
                <em class="mono">{{ teacher.title }}</em>
              </span>
              <span class="dept">{{ teacher.department_name || '公共教学部' }}</span>
              <span class="meta mono">主讲 {{ teacher.offering_count }} 门次</span>
            </span>
          </router-link>
        </div>
      </div>
    </section>

    <!-- ============ 行动区 ============ -->
    <section class="cta-section">
      <div class="container">
        <div v-reveal class="cta-panel">
          <span class="orb orb-cta" aria-hidden="true" />
          <div class="cta-text">
            <span class="eyebrow">OPEN DAY</span>
            <h2>走进启明，遇见未来</h2>
            <p>每月第三个周六为校园开放日，欢迎考生与家长来校参观实验室、图书馆与学生公寓。</p>
          </div>
          <div class="cta-actions">
            <router-link to="/page/campus" class="btn">了解校园生活</router-link>
            <router-link to="/page/contact" class="btn ghost">联系我们</router-link>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { publicApi, type ArticleBrief, type Banner, type DepartmentInfo, type TeacherInfo } from '@/api';
import CountUp from '@/components/CountUp.vue';
import { formatDay, loadSite, setting, siteState, toDateParts, useSeo } from '@/store/site';

const banners = ref<Banner[]>([]);
const newsList = ref<ArticleBrief[]>([]);
const notices = ref<ArticleBrief[]>([]);
const departments = ref<DepartmentInfo[]>([]);
const teachers = ref<TeacherInfo[]>([]);
const loading = ref(true);
const current = ref(0);
const progress = ref(0);
let spinTimer: number | undefined;
let progressTimer: number | undefined;

const activeBanner = computed(() => banners.value[current.value]);

const quickEntries = [
  {
    label: '教务系统',
    desc: '选课 · 成绩 · 学籍',
    href: `${import.meta.env.VITE_ADMIN_URL || 'http://127.0.0.1:5173'}/login`,
    external: true,
    grad: 'linear-gradient(135deg, rgba(77,141,255,.9), rgba(34,211,238,.75))',
    icon: 'M4 5h16v12H4zM8 21h8M12 17v4',
  },
  {
    label: '院系专业',
    desc: '19 个本科专业',
    href: '/departments',
    external: false,
    grad: 'linear-gradient(135deg, rgba(0,229,160,.85), rgba(34,211,238,.7))',
    icon: 'M3 21h18M5 21V8l7-5 7 5v13M10 21v-5h4v5',
  },
  {
    label: '师资队伍',
    desc: '教授 · 副教授 · 讲师',
    href: '/teachers',
    external: false,
    grad: 'linear-gradient(135deg, rgba(139,92,246,.9), rgba(77,141,255,.75))',
    icon: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
  },
  {
    label: '新闻公告',
    desc: '校园动态与通知',
    href: '/news',
    external: false,
    grad: 'linear-gradient(135deg, rgba(255,176,32,.85), rgba(255,120,80,.7))',
    icon: 'M4 5h13v14H4zM17 9h3v10h-3M7 9h7M7 12h7M7 15h4',
  },
];

const heroMetrics = computed(() => {
  const stats = siteState.info?.stats;
  return [
    { label: '教学单位', value: stats?.departments ?? 0, unit: 'UNITS' },
    { label: '本科专业', value: stats?.majors ?? 0, unit: 'MAJORS' },
    { label: '在校学生', value: stats?.students ?? 0, unit: 'STUDENTS' },
  ];
});

const statItems = computed(() => {
  const stats = siteState.info?.stats;
  return [
    { label: '教学单位', value: stats?.departments ?? 0, unit: '个' },
    { label: '本科专业', value: stats?.majors ?? 0, unit: '个' },
    { label: '在校学生', value: stats?.students ?? 0, unit: '人' },
    { label: '专任教师', value: stats?.teachers ?? 0, unit: '人' },
    { label: '开设课程', value: stats?.courses ?? 0, unit: '门' },
  ];
});

const tickerItems = computed(() => {
  const stats = siteState.info?.stats;
  return [
    { k: 'CURRENT SEMESTER', v: siteState.info ? ' 2025-2026-1' : '' },
    { k: 'STUDENTS', v: ` ${stats?.students ?? 0}` },
    { k: 'FACULTY', v: ` ${stats?.teachers ?? 0}` },
    { k: 'PROGRAMS', v: ` ${stats?.majors ?? 0}` },
    { k: 'COURSES', v: ` ${stats?.courses ?? 0}` },
    { k: 'SCHOOLS', v: ` ${stats?.departments ?? 0}` },
    { k: 'UPDATED', v: ` ${formatDay(new Date().toISOString())}` },
  ];
});

/** 数据卡里的装饰柱：用确定性的伪随机高度，避免每次渲染跳动 */
function barHeight(index: number, seed: number) {
  const value = Math.abs(Math.sin((index + 1) * (seed + 3) * 1.7)) * 70 + 18;
  return `${Math.round(value)}%`;
}

/** 跑马灯内容复制两份，配合 -50% 位移实现无缝滚动 */
const tickerLoop = computed(() => [...tickerItems.value, ...tickerItems.value]);

function selectBanner(index: number) {
  current.value = index;
  progress.value = 0;
}

function startAutoPlay() {
  if (banners.value.length <= 1) return;
  const duration = 6000;
  const step = 60;
  progressTimer = window.setInterval(() => {
    progress.value = Math.min(100, progress.value + (step / duration) * 100);
  }, step);
  spinTimer = window.setInterval(() => {
    current.value = (current.value + 1) % banners.value.length;
    progress.value = 0;
  }, duration);
}

onMounted(async () => {
  try {
    await loadSite();
    const [bannerList, headline, deptList, teacherList] = await Promise.all([
      publicApi.banners(),
      publicApi.headline(),
      publicApi.departments(),
      publicApi.teachers(),
    ]);
    banners.value = bannerList;
    newsList.value = headline.top;
    notices.value = headline.notices;
    departments.value = deptList;
    teachers.value = teacherList
      .filter((item) => item.title === '教授' || item.title === '副教授')
      .slice(0, 8);
    startAutoPlay();
  } finally {
    loading.value = false;
  }

  useSeo('', setting('site_description'));
});

onUnmounted(() => {
  if (spinTimer) window.clearInterval(spinTimer);
  if (progressTimer) window.clearInterval(progressTimer);
});
</script>

<style scoped lang="scss">
/* ============================================================
   首屏（明亮）
   ============================================================ */
.hero {
  position: relative;
  padding: 84px 0 0;
  overflow: hidden;
  border-bottom: 1px solid var(--line);
  background: radial-gradient(120% 100% at 82% -10%, rgba(31, 95, 224, 0.14) 0%, transparent 55%),
    radial-gradient(110% 90% at 6% 4%, rgba(6, 182, 212, 0.12) 0%, transparent 52%),
    linear-gradient(180deg, #f7faff 0%, #ffffff 68%);
}

.hero-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}
.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.55;
}
.orb-1 {
  width: 440px;
  height: 440px;
  top: -160px;
  right: 4%;
  background: rgba(31, 95, 224, 0.34);
  animation: drift-1 22s var(--ease) infinite alternate;
}
.orb-2 {
  width: 360px;
  height: 360px;
  bottom: -170px;
  left: -70px;
  background: rgba(6, 182, 212, 0.28);
  animation: drift-2 26s var(--ease) infinite alternate;
}
.orb-3 {
  width: 280px;
  height: 280px;
  top: 30%;
  left: 44%;
  background: rgba(124, 58, 237, 0.16);
  animation: drift-1 30s var(--ease) infinite alternate-reverse;
}
@keyframes drift-1 {
  from {
    transform: translate3d(0, 0, 0) scale(1);
  }
  to {
    transform: translate3d(-70px, 50px, 0) scale(1.12);
  }
}
@keyframes drift-2 {
  from {
    transform: translate3d(0, 0, 0) scale(1.06);
  }
  to {
    transform: translate3d(60px, -40px, 0) scale(1);
  }
}

/* 透视网格地面（浅色版） */
.grid-plane {
  position: absolute;
  left: -20%;
  right: -20%;
  bottom: -32%;
  height: 66%;
  background-image: linear-gradient(rgba(31, 95, 224, 0.16) 1px, transparent 1px),
    linear-gradient(90deg, rgba(31, 95, 224, 0.16) 1px, transparent 1px);
  background-size: 56px 56px;
  transform: perspective(560px) rotateX(62deg);
  mask-image: linear-gradient(to top, #000 0%, transparent 76%);
  -webkit-mask-image: linear-gradient(to top, #000 0%, transparent 76%);
  opacity: 0.5;
}

/* 扫描线 */
.scan {
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.6), transparent);
  animation: scan-move 9s linear infinite;
  opacity: 0.75;
}
@keyframes scan-move {
  0% {
    top: 12%;
  }
  100% {
    top: 92%;
  }
}

.hero-inner {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(280px, 0.75fr);
  gap: 48px;
  align-items: end;
  padding-bottom: 56px;
}

.hero-main {
  min-width: 0;
}
.eyebrow-chip {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 7px 15px;
  margin-bottom: 24px;
  border: 1px solid rgba(31, 95, 224, 0.22);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: var(--blur);
  -webkit-backdrop-filter: var(--blur);
  font-size: 11.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-2);
}

.hero-title {
  font-size: 50px;
  line-height: 1.18;
  letter-spacing: -0.03em;
  margin-bottom: 20px;
  background: var(--grad-text);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  max-width: 20ch;
}

.hero-sub {
  font-size: 16.5px;
  line-height: 1.85;
  color: var(--text-2);
  max-width: 56ch;
  margin-bottom: 32px;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-bottom: 44px;
}

.hero-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 42px;
  padding-top: 26px;
  border-top: 1px solid var(--line);
}
.metric {
  display: flex;
  flex-direction: column;
  gap: 2px;

  .value {
    font-size: 30px;
    font-weight: 600;
    letter-spacing: -0.02em;
    background: var(--grad-primary);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .unit {
    font-size: 9.5px;
    letter-spacing: 0.2em;
    color: var(--text-4);
  }
  .label {
    font-size: 12.5px;
    color: var(--text-3);
  }
}

/* 轮播切换器（白色卡片） */
.hero-switch {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 18px;
  border: 1px solid var(--glass-line);
  border-radius: var(--radius);
  background: #fff;
  box-shadow: 0 18px 44px rgba(15, 42, 92, 0.1);
}
.switch-head {
  display: flex;
  justify-content: space-between;
  padding: 0 6px 12px;
  margin-bottom: 4px;
  border-bottom: 1px solid var(--line);
  font-size: 10.5px;
  letter-spacing: 0.2em;
  color: var(--text-4);
}
.switch-item {
  position: relative;
  display: grid;
  grid-template-columns: 28px 1fr;
  align-items: center;
  gap: 10px;
  padding: 11px 6px;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
  border-radius: 10px;
  transition: background 0.24s var(--ease);

  .idx {
    font-size: 11px;
    color: var(--text-4);
    letter-spacing: 0.08em;
  }
  .txt {
    font-size: 13.5px;
    color: var(--text-3);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: color 0.24s var(--ease);
  }
  .bar {
    grid-column: 1 / -1;
    height: 2px;
    margin-top: 8px;
    border-radius: 2px;
    background: var(--bg-2);
    overflow: hidden;

    i {
      display: block;
      height: 100%;
      background: var(--grad-primary);
      transition: width 0.12s linear;
    }
  }
  &:hover {
    background: var(--bg-1);
  }
  &:hover .txt {
    color: var(--text-1);
  }
  &.on .idx {
    color: var(--c-blue);
  }
  &.on .txt {
    color: var(--text-1);
    font-weight: 600;
  }
}

/* 数据跑马灯 */
.ticker {
  position: relative;
  z-index: 2;
  border-top: 1px solid var(--line);
  background: var(--bg-1);
  overflow: hidden;
  height: 40px;
  display: flex;
  align-items: center;

  &::before,
  &::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    width: 64px;
    z-index: 2;
    pointer-events: none;
  }
  &::before {
    left: 0;
    background: linear-gradient(90deg, #f5f8fd, transparent);
  }
  &::after {
    right: 0;
    background: linear-gradient(270deg, #f5f8fd, transparent);
  }
}
.ticker-track {
  display: flex;
  gap: 46px;
  white-space: nowrap;
  animation: ticker-move 38s linear infinite;
  padding-left: 40px;
}
@keyframes ticker-move {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
}
.ticker-item {
  font-size: 11.5px;
  letter-spacing: 0.12em;
  color: var(--text-3);

  em {
    font-style: normal;
    color: var(--text-4);
    margin-right: 8px;
  }
}

/* ============================================================
   快捷入口
   ============================================================ */
.quick {
  padding: 40px 0 8px;
}
.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}
.quick-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  border-radius: var(--radius);

  .icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    color: #fff;
    flex: 0 0 auto;
    box-shadow: 0 8px 20px rgba(31, 95, 224, 0.24);
  }
  .text {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;
  }
  b {
    font-size: 15px;
    color: var(--text-1);
  }
  small {
    font-size: 11.5px;
    letter-spacing: 0.04em;
    color: var(--text-4);
  }
  .arrow {
    color: var(--text-4);
    font-size: 15px;
    transition: transform 0.24s var(--ease), color 0.24s var(--ease);
  }
  &:hover .arrow {
    color: var(--c-blue);
    transform: translateX(4px);
  }
}

/* ============================================================
   数字启明 · 深色数据墙
   ============================================================ */
.data-band {
  position: relative;
  padding: 72px 0;
  background: linear-gradient(120deg, var(--dark-bg) 0%, var(--dark-bg-2) 100%);
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
    background-size: 56px 56px;
    mask-image: radial-gradient(90% 120% at 50% 0%, #000, transparent 72%);
    -webkit-mask-image: radial-gradient(90% 120% at 50% 0%, #000, transparent 72%);
    pointer-events: none;
  }
  .section-head h2 {
    color: #fff;
  }
  .section-head .en {
    color: #7dd3fc;
  }
  .section-head .more {
    color: rgba(255, 255, 255, 0.5);
  }
  .container {
    position: relative;
    z-index: 1;
  }
}

.data-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 16px;
}
.data-card {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-radius: var(--radius);
  border: 1px solid var(--dark-line);
  background: rgba(255, 255, 255, 0.04);
  transition: border-color 0.3s var(--ease), background 0.3s var(--ease), transform 0.3s var(--ease);

  &:hover {
    transform: translateY(-4px);
    border-color: rgba(125, 211, 252, 0.45);
    background: rgba(255, 255, 255, 0.07);
  }
  .data-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 11px;
    letter-spacing: 0.16em;
    color: rgba(255, 255, 255, 0.45);

    .code {
      color: rgba(125, 211, 252, 0.65);
    }
  }
  .data-value {
    display: flex;
    align-items: baseline;
    gap: 5px;
    font-size: 34px;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: #fff;

    small {
      font-size: 12px;
      font-weight: 400;
      color: rgba(255, 255, 255, 0.55);
    }
  }
  .data-bars {
    display: flex;
    align-items: flex-end;
    gap: 3px;
    height: 30px;

    i {
      flex: 1;
      border-radius: 2px 2px 0 0;
      background: linear-gradient(180deg, rgba(125, 211, 252, 0.9), rgba(31, 95, 224, 0.35));
    }
  }
}

/* ============================================================
   新闻 & 公告
   ============================================================ */
.news-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
  gap: 44px;
}
.news-cards {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.news-card {
  display: flex;
  gap: 20px;
  padding: 20px 22px;

  .date {
    flex: 0 0 78px;
    text-align: center;
    padding-right: 20px;
    border-right: 1px solid var(--line);

    b {
      display: block;
      font-size: 30px;
      line-height: 1.1;
      background: var(--grad-primary);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    span {
      font-size: 11px;
      color: var(--text-4);
      letter-spacing: 0.06em;
    }
  }
  .content {
    min-width: 0;
  }
  .meta-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
    font-size: 11px;
    letter-spacing: 0.1em;

    .chip {
      padding: 2px 9px;
      border-radius: 999px;
      border: 1px solid rgba(31, 95, 224, 0.24);
      color: var(--c-blue);
      background: rgba(31, 95, 224, 0.07);
    }
    .src {
      color: var(--text-4);
    }
  }
  h3 {
    font-size: 17px;
    margin-bottom: 8px;
    color: var(--text-1);
    transition: color 0.24s var(--ease);
  }
  &:hover h3 {
    color: var(--c-blue);
  }
  p {
    margin: 0;
    font-size: 13.5px;
    color: var(--text-3);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}

.notice-list {
  list-style: none;
  margin: 0 0 24px;
  padding: 0;

  li {
    border-bottom: 1px solid var(--line);
  }
  a {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 13px 0;
    font-size: 14px;
  }
  .day {
    flex: 0 0 auto;
    font-size: 12px;
    color: var(--text-4);
    letter-spacing: 0.06em;
  }
  .title {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-2);
    transition: color 0.22s var(--ease);
  }
  .arrow {
    flex: 0 0 auto;
    color: transparent;
    font-size: 13px;
    transition: color 0.22s var(--ease), transform 0.22s var(--ease);
  }
  a:hover .title {
    color: var(--c-blue);
  }
  a:hover .arrow {
    color: var(--c-blue);
    transform: translateX(3px);
  }
}

.admission-card {
  position: relative;
  padding: 26px;
  border-radius: var(--radius);
  border: 1px solid rgba(31, 95, 224, 0.2);
  background: linear-gradient(150deg, rgba(31, 95, 224, 0.1), rgba(6, 182, 212, 0.07) 60%, #fff);
  overflow: hidden;

  .eyebrow {
    display: block;
    margin-bottom: 12px;
  }
  h3 {
    font-size: 20px;
    margin-bottom: 10px;
    color: var(--text-1);
  }
  p {
    font-size: 13.5px;
    color: var(--text-2);
    margin-bottom: 20px;
  }
}

/* ============================================================
   院系
   ============================================================ */
.dept-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}
.dept-card {
  padding: 24px;

  .dept-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;

    .code {
      font-size: 12px;
      letter-spacing: 0.16em;
      color: var(--c-blue);
    }
    .count {
      font-size: 10.5px;
      letter-spacing: 0.14em;
      color: var(--text-4);
    }
  }
  h3 {
    font-size: 18px;
    margin-bottom: 10px;
    color: var(--text-1);
  }
  .desc {
    font-size: 13.5px;
    color: var(--text-3);
    margin-bottom: 16px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 18px;

    span {
      font-size: 11px;
      letter-spacing: 0.04em;
      padding: 4px 9px;
      border-radius: 6px;
      background: var(--bg-1);
      border: 1px solid var(--line);
      color: var(--text-3);
    }
  }
  .foot {
    display: flex;
    gap: 18px;
    padding-top: 14px;
    border-top: 1px solid var(--line);
    font-size: 11.5px;
    letter-spacing: 0.08em;
    color: var(--text-4);
  }
}

/* ============================================================
   师资
   ============================================================ */
.teacher-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}
.teacher-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;

  .avatar {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 50px;
    height: 50px;
    flex: 0 0 auto;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(31, 95, 224, 0.14), rgba(6, 182, 212, 0.12));
    border: 1px solid rgba(31, 95, 224, 0.22);
    color: var(--c-blue);
    font-size: 19px;
    font-weight: 600;
  }
  .info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .name {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-1);

    em {
      font-style: normal;
      font-size: 10px;
      letter-spacing: 0.08em;
      padding: 2px 7px;
      border-radius: 5px;
      color: var(--c-amber);
      background: rgba(217, 119, 6, 0.1);
      border: 1px solid rgba(217, 119, 6, 0.22);
    }
  }
  .dept {
    font-size: 12.5px;
    color: var(--text-3);
    margin-top: 3px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .meta {
    font-size: 11px;
    letter-spacing: 0.06em;
    color: var(--text-4);
    margin-top: 2px;
  }
}

/* ============================================================
   行动区
   ============================================================ */
.cta-section {
  padding: 0 0 84px;
}
.cta-panel {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 36px;
  flex-wrap: wrap;
  padding: 46px 48px;
  border-radius: var(--radius-lg);
  border: 1px solid rgba(31, 95, 224, 0.18);
  background: linear-gradient(130deg, rgba(31, 95, 224, 0.1), rgba(124, 58, 237, 0.07) 55%, #fff);
  overflow: hidden;

  .orb-cta {
    position: absolute;
    width: 420px;
    height: 420px;
    right: -120px;
    top: -180px;
    background: rgba(6, 182, 212, 0.22);
    filter: blur(80px);
    pointer-events: none;
  }
  .cta-text {
    position: relative;
    z-index: 1;
    max-width: 620px;
  }
  .eyebrow {
    display: block;
    margin-bottom: 12px;
  }
  h2 {
    font-size: 30px;
    margin-bottom: 12px;
    color: var(--text-1);
  }
  p {
    margin: 0;
    font-size: 14.5px;
    color: var(--text-2);
  }
  .cta-actions {
    position: relative;
    z-index: 1;
    display: flex;
    gap: 12px;
  }
}

/* ============================================================
   响应式
   ============================================================ */
@media (max-width: 1200px) {
  .hero-inner {
    grid-template-columns: minmax(0, 1fr);
    gap: 34px;
    padding-bottom: 44px;
  }
  .hero-switch {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 6px;
  }
  .switch-head {
    width: 100%;
  }
  .switch-item {
    flex: 1 1 200px;
    grid-template-columns: 24px 1fr;
  }
  .data-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .teacher-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 980px) {
  .hero {
    padding-top: 60px;
  }
  .hero-title {
    font-size: 38px;
  }
  .news-layout {
    grid-template-columns: minmax(0, 1fr);
    gap: 46px;
  }
  .dept-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .quick-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .data-band {
    padding: 52px 0;
  }
}

@media (max-width: 640px) {
  .hero {
    padding-top: 44px;
  }
  .hero-title {
    font-size: 29px;
    max-width: none;
  }
  .hero-sub {
    font-size: 15px;
  }
  .hero-metrics {
    gap: 26px;
  }
  .metric .value {
    font-size: 24px;
  }
  .data-grid,
  .teacher-grid,
  .dept-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .data-card .data-value {
    font-size: 26px;
  }
  .quick-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .news-card .date {
    display: none;
  }
  .cta-panel {
    padding: 30px 24px;
  }
  .cta-panel h2 {
    font-size: 23px;
  }
  .ticker {
    height: 34px;
  }
  .ticker-track {
    gap: 30px;
  }
}
</style>
