<template>
  <section class="not-found page-section">
    <div class="container">
      <div class="code">404</div>
      <h1>页面不存在</h1>
      <p>你访问的地址可能已被移除、重命名，或暂时不可用。</p>
      <div class="actions">
        <router-link to="/" class="btn">返回首页</router-link>
        <router-link to="/news" class="btn ghost">浏览新闻公告</router-link>
      </div>
      <div class="links">
        <span>常用入口：</span>
        <router-link to="/departments">院系专业</router-link>
        <router-link to="/teachers">师资队伍</router-link>
        <router-link to="/page/admissions">招生信息</router-link>
        <router-link to="/page/contact">联系我们</router-link>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useSeo } from '@/store/site';

onMounted(() => useSeo('页面不存在'));
</script>

<style scoped lang="scss">
.not-found {
  position: relative;
  text-align: center;
  padding: 110px 0 130px;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -160px;
    left: 50%;
    transform: translateX(-50%);
    width: 620px;
    height: 420px;
    background: radial-gradient(circle, rgba(31, 95, 224, 0.18), transparent 65%);
    filter: blur(40px);
    pointer-events: none;
  }

  .code {
    position: relative;
    font-family: var(--mono);
    font-size: 104px;
    font-weight: 700;
    line-height: 1;
    letter-spacing: 0.04em;
    background: var(--grad-primary);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  h1 {
    position: relative;
    margin: 20px 0 12px;
    font-size: 26px;
    letter-spacing: -0.02em;
  }
  p {
    position: relative;
    color: var(--text-3);
    font-size: 14.5px;
  }
  .actions {
    position: relative;
    display: flex;
    justify-content: center;
    gap: 12px;
    margin-top: 30px;
  }
  .links {
    position: relative;
    margin-top: 40px;
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 16px;
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: 0.06em;
    color: var(--text-4);

    a {
      color: var(--text-3);
      padding-bottom: 2px;
      border-bottom: 1px solid transparent;
    }
    a:hover {
      color: var(--c-cyan);
      border-bottom-color: rgba(31, 95, 224, 0.45);
    }
  }
}

@media (max-width: 600px) {
  .not-found {
    padding: 70px 0 90px;
  }
  .not-found .code {
    font-size: 72px;
  }
  .not-found h1 {
    font-size: 20px;
  }
}
</style>
