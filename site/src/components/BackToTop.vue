<template>
  <button
    class="back-to-top"
    :class="{ show: visible }"
    :aria-hidden="!visible"
    aria-label="回到顶部"
    @click="scrollToTop"
  >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 19V6M6 12l6-6 6 6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    <span>顶部</span>
  </button>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

const visible = ref(false);

function onScroll() {
  visible.value = window.scrollY > 420;
}

function scrollToTop() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
});
onUnmounted(() => window.removeEventListener('scroll', onScroll));
</script>

<style scoped lang="scss">
.back-to-top {
  position: fixed;
  right: 26px;
  bottom: 34px;
  z-index: 40;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  width: 52px;
  height: 52px;
  border: 1px solid var(--line);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: var(--blur);
  -webkit-backdrop-filter: var(--blur);
  color: var(--text-1);
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  cursor: pointer;
  box-shadow: 0 12px 30px rgba(15, 42, 92, 0.16);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translateY(12px);
  transition: opacity 0.24s var(--ease), transform 0.24s var(--ease), visibility 0.24s var(--ease),
    border-color 0.24s var(--ease), box-shadow 0.24s var(--ease), color 0.24s var(--ease);

  &.show {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    transform: none;
  }
  &.show:hover {
    color: var(--c-blue);
    border-color: var(--c-blue);
    transform: translateY(-3px);
    box-shadow: 0 16px 36px rgba(31, 95, 224, 0.22);
  }
}

@media (max-width: 768px) {
  .back-to-top {
    right: 14px;
    bottom: 18px;
    width: 44px;
    height: 44px;
    font-size: 0;
  }
}
</style>
