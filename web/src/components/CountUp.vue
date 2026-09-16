<template>{{ formatNumber(display) }}</template>

<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue';
import { formatNumber } from '@/utils/format';

/**
 * 数字滚动：数值变化时平滑过渡到新值，避免仪表盘数字突变。
 * 使用 requestAnimationFrame + 缓出曲线，完成后精确落在目标值上。
 */
const props = withDefaults(defineProps<{ value: number; duration?: number }>(), { duration: 720 });

const display = ref(0);
let frame = 0;
let snapTimer = 0;

function run(target: number) {
  cancelAnimationFrame(frame);
  window.clearTimeout(snapTimer);
  const from = display.value;
  if (from === target) return;

  // 兜底：动画帧被推迟时（后台标签页、部分嵌入式浏览器）直接落位到目标值
  snapTimer = window.setTimeout(() => {
    display.value = target;
  }, props.duration + 400);

  const startedAt = performance.now();
  const step = (now: number) => {
    const progress = Math.min(1, (now - startedAt) / props.duration);
    const eased = 1 - (1 - progress) ** 3;
    display.value = Math.round(from + (target - from) * eased);
    if (progress < 1) {
      frame = requestAnimationFrame(step);
    } else {
      display.value = target;
      window.clearTimeout(snapTimer);
    }
  };
  frame = requestAnimationFrame(step);
}

watch(() => props.value, run, { immediate: true });
onUnmounted(() => {
  cancelAnimationFrame(frame);
  window.clearTimeout(snapTimer);
});
</script>
