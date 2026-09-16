<template>
  <div>
    <div class="crumb-bar">
      <div class="container">
        <div class="page-title">{{ currentTitle }}</div>
        <div class="crumb">
          <router-link to="/">首页</router-link> / <b>{{ currentTitle }}</b>
        </div>
      </div>
    </div>

    <section class="page-section">
      <div class="container">
        <div class="tabs">
          <button :class="{ on: !category }" @click="switchCategory('')">全部</button>
          <button
            v-for="item in categories"
            :key="item"
            :class="{ on: category === item }"
            @click="switchCategory(item)"
          >
            {{ item }}
          </button>
        </div>

        <div v-if="loading" class="list">
          <div v-for="i in 6" :key="i" class="skeleton" style="height: 78px; margin-bottom: 12px" />
        </div>

        <template v-else>
          <div v-if="list.length" class="list">
            <router-link
              v-for="(article, index) in list"
              :key="article.id"
              v-reveal="`${Math.min(index, 6) * 45}ms`"
              class="row card"
              :to="`/news/${article.id}`"
            >
              <div class="date">
                <b>{{ toDateParts(article.published_at).date.replace('日', '') }}</b>
                <span>{{ toDateParts(article.published_at).year }}.{{ toDateParts(article.published_at).month.replace('月', '') }}</span>
              </div>
              <div class="body">
                <div class="title-line">
                  <span v-if="article.is_top" class="top-tag">置顶</span>
                  <h3>{{ article.title }}</h3>
                </div>
                <p>{{ article.summary }}</p>
                <div class="meta">
                  <span class="cat">{{ article.category }}</span>
                  <span>{{ article.source || '启明大学' }}</span>
                  <span v-if="article.view_count">阅读 {{ article.view_count }}</span>
                </div>
              </div>
            </router-link>
          </div>
          <div v-else class="empty">该分类下暂无内容</div>

          <Pager v-reveal :page="page" :page-size="pageSize" :total="total" @change="handlePage" />
        </template>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { publicApi, type ArticleBrief } from '@/api';
import Pager from '@/components/Pager.vue';
import { loadSite, siteState, toDateParts, useSeo } from '@/store/site';

const route = useRoute();
const router = useRouter();

const list = ref<ArticleBrief[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = 10;
const category = ref('');
const loading = ref(true);

const categories = computed(() => siteState.info?.categories ?? []);
const currentTitle = computed(() => category.value || '新闻公告');

async function load() {
  loading.value = true;
  try {
    const result = await publicApi.articles({
      page: page.value,
      pageSize,
      category: category.value || undefined,
    });
    list.value = result.list;
    total.value = result.total;
  } finally {
    loading.value = false;
  }
  useSeo(currentTitle.value, `${currentTitle.value} - 启明大学官方网站`);
}

function switchCategory(value: string) {
  category.value = value;
  page.value = 1;
  router.replace({ path: '/news', query: value ? { category: value } : {} });
}

function handlePage(target: number) {
  page.value = target;
  load();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

watch(
  () => route.query.category,
  (value) => {
    const next = typeof value === 'string' ? value : '';
    if (next !== category.value) {
      category.value = next;
      page.value = 1;
      load();
    }
  },
);

onMounted(async () => {
  await loadSite();
  category.value = typeof route.query.category === 'string' ? route.query.category : '';
  await load();
});
</script>

<style scoped lang="scss">
.tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 26px;

  button {
    height: 38px;
    padding: 0 18px;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: var(--bg-1);
    color: var(--text-2);
    font-size: 13.5px;
    cursor: pointer;
    transition: all 0.24s var(--ease);

    &:hover {
      border-color: rgba(31, 95, 224, 0.4);
      color: var(--text-1);
      background: rgba(31, 95, 224, 0.06);
    }
    &.on {
      background: var(--grad-primary);
      border-color: transparent;
      color: #fff;
      font-weight: 600;
      box-shadow: 0 8px 20px rgba(31, 95, 224, 0.26);
    }
  }
}

.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.row {
  display: flex;
  gap: 22px;
  padding: 22px 24px;

  .date {
    flex: 0 0 80px;
    text-align: center;
    padding-right: 22px;
    border-right: 1px solid var(--line);

    b {
      display: block;
      font-size: 30px;
      line-height: 1.15;
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
  .body {
    min-width: 0;
  }
  .title-line {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
  }
  .top-tag {
    flex: 0 0 auto;
    font-family: var(--mono);
    font-size: 10.5px;
    letter-spacing: 0.08em;
    color: #fff;
    background: var(--grad-primary);
    padding: 2px 8px;
    border-radius: 5px;
  }
  h3 {
    font-size: 17px;
    color: var(--text-1);
    transition: color 0.24s var(--ease);
  }
  &:hover h3 {
    color: #fff;
  }
  p {
    margin: 0 0 10px;
    font-size: 13.5px;
    color: var(--text-3);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .meta {
    display: flex;
    align-items: center;
    gap: 16px;
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.08em;
    color: var(--text-4);

    .cat {
      color: var(--c-cyan);
      background: rgba(31, 95, 224, 0.08);
      border: 1px solid rgba(31, 95, 224, 0.26);
      padding: 1px 9px;
      border-radius: 999px;
    }
  }
}

@media (max-width: 640px) {
  .row {
    padding: 18px;
  }
  .row .date {
    display: none;
  }
}
</style>
