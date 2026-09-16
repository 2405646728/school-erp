<template>
  <div>
    <div class="crumb-bar">
      <div class="container">
        <div class="page-title">站内搜索</div>
        <div class="crumb">
          <router-link to="/">首页</router-link> / <b>搜索结果</b>
        </div>
      </div>
    </div>

    <section class="page-section">
      <div class="container">
        <div class="searchbar">
          <input v-model="keyword" placeholder="输入关键字搜索新闻、专业、页面" @keydown.enter="doSearch" />
          <button class="btn" @click="doSearch">搜索</button>
        </div>

        <div v-if="!keyword" class="empty">请输入关键字开始搜索</div>
        <div v-else-if="loading" class="skeleton" style="height: 220px" />
        <template v-else>
          <div class="count">
            关键字「<b>{{ keyword }}</b>」共找到
            {{ result.articles.length + result.majors.length + result.pages.length }} 条结果
          </div>

          <section v-if="result.articles.length" v-reveal class="block">
            <h2>新闻与公告 <small>{{ result.articles.length }}</small></h2>
            <router-link v-for="item in result.articles" :key="item.id" :to="`/news/${item.id}`" class="row card">
              <div class="title">{{ item.title }}</div>
              <div class="summary">{{ item.summary }}</div>
              <div class="meta">{{ item.category }} · {{ formatDay(item.published_at) }}</div>
            </router-link>
          </section>

          <section v-if="result.majors.length" class="block">
            <h2>专业 <small>{{ result.majors.length }}</small></h2>
            <div class="chips">
              <router-link v-for="item in result.majors" :key="item.id" to="/departments" class="chip">
                {{ item.name }}
                <span>{{ item.department_name }}</span>
              </router-link>
            </div>
          </section>

          <section v-if="result.pages.length" class="block">
            <h2>页面 <small>{{ result.pages.length }}</small></h2>
            <router-link v-for="item in result.pages" :key="item.slug" :to="`/page/${item.slug}`" class="row card">
              <div class="title">{{ item.title }}</div>
              <div class="summary">{{ item.subtitle }}</div>
            </router-link>
          </section>

          <div
            v-if="!result.articles.length && !result.majors.length && !result.pages.length"
            class="empty"
          >
            没有找到与「{{ keyword }}」相关的内容，试试其他关键字
          </div>
        </template>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { publicApi, type SearchResult } from '@/api';
import { formatDay, loadSite, useSeo } from '@/store/site';

const route = useRoute();
const router = useRouter();

const keyword = ref('');
const loading = ref(false);
const result = ref<SearchResult>({ articles: [], majors: [], pages: [] });

async function search() {
  const value = keyword.value.trim();
  if (!value) {
    result.value = { articles: [], majors: [], pages: [] };
    return;
  }
  loading.value = true;
  try {
    result.value = await publicApi.search(value);
    useSeo(`搜索：${value}`);
  } finally {
    loading.value = false;
  }
}

function doSearch() {
  const value = keyword.value.trim();
  router.replace({ path: '/search', query: value ? { keyword: value } : {} });
  search();
}

onMounted(async () => {
  await loadSite();
  keyword.value = typeof route.query.keyword === 'string' ? route.query.keyword : '';
  await search();
});

watch(
  () => route.query.keyword,
  (value) => {
    const next = typeof value === 'string' ? value : '';
    if (next !== keyword.value) {
      keyword.value = next;
      search();
    }
  },
);
</script>

<style scoped lang="scss">
.searchbar {
  display: flex;
  gap: 12px;
  max-width: 640px;
  margin-bottom: 34px;

  input {
    flex: 1;
    height: 46px;
    padding: 0 20px;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: var(--bg-1);
    outline: none;
    font-size: 14.5px;
    color: var(--text-1);

    &::placeholder {
      color: var(--text-4);
    }
    &:focus {
      border-color: rgba(31, 95, 224, 0.4);
      box-shadow: 0 0 0 4px rgba(77, 141, 255, 0.1);
    }
  }
  .btn {
    height: 46px;
  }
}

.count {
  margin-bottom: 26px;
  font-family: var(--mono);
  font-size: 12.5px;
  letter-spacing: 0.06em;
  color: var(--text-4);

  b {
    color: var(--c-cyan);
  }
}

.block {
  margin-bottom: 40px;

  h2 {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 18px;
    margin-bottom: 16px;
    padding-left: 14px;
    border-left: 3px solid transparent;
    border-image: var(--grad-primary) 1;
    border-image-slice: 1;

    small {
      font-family: var(--mono);
      font-size: 11px;
      font-weight: 400;
      letter-spacing: 0.1em;
      color: var(--text-4);
    }
  }
}

.row {
  display: block;
  padding: 18px 22px;
  margin-bottom: 10px;

  .title {
    font-size: 15.5px;
    font-weight: 600;
    color: var(--text-1);
    margin-bottom: 6px;
  }
  &:hover .title {
    color: #fff;
  }
  .summary {
    font-size: 13.5px;
    color: var(--text-3);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .meta {
    margin-top: 8px;
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.06em;
    color: var(--text-4);
  }
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.chip {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: #fff;
  font-size: 14px;
  color: var(--text-2);
  transition: all 0.24s var(--ease);

  span {
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.04em;
    color: var(--text-4);
  }
  &:hover {
    border-color: rgba(31, 95, 224, 0.36);
    color: #fff;
    background: rgba(31, 95, 224, 0.06);
  }
}
</style>
