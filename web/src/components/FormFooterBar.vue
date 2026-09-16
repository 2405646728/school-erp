<template>
  <!-- 参考稿底部固定条：左侧状态提示，右侧「放弃修改 / 保存」 -->
  <div class="footer-bar">
    <div class="footer-status">
      <span class="dot" :class="{ dirty }" />
      <span>{{ dirty ? '有未保存的修改' : latestText }}</span>
    </div>
    <div class="footer-actions">
      <slot name="actions-left" />
      <el-button :disabled="!dirty || loading" @click="emit('reset')">放弃修改</el-button>
      <el-button type="primary" :loading="loading" :disabled="!dirty" @click="emit('save')">
        保存
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    dirty?: boolean;
    loading?: boolean;
    latestText?: string;
  }>(),
  { dirty: false, loading: false, latestText: '已是最新' },
);

const emit = defineEmits<{ save: []; reset: [] }>();
</script>
