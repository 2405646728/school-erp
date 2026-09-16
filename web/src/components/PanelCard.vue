<template>
  <section class="panel">
    <header v-if="title || $slots.extra" class="panel-head">
      <div>
        <div class="panel-title">
          <span>{{ title }}</span>
          <small v-if="en">{{ en }}</small>
          <slot name="title-suffix" />
        </div>
        <div v-if="subtitle" class="panel-sub">{{ subtitle }}</div>
      </div>
      <div class="panel-extra">
        <slot name="extra" />
      </div>
    </header>
    <slot />
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title?: string;
  /** 参考稿风格：标题右侧的英文小字 */
  en?: string;
  subtitle?: string;
}>();
</script>

<style scoped lang="scss">
.panel-extra {
  display: flex;
  align-items: center;
  gap: 10px;
}
</style>
