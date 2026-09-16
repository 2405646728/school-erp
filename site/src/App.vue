<template>
  <div class="site">
    <SiteHeader />
    <main class="site-main">
      <!-- 页面入场动画由 CSS keyframes 完成，避免过渡阻塞页面切换 -->
      <router-view v-slot="{ Component }">
        <component :is="Component" />
      </router-view>
    </main>
    <SiteFooter />
    <BackToTop />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import BackToTop from '@/components/BackToTop.vue';
import SiteFooter from '@/components/SiteFooter.vue';
import SiteHeader from '@/components/SiteHeader.vue';
import { loadSite } from '@/store/site';

onMounted(() => {
  loadSite();
});
</script>

<style scoped>
.site {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
.site-main {
  flex: 1;
}
</style>
