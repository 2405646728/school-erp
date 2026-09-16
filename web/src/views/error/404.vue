<template>
  <div class="not-found">
    <div class="code">404</div>
    <div class="title">页面不存在</div>
    <div class="desc t3">你访问的地址可能已被移除、重命名，或暂时不可用。</div>
    <div class="actions">
      <el-button type="primary" @click="goHome">返回首页</el-button>
      <el-button @click="router.back()">返回上一页</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { homePathFor } from '@/router';
import { useUserStore } from '@/stores/user';

const router = useRouter();
const userStore = useUserStore();

function goHome() {
  router.replace(userStore.isLogin ? homePathFor(userStore.role) : '/login');
}
</script>

<style scoped lang="scss">
.not-found {
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: var(--c-page-bg);

  .code {
    font-size: 72px;
    font-weight: 700;
    color: var(--c-primary);
    line-height: 1;
  }
  .title {
    font-size: 20px;
    font-weight: 600;
  }
  .desc {
    font-size: 13px;
  }
  .actions {
    margin-top: 14px;
    display: flex;
    gap: 10px;
  }
}
</style>
