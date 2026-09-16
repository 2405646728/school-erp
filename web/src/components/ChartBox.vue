<template>
  <div ref="domRef" class="chart-box" :style="{ height }" />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as echarts from 'echarts';

const props = withDefaults(defineProps<{ option: echarts.EChartsOption; height?: string }>(), {
  height: '260px',
});

const domRef = ref<HTMLDivElement>();
let chart: echarts.ECharts | null = null;
let observer: ResizeObserver | null = null;

function render() {
  if (!chart || !props.option) return;
  chart.setOption(props.option, true);
}

onMounted(() => {
  if (!domRef.value) return;
  chart = echarts.init(domRef.value);
  render();
  observer = new ResizeObserver(() => chart?.resize());
  observer.observe(domRef.value);
});

watch(() => props.option, render, { deep: true });

onBeforeUnmount(() => {
  observer?.disconnect();
  chart?.dispose();
  chart = null;
});
</script>

<style scoped>
.chart-box {
  width: 100%;
}
</style>
