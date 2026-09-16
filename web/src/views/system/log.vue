<template>
  <div class="page">
    <div class="page-head">
      <div>
        <div class="page-title">操作日志 <small class="t4" style="font-size: 12px; font-weight: 400">operation logs</small></div>
        <div class="page-desc">系统内所有写操作的审计记录，共 {{ total }} 条</div>
      </div>
      <div class="page-actions">
        <el-button :icon="Delete" @click="handleClean">清理 30 天前日志</el-button>
        <el-button :icon="RefreshLeft" @click="load">刷新</el-button>
      </div>
    </div>

    <PanelCard>
      <div class="toolbar">
        <el-input
          v-model="query.keyword"
          placeholder="搜索操作人 / 描述 / 接口路径"
          :prefix-icon="Search"
          clearable
          style="width: 280px"
          @keydown.enter="handleSearch"
        />
        <el-select v-model="query.module" placeholder="业务模块" clearable style="width: 160px" @change="handleSearch">
          <el-option v-for="item in filters.modules" :key="item" :label="item" :value="item" />
        </el-select>
        <el-select v-model="query.action" placeholder="操作类型" clearable style="width: 140px" @change="handleSearch">
          <el-option v-for="item in filters.actions" :key="item" :label="item" :value="item" />
        </el-select>
        <el-select v-model="query.success" placeholder="执行结果" clearable style="width: 130px" @change="handleSearch">
          <el-option label="成功" value="1" />
          <el-option label="失败" value="0" />
        </el-select>
        <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
        <el-button :icon="RefreshLeft" @click="handleReset">重置</el-button>
      </div>

      <el-table v-loading="loading" :data="list" style="width: 100%">
        <el-table-column prop="created_at" label="操作时间" width="170" fixed>
          <template #default="{ row }"><span class="mono">{{ row.created_at }}</span></template>
        </el-table-column>
        <el-table-column prop="username" label="操作人" width="110" />
        <el-table-column prop="module" label="模块" width="110" />
        <el-table-column prop="action" label="操作" width="90" align="center">
          <template #default="{ row }">
            <el-tag size="small" effect="plain" :type="actionTag(row.action)">{{ row.action }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="detail" label="操作描述" min-width="240" show-overflow-tooltip>
          <template #default="{ row }">{{ row.detail || '—' }}</template>
        </el-table-column>
        <el-table-column prop="path" label="接口路径" min-width="230" show-overflow-tooltip>
          <template #default="{ row }"><span class="mono t3">{{ row.path }}</span></template>
        </el-table-column>
        <el-table-column prop="ip" label="来源 IP" width="140">
          <template #default="{ row }"><span class="mono">{{ row.ip || '—' }}</span></template>
        </el-table-column>
        <el-table-column prop="cost_ms" label="耗时" width="90" align="center">
          <template #default="{ row }">{{ row.cost_ms }} ms</template>
        </el-table-column>
        <el-table-column label="结果" width="86" align="center">
          <template #default="{ row }">
            <el-tag :type="row.success ? 'success' : 'danger'" size="small" effect="light">
              {{ row.success ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <template #empty><el-empty description="暂无操作日志" :image-size="90" /></template>
      </el-table>

      <el-pagination
        v-model:current-page="query.page"
        v-model:page-size="query.pageSize"
        :total="total"
        :page-sizes="[15, 30, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @current-change="load"
        @size-change="handleSearch"
      />
    </PanelCard>

    <div style="height: 16px" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Delete, RefreshLeft, Search } from '@element-plus/icons-vue';
import { logApi } from '@/api';
import PanelCard from '@/components/PanelCard.vue';
import type { LogRow } from '@/types';

const loading = ref(false);
const list = ref<LogRow[]>([]);
const total = ref(0);
const filters = ref<{ modules: string[]; actions: string[] }>({ modules: [], actions: [] });

const query = reactive({
  page: 1,
  pageSize: 15,
  keyword: '',
  module: undefined as string | undefined,
  action: undefined as string | undefined,
  success: undefined as string | undefined,
});

function actionTag(action: string | null) {
  if (action === '删除') return 'danger';
  if (action === '新增') return 'success';
  if (action === '修改') return 'warning';
  return 'info';
}

async function load() {
  loading.value = true;
  try {
    const result = await logApi.list({ ...query });
    list.value = result.list;
    total.value = result.total;
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  query.page = 1;
  load();
}

function handleReset() {
  query.keyword = '';
  query.module = undefined;
  query.action = undefined;
  query.success = undefined;
  handleSearch();
}

async function handleClean() {
  try {
    await ElMessageBox.confirm('确认清理 30 天前的历史操作日志？该操作不可恢复。', '清理日志', {
      confirmButtonText: '确认清理',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch {
    return;
  }
  const result = await logApi.clean(30);
  ElMessage.success(`已清理 ${result.deleted} 条历史日志`);
  await load();
  filters.value = await logApi.filters();
}

onMounted(async () => {
  filters.value = await logApi.filters();
  await load();
});
</script>
