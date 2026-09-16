<template>
  <div>
    <div class="crumb-bar">
      <div class="container">
        <div class="page-title">新闻详情</div>
        <div class="crumb">
          <router-link to="/">首页</router-link> / <router-link to="/news">新闻公告</router-link> /
          <b>{{ article?.category || '正文' }}</b>
        </div>
      </div>
    </div>

    <section class="page-section">
      <div class="container">
        <div v-if="loading" class="skeleton" style="height: 320px" />

        <template v-else-if="article">
          <article class="article">
            <h1>{{ article.title }}</h1>
            <div class="meta">
              <span class="cat">{{ article.category }}</span>
              <span>发布时间：{{ formatDateTime(article.published_at) }}</span>
              <span v-if="article.author">作者：{{ article.author }}</span>
              <span v-if="article.source">来源：{{ article.source }}</span>
              <span>阅读：{{ article.view_count }}</span>
            </div>

            <div v-if="article.summary" class="summary">{{ article.summary }}</div>

            <!-- 正文由后台管理员维护，服务端已做标签净化 -->
            <div class="rich-text" v-html="article.content" />

            <div v-if="article.tags" class="tags">
              <span v-for="tag in article.tags.split(',')" :key="tag">#{{ tag }}</span>
            </div>

            <div class="neighbors">
              <router-link v-if="article.prev" :to="`/news/${article.prev.id}`" class="neighbor">
                <span class="label">上一篇</span>
                <span class="text">{{ article.prev.title }}</span>
              </router-link>
              <span v-else class="neighbor disabled"><span class="label">上一篇</span><span class="text">已是第一篇</span></span>

              <router-link v-if="article.next" :to="`/news/${article.next.id}`" class="neighbor">
                <span class="label">下一篇</span>
                <span class="text">{{ article.next.title }}</span>
              </router-link>
              <span v-else class="neighbor disabled"><span class="label">下一篇</span><span class="text">已是最后一篇</span></span>
            </div>

            <div class="back">
              <router-link to="/news" class="btn">返回列表</router-link>
            </div>
          </article>

          <div v-if="related.length" class="related">
            <div class="section-head">
              <div class="titles">
                <h2>相关内容</h2>
                <div class="en">Related</div>
              </div>
            </div>
            <div class="related-list">
              <router-link v-for="item in related" :key="item.id" :to="`/news/${item.id}`" class="related-item">
                <span class="title">{{ item.title }}</span>
                <span class="day">{{ formatDay(item.published_at) }}</span>
              </router-link>
            </div>
          </div>
        </template>

        <div v-else class="empty">
          文章不存在或已下线
          <div style="margin-top: 16px">
            <router-link to="/news" class="btn">返回新闻列表</router-link>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { publicApi, type ArticleBrief, type ArticleDetail } from '@/api';
import { formatDateTime, formatDay, loadSite, useSeo } from '@/store/site';

const route = useRoute();
const article = ref<ArticleDetail | null>(null);
const related = ref<ArticleBrief[]>([]);
const loading = ref(true);

async function load() {
  loading.value = true;
  article.value = null;
  try {
    const id = Number(route.params.id);
    article.value = await publicApi.article(id);
    useSeo(article.value.title, article.value.summary || '');

    const result = await publicApi.articles({ category: article.value.category, pageSize: 6 });
    related.value = result.list.filter((item) => item.id !== id).slice(0, 5);
  } catch {
    article.value = null;
    useSeo('文章不存在');
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await loadSite();
  await load();
  window.scrollTo({ top: 0 });
});

watch(() => route.params.id, () => {
  if (route.name === 'news-detail') {
    load();
    window.scrollTo({ top: 0 });
  }
});
</script>

<style scoped lang="scss">
.article {
  max-width: 880px;
  margin: 0 auto;

  h1 {
    font-size: 34px;
    line-height: 1.35;
    letter-spacing: -0.025em;
    text-align: center;
    margin-bottom: 20px;
    background: var(--grad-text);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
}
.meta {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 16px;
  padding-bottom: 22px;
  border-bottom: 1px solid var(--line);
  font-family: var(--mono);
  font-size: 11.5px;
  letter-spacing: 0.06em;
  color: var(--text-4);

  .cat {
    color: var(--c-cyan);
    background: rgba(31, 95, 224, 0.08);
    border: 1px solid rgba(31, 95, 224, 0.28);
    padding: 3px 11px;
    border-radius: 999px;
  }
}
.summary {
  position: relative;
  margin: 26px 0;
  padding: 18px 22px;
  border-radius: var(--radius);
  border: 1px solid rgba(31, 95, 224, 0.2);
  background: linear-gradient(120deg, rgba(31, 95, 224, 0.08), rgba(6, 182, 212, 0.06));
  font-size: 15px;
  line-height: 1.9;
  color: var(--text-2);
}
.rich-text {
  margin-top: 26px;
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 32px;

  span {
    font-family: var(--mono);
    font-size: 11.5px;
    letter-spacing: 0.06em;
    color: var(--c-cyan);
    background: rgba(31, 95, 224, 0.07);
    border: 1px solid rgba(31, 95, 224, 0.24);
    padding: 4px 12px;
    border-radius: 999px;
  }
}

.neighbors {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 36px;

  .neighbor {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 16px 20px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--bg-1);
    font-size: 14px;
    transition: all 0.26s var(--ease);

    .label {
      font-family: var(--mono);
      font-size: 10.5px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--text-4);
    }
    .text {
      color: var(--text-2);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    &:hover:not(.disabled) {
      border-color: rgba(31, 95, 224, 0.36);
      background: rgba(31, 95, 224, 0.06);
      transform: translateY(-2px);
    }
    &:hover:not(.disabled) .text {
      color: #fff;
    }
    &.disabled .text {
      color: var(--text-4);
    }
  }
}

.back {
  margin-top: 32px;
  text-align: center;
}

.related {
  max-width: 880px;
  margin: 64px auto 0;
  padding-top: 40px;
  border-top: 1px solid var(--line);
}
.related-list {
  display: flex;
  flex-direction: column;
}
.related-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid var(--line);
  font-size: 14.5px;

  .title {
    color: var(--text-2);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: color 0.22s var(--ease);
  }
  &:hover .title {
    color: #fff;
  }
  .day {
    flex: 0 0 auto;
    font-family: var(--mono);
    font-size: 11.5px;
    color: var(--text-4);
  }
}

@media (max-width: 640px) {
  .article h1 {
    font-size: 24px;
  }
  .neighbors {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
