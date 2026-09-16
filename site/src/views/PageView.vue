<template>
  <div>
    <div class="crumb-bar">
      <div class="container">
        <div class="page-title">{{ page?.title || '页面' }}</div>
        <div class="crumb">
          <router-link to="/">首页</router-link> / <b>{{ page?.title || '页面' }}</b>
        </div>
      </div>
    </div>

    <section class="page-section">
      <div class="container">
        <div v-if="loading" class="skeleton" style="height: 300px" />

        <template v-else-if="page">
          <header v-reveal class="page-head">
            <h1>{{ page.title }}</h1>
            <p v-if="page.subtitle" class="subtitle">{{ page.subtitle }}</p>
            <div class="updated">更新时间：{{ formatDay(page.updated_at) }}</div>
          </header>

          <!-- 内容由后台「官网管理 → 单页管理」维护 -->
          <div class="rich-text" v-html="page.content" />

          <!-- 联系方式页附加信息卡 -->
          <div v-if="page.slug === 'contact'" class="contact-cards">
            <div class="card">
              <h3>学校地址</h3>
              <p>{{ setting('address') }}</p>
              <p class="muted">邮编 {{ setting('postcode') }}</p>
            </div>
            <div class="card">
              <h3>总机电话</h3>
              <p class="mono">{{ setting('phone') }}</p>
              <p class="muted">招生咨询 {{ setting('admission_phone') }}</p>
            </div>
            <div class="card">
              <h3>电子邮箱</h3>
              <p>{{ setting('email') }}</p>
              <p class="muted">工作时间 8:30 - 17:00</p>
            </div>
          </div>

          <!-- 招生页附加数据卡 -->
          <div v-if="page.slug === 'admissions'" class="admission-stats">
            <div v-for="item in admissionStats" :key="item.label" class="stat">
              <b>{{ item.value }}</b>
              <span>{{ item.label }}</span>
            </div>
          </div>
        </template>

        <div v-else class="empty">
          页面不存在或已下线
          <div style="margin-top: 16px">
            <router-link to="/" class="btn">返回首页</router-link>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { publicApi, type PageDetail } from '@/api';
import { formatDay, loadSite, setting, siteState, useSeo } from '@/store/site';

const route = useRoute();
const page = ref<PageDetail | null>(null);
const loading = ref(true);

const admissionStats = computed(() => {
  const stats = siteState.info?.stats;
  return [
    { label: '本科专业', value: `${stats?.majors ?? 0} 个` },
    { label: '招生省份', value: '31 个' },
    { label: '在校学生', value: `${stats?.students ?? 0} 人` },
    { label: '专任教师', value: `${stats?.teachers ?? 0} 人` },
  ];
});

async function load() {
  loading.value = true;
  page.value = null;
  try {
    const slug = String(route.params.slug);
    page.value = await publicApi.page(slug);
    useSeo(page.value.title, page.value.content?.replace(/<[^>]+>/g, '').slice(0, 140));
  } catch {
    page.value = null;
    useSeo('页面不存在');
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await loadSite();
  await load();
  window.scrollTo({ top: 0 });
});

watch(
  () => route.params.slug,
  () => {
    if (route.name === 'page') {
      load();
      window.scrollTo({ top: 0 });
    }
  },
);
</script>

<style scoped lang="scss">
.page-head {
  max-width: 880px;
  margin: 0 auto 30px;
  padding-bottom: 26px;
  border-bottom: 1px solid var(--line);
  text-align: center;

  h1 {
    font-size: 34px;
    letter-spacing: -0.025em;
    background: var(--grad-text);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .subtitle {
    margin: 10px 0 0;
    font-size: 15px;
    color: var(--text-3);
  }
  .updated {
    margin-top: 12px;
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.08em;
    color: var(--text-4);
  }
}

.rich-text {
  max-width: 880px;
  margin: 0 auto;
}

.contact-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  max-width: 1000px;
  margin: 40px auto 0;

  .card {
    padding: 24px;
    background: var(--bg-1);
    border: 1px solid var(--line);
    border-radius: var(--radius);

    &:hover {
      transform: none;
      border-color: rgba(31, 95, 224, 0.26);
    }
    h3 {
      font-family: var(--mono);
      font-size: 11.5px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--c-cyan);
      margin-bottom: 12px;
    }
    p {
      margin: 0;
      font-size: 15px;
      color: var(--text-1);
    }
    .muted {
      margin-top: 6px;
      font-size: 12.5px;
      color: var(--text-4);
    }
  }
}

.admission-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  max-width: 1000px;
  margin: 40px auto 0;
  padding: 28px;
  border-radius: var(--radius-lg);
  border: 1px solid rgba(31, 95, 224, 0.2);
  background: linear-gradient(130deg, rgba(77, 141, 255, 0.14), rgba(139, 92, 246, 0.09) 60%, #fff);

  .stat {
    text-align: center;

    b {
      display: block;
      font-family: var(--mono);
      font-size: 26px;
      letter-spacing: -0.02em;
      background: var(--grad-primary);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    span {
      font-size: 11.5px;
      letter-spacing: 0.06em;
      color: var(--text-3);
    }
  }
}

@media (max-width: 900px) {
  .contact-cards,
  .admission-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .page-head h1 {
    font-size: 26px;
  }
}
@media (max-width: 560px) {
  .contact-cards,
  .admission-stats {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
