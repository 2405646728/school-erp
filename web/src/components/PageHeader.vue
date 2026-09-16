<template>
  <div class="page">
    <div class="page-head">
      <div>
        <div class="page-title">
          {{ title }}
          <small v-if="en" class="t4" style="font-size: 12px; font-weight: 400; margin-left: 6px">{{ en }}</small>
        </div>
        <div v-if="description" class="page-desc">{{ description }}</div>
      </div>
      <div class="page-actions">
        <slot name="actions" />
      </div>
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  en?: string;
  description?: string;
}>();
</script>

<style scoped lang="scss">
.page-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
</style>
