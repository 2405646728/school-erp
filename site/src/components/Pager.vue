<template>
  <nav class="pager">
    <button :disabled="page <= 1" @click="go(page - 1)">上一页</button>
    <button
      v-for="item in pages"
      :key="item.key"
      :class="{ on: item.value === page }"
      :disabled="item.value === null"
      @click="item.value && go(item.value)"
    >
      {{ item.label }}
    </button>
    <button :disabled="page >= totalPages" @click="go(page + 1)">下一页</button>
    <span class="total">共 {{ total }} 条 / {{ totalPages }} 页</span>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ page: number; pageSize: number; total: number }>();
const emit = defineEmits<{ change: [number] }>();

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)));

/** 页码按钮：当前页前后各两页，超出用省略号 */
const pages = computed(() => {
  const last = totalPages.value;
  const current = props.page;
  const list: { key: string; label: string; value: number | null }[] = [];
  const push = (value: number) => list.push({ key: `p${value}`, label: String(value), value });

  if (last <= 7) {
    for (let i = 1; i <= last; i += 1) push(i);
    return list;
  }

  push(1);
  if (current > 4) list.push({ key: 'gap-start', label: '…', value: null });
  const start = Math.max(2, current - 1);
  const end = Math.min(last - 1, current + 1);
  for (let i = start; i <= end; i += 1) push(i);
  if (current < last - 3) list.push({ key: 'gap-end', label: '…', value: null });
  push(last);
  return list;
});

function go(target: number) {
  if (target < 1 || target > totalPages.value || target === props.page) return;
  emit('change', target);
}
</script>
