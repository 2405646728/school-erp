<template>
  <div class="page">
    <div class="page-head">
      <div>
        <div class="page-title">课程管理 <small class="t4" style="font-size: 12px; font-weight: 400">courses</small></div>
        <div class="page-desc">课程库维护，课程可被多个教学班引用，共 {{ total }} 门课程</div>
      </div>
      <div class="page-actions">
        <el-button type="primary" :icon="Plus" @click="openCreate">新增课程</el-button>
      </div>
    </div>

    <PanelCard>
      <div class="toolbar">
        <el-input
          v-model="query.keyword"
          placeholder="搜索课程代码 / 名称"
          :prefix-icon="Search"
          clearable
          style="width: 240px"
          @keydown.enter="handleSearch"
        />
        <el-select v-model="query.departmentId" placeholder="开课院系" clearable style="width: 190px" @change="handleSearch">
          <el-option v-for="item in departmentOptions" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
        <el-select v-model="query.courseType" placeholder="课程类型" clearable style="width: 140px" @change="handleSearch">
          <el-option v-for="item in COURSE_TYPES" :key="item" :label="item" :value="item" />
        </el-select>
        <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
        <el-button :icon="RefreshLeft" @click="handleReset">重置</el-button>
      </div>

      <el-table v-loading="loading" :data="list" style="width: 100%">
        <el-table-column prop="course_code" label="课程代码" width="120" fixed>
          <template #default="{ row }"><span class="mono">{{ row.course_code }}</span></template>
        </el-table-column>
        <el-table-column prop="name" label="课程名称" min-width="180" show-overflow-tooltip />
        <el-table-column prop="credit" label="学分" width="80" align="center" />
        <el-table-column prop="hours" label="学时" width="80" align="center" />
        <el-table-column label="类型" width="90" align="center">
          <template #default="{ row }">
            <el-tag size="small" effect="light" :type="row.course_type === '必修' ? 'primary' : row.course_type === '选修' ? 'warning' : 'info'">
              {{ row.course_type }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="department_name" label="开课院系" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ row.department_name || '公共课' }}</template>
        </el-table-column>
        <el-table-column prop="description" label="课程简介" min-width="220" show-overflow-tooltip />
        <el-table-column prop="offering_count" label="教学班" width="88" align="center" />
        <el-table-column label="操作" width="130" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="没有符合条件的课程" :image-size="90" />
        </template>
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
      :title="editingId ? '编辑课程' : '新增课程'"
      width="640px"
      :close-on-click-modal="false"
    >
      <div class="field-grid">
        <div class="field">
          <div class="field-label">课程代码 <span class="en">course code</span><span class="req">*</span></div>
          <el-input v-model="form.courseCode" placeholder="例如 CS403" />
        </div>
        <div class="field">
          <div class="field-label">课程名称 <span class="en">course name</span><span class="req">*</span></div>
          <el-input v-model="form.name" placeholder="例如 分布式系统" />
        </div>
        <div class="field">
          <div class="field-label">学分 <span class="en">credit</span></div>
          <el-input-number v-model="form.credit" :min="0.5" :max="20" :step="0.5" style="width: 100%" />
        </div>
        <div class="field">
          <div class="field-label">学时 <span class="en">hours</span></div>
          <el-input-number v-model="form.hours" :min="8" :max="400" :step="8" style="width: 100%" />
        </div>
        <div class="field">
          <div class="field-label">课程类型 <span class="en">type</span></div>
          <el-select v-model="form.courseType" style="width: 100%">
            <el-option v-for="item in COURSE_TYPES" :key="item" :label="item" :value="item" />
          </el-select>
        </div>
        <div class="field">
          <div class="field-label">开课院系 <span class="en">department</span></div>
          <el-select v-model="form.departmentId" placeholder="公共课可留空" filterable clearable style="width: 100%">
            <el-option v-for="item in departmentOptions" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </div>
      </div>

      <div class="field">
        <div class="field-label">课程简介 <span class="en">description</span></div>
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
import { courseApi, departmentApi } from '@/api';
import PanelCard from '@/components/PanelCard.vue';
import type { Course, Option } from '@/types';
import { COURSE_TYPES } from '@/utils/dict';

const loading = ref(false);
const saving = ref(false);
const list = ref<Course[]>([]);
const total = ref(0);
const departmentOptions = ref<Option[]>([]);

const formVisible = ref(false);
const editingId = ref<number | null>(null);

const query = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
  departmentId: undefined as number | undefined,
  courseType: undefined as string | undefined,
});

function emptyForm() {
  return {
    courseCode: '',
    name: '',
    credit: 2,
    hours: 32,
    courseType: '必修',
    departmentId: undefined as number | undefined,
    description: '',
  };
}

const form = reactive(emptyForm());

async function load() {
  loading.value = true;
  try {
    const result = await courseApi.list({ ...query });
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
  query.departmentId = undefined;
  query.courseType = undefined;
  handleSearch();
}

function openCreate() {
  editingId.value = null;
  Object.assign(form, emptyForm());
  formVisible.value = true;
}

function openEdit(row: Course) {
  editingId.value = row.id;
  Object.assign(form, {
    courseCode: row.course_code,
    name: row.name,
    credit: row.credit,
    hours: row.hours,
    courseType: row.course_type,
    departmentId: row.department_id ?? undefined,
    description: row.description ?? '',
  });
  formVisible.value = true;
}

async function handleSubmit() {
  if (!form.courseCode.trim() || !form.name.trim()) {
    ElMessage.warning('请填写课程代码与名称');
    return;
  }
  const payload = {
    courseCode: form.courseCode.trim(),
    name: form.name.trim(),
    credit: form.credit,
    hours: form.hours,
    courseType: form.courseType,
    departmentId: form.departmentId ?? null,
    description: form.description || null,
  };

  saving.value = true;
  try {
    if (editingId.value) {
      await courseApi.update(editingId.value, payload);
      ElMessage.success('课程已保存');
    } else {
      await courseApi.create(payload);
      ElMessage.success('课程已创建');
    }
    formVisible.value = false;
    load();
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row: Course) {
  try {
    await ElMessageBox.confirm(`确认删除课程「${row.name}」？`, '删除课程', {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch {
    return;
  }
  await courseApi.remove(row.id);
  ElMessage.success('课程已删除');
  load();
}

onMounted(async () => {
  departmentOptions.value = await departmentApi.options();
  await load();
});
</script>
