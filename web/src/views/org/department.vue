<template>
  <div class="page">
    <div class="page-head">
      <div>
        <div class="page-title">院系管理 <small class="t4" style="font-size: 12px; font-weight: 400">departments</small></div>
        <div class="page-desc">学校一级教学单位，专业与教师均挂靠在院系之下，共 {{ total }} 个院系</div>
      </div>
      <div class="page-actions">
        <el-button type="primary" :icon="Plus" @click="openCreate">新增院系</el-button>
      </div>
    </div>

    <PanelCard>
      <div class="toolbar">
        <el-input
          v-model="query.keyword"
          placeholder="搜索院系代码 / 名称 / 院长"
          :prefix-icon="Search"
          clearable
          style="width: 260px"
          @keydown.enter="handleSearch"
        />
        <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
        <el-button :icon="RefreshLeft" @click="handleReset">重置</el-button>
      </div>

      <el-table v-loading="loading" :data="list" style="width: 100%">
        <el-table-column prop="code" label="院系代码" width="110" fixed>
          <template #default="{ row }"><span class="mono">{{ row.code }}</span></template>
        </el-table-column>
        <el-table-column prop="name" label="院系名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="dean" label="院长" width="100">
          <template #default="{ row }">{{ row.dean || '—' }}</template>
        </el-table-column>
        <el-table-column prop="office" label="办公地点" width="160">
          <template #default="{ row }">{{ row.office || '—' }}</template>
        </el-table-column>
        <el-table-column prop="phone" label="联系电话" width="130">
          <template #default="{ row }"><span class="mono">{{ row.phone || '—' }}</span></template>
        </el-table-column>
        <el-table-column prop="major_count" label="专业数" width="86" align="center" />
        <el-table-column prop="teacher_count" label="教师数" width="86" align="center" />
        <el-table-column prop="student_count" label="学生数" width="86" align="center">
          <template #default="{ row }"><b>{{ row.student_count }}</b></template>
        </el-table-column>
        <el-table-column prop="sort_order" label="排序" width="70" align="center" />
        <el-table-column label="操作" width="130" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty><el-empty description="暂无院系数据" :image-size="90" /></template>
      </el-table>

      <el-pagination
        v-model:current-page="query.page"
        v-model:page-size="query.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @current-change="load"
        @size-change="handleSearch"
      />
    </PanelCard>

    <el-dialog
      v-model="formVisible"
      :title="editingId ? '编辑院系' : '新增院系'"
      width="640px"
      :close-on-click-modal="false"
    >
      <div class="field-grid">
        <div class="field">
          <div class="field-label">院系代码 <span class="en">code</span><span class="req">*</span></div>
          <el-input v-model="form.code" placeholder="例如 07" maxlength="20" />
        </div>
        <div class="field">
          <div class="field-label">院系名称 <span class="en">name</span><span class="req">*</span></div>
          <el-input v-model="form.name" placeholder="例如 化学与材料学院" maxlength="50" />
        </div>
        <div class="field">
          <div class="field-label">院长 <span class="en">dean</span></div>
          <el-input v-model="form.dean" placeholder="负责人姓名" maxlength="30" />
        </div>
        <div class="field">
          <div class="field-label">联系电话 <span class="en">phone</span></div>
          <el-input v-model="form.phone" placeholder="例如 010-62785007" maxlength="20" />
        </div>
        <div class="field">
          <div class="field-label">办公地点 <span class="en">office</span></div>
          <el-input v-model="form.office" placeholder="例如 化学楼 3 层" maxlength="60" />
        </div>
        <div class="field">
          <div class="field-label">排序 <span class="en">sort</span></div>
          <el-input-number v-model="form.sortOrder" :min="0" :max="999" style="width: 100%" />
        </div>
      </div>

      <div class="field">
        <div class="field-label">院系简介 <span class="en">description</span></div>
        <el-input v-model="form.description" type="textarea" :rows="3" maxlength="255" show-word-limit />
      </div>

      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>

    <div style="height: 16px" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, RefreshLeft, Search } from '@element-plus/icons-vue';
import { departmentApi } from '@/api';
import PanelCard from '@/components/PanelCard.vue';
import type { Department } from '@/types';

const loading = ref(false);
const saving = ref(false);
const list = ref<Department[]>([]);
const total = ref(0);
const formVisible = ref(false);
const editingId = ref<number | null>(null);

const query = reactive({ page: 1, pageSize: 10, keyword: '' });

function emptyForm() {
  return {
    code: '',
    name: '',
    dean: '',
    phone: '',
    office: '',
    description: '',
    sortOrder: 0,
  };
}

const form = reactive(emptyForm());

async function load() {
  loading.value = true;
  try {
    const result = await departmentApi.list({ ...query, sortBy: 'sortOrder', order: 'ASC' });
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
  handleSearch();
}

function openCreate() {
  editingId.value = null;
  Object.assign(form, emptyForm());
  formVisible.value = true;
}

function openEdit(row: Department) {
  editingId.value = row.id;
  Object.assign(form, {
    code: row.code,
    name: row.name,
    dean: row.dean ?? '',
    phone: row.phone ?? '',
    office: row.office ?? '',
    description: row.description ?? '',
    sortOrder: row.sort_order,
  });
  formVisible.value = true;
}

async function handleSubmit() {
  if (!form.code.trim() || !form.name.trim()) {
    ElMessage.warning('请填写院系代码与名称');
    return;
  }
  const payload = {
    code: form.code.trim(),
    name: form.name.trim(),
    dean: form.dean || null,
    phone: form.phone || null,
    office: form.office || null,
    description: form.description || null,
    sortOrder: form.sortOrder,
  };

  saving.value = true;
  try {
    if (editingId.value) {
      await departmentApi.update(editingId.value, payload);
      ElMessage.success('院系已保存');
    } else {
      await departmentApi.create(payload);
      ElMessage.success('院系已创建');
    }
    formVisible.value = false;
    load();
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row: Department) {
  try {
    await ElMessageBox.confirm(`确认删除院系「${row.name}」？`, '删除院系', {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch {
    return;
  }
  await departmentApi.remove(row.id);
  ElMessage.success('院系已删除');
  load();
}

onMounted(load);
</script>
