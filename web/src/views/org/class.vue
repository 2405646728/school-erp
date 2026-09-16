<template>
  <div class="page">
    <div class="page-head">
      <div>
        <div class="page-title">班级管理 <small class="t4" style="font-size: 12px; font-weight: 400">classes</small></div>
        <div class="page-desc">行政班是学生归属与选课的最小单位，共 {{ total }} 个班级</div>
      </div>
      <div class="page-actions">
        <el-button type="primary" :icon="Plus" @click="openCreate">新增班级</el-button>
      </div>
    </div>

    <PanelCard>
      <div class="toolbar">
        <el-input
          v-model="query.keyword"
          placeholder="搜索班级编号 / 名称 / 专业"
          :prefix-icon="Search"
          clearable
          style="width: 260px"
          @keydown.enter="handleSearch"
        />
        <el-select v-model="query.departmentId" placeholder="全部院系" clearable style="width: 190px" @change="handleDepartmentChange">
          <el-option v-for="item in departmentOptions" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
        <el-select v-model="query.majorId" placeholder="全部专业" clearable style="width: 190px" @change="handleSearch">
          <el-option v-for="item in majorOptions" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
        <el-select v-model="query.gradeYear" placeholder="年级" clearable style="width: 120px" @change="handleSearch">
          <el-option v-for="year in gradeYearOptions()" :key="year" :label="`${year} 级`" :value="year" />
        </el-select>
        <el-select v-model="query.status" placeholder="状态" clearable style="width: 120px" @change="handleSearch">
          <el-option v-for="item in CLASS_STATUS" :key="item" :label="item" :value="item" />
        </el-select>
        <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
        <el-button :icon="RefreshLeft" @click="handleReset">重置</el-button>
      </div>

      <el-table v-loading="loading" :data="list" style="width: 100%">
        <el-table-column prop="code" label="班级编号" width="130" fixed>
          <template #default="{ row }"><span class="mono">{{ row.code }}</span></template>
        </el-table-column>
        <el-table-column prop="name" label="班级名称" min-width="210" show-overflow-tooltip />
        <el-table-column prop="grade_year" label="年级" width="86" align="center">
          <template #default="{ row }">{{ row.grade_year }} 级</template>
        </el-table-column>
        <el-table-column prop="major_name" label="专业" min-width="180" show-overflow-tooltip />
        <el-table-column prop="department_name" label="院系" min-width="170" show-overflow-tooltip />
        <el-table-column prop="counselor_name" label="辅导员" width="100">
          <template #default="{ row }">{{ row.counselor_name || '—' }}</template>
        </el-table-column>
        <el-table-column prop="classroom" label="固定教室" width="120">
          <template #default="{ row }">{{ row.classroom || '—' }}</template>
        </el-table-column>
        <el-table-column prop="student_count" label="学生数" width="86" align="center">
          <template #default="{ row }"><b>{{ row.student_count }}</b></template>
        </el-table-column>
        <el-table-column label="状态" width="94" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status)" size="small" effect="light">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="130" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty><el-empty description="没有符合条件的班级" :image-size="90" /></template>
      </el-table>

      <el-pagination
        v-model:current-page="query.page"
        v-model:page-size="query.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @current-change="load"
        @size-change="handleSearch"
      />
    </PanelCard>

    <el-dialog
      v-model="formVisible"
      :title="editingId ? '编辑班级' : '新增班级'"
      width="640px"
      :close-on-click-modal="false"
    >
      <div class="field-grid">
        <div class="field">
          <div class="field-label">班级编号 <span class="en">code</span><span class="req">*</span></div>
          <el-input v-model="form.code" placeholder="例如 080901-2026-1" maxlength="30" />
        </div>
        <div class="field">
          <div class="field-label">班级名称 <span class="en">name</span><span class="req">*</span></div>
          <el-input v-model="form.name" placeholder="例如 计算机科学与技术2026级1班" maxlength="50" />
        </div>
        <div class="field">
          <div class="field-label">所属院系 <span class="en">department</span></div>
          <el-select
            v-model="form.departmentId"
            placeholder="先选院系可筛选专业"
            filterable
            style="width: 100%"
            @change="handleFormDepartmentChange"
          >
            <el-option v-for="item in departmentOptions" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </div>
        <div class="field">
          <div class="field-label">所属专业 <span class="en">major</span><span class="req">*</span></div>
          <el-select v-model="form.majorId" placeholder="请选择专业" filterable style="width: 100%">
            <el-option v-for="item in formMajorOptions" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </div>
        <div class="field">
          <div class="field-label">年级 <span class="en">grade year</span></div>
          <el-select v-model="form.gradeYear" style="width: 100%">
            <el-option v-for="year in gradeYearOptions()" :key="year" :label="`${year} 级`" :value="year" />
          </el-select>
        </div>
        <div class="field">
          <div class="field-label">辅导员 <span class="en">counselor</span></div>
          <el-select v-model="form.counselorId" placeholder="请选择辅导员" filterable clearable style="width: 100%">
            <el-option
              v-for="item in teacherOptions"
              :key="item.id"
              :label="`${item.teacher_no} ${item.name}`"
              :value="item.id"
            />
          </el-select>
        </div>
        <div class="field">
          <div class="field-label">固定教室 <span class="en">classroom</span></div>
          <el-input v-model="form.classroom" placeholder="例如 信息楼 305" maxlength="50" />
        </div>
        <div class="field">
          <div class="field-label">状态 <span class="en">status</span></div>
          <el-select v-model="form.status" style="width: 100%">
            <el-option v-for="item in CLASS_STATUS" :key="item" :label="item" :value="item" />
          </el-select>
        </div>
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
import { classApi, departmentApi, majorApi, teacherApi } from '@/api';
import PanelCard from '@/components/PanelCard.vue';
import type { ClassGroup, Option } from '@/types';
import { CLASS_STATUS, gradeYearOptions, statusTag } from '@/utils/dict';

const loading = ref(false);
const saving = ref(false);
const list = ref<ClassGroup[]>([]);
const total = ref(0);

const departmentOptions = ref<Option[]>([]);
const majorOptions = ref<Option[]>([]);
const formMajorOptions = ref<Option[]>([]);
const teacherOptions = ref<Option[]>([]);

const formVisible = ref(false);
const editingId = ref<number | null>(null);

const query = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
  departmentId: undefined as number | undefined,
  majorId: undefined as number | undefined,
  gradeYear: undefined as number | undefined,
  status: undefined as string | undefined,
});

function emptyForm() {
  return {
    code: '',
    name: '',
    departmentId: undefined as number | undefined,
    majorId: undefined as number | undefined,
    gradeYear: new Date().getFullYear(),
    counselorId: undefined as number | undefined,
    classroom: '',
    status: '在读',
  };
}

const form = reactive(emptyForm());

async function load() {
  loading.value = true;
  try {
    const result = await classApi.list({ ...query });
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
  query.majorId = undefined;
  query.gradeYear = undefined;
  query.status = undefined;
  majorOptions.value = [];
  handleSearch();
}

async function handleDepartmentChange(value?: number) {
  query.majorId = undefined;
  majorOptions.value = value ? await majorApi.options(value) : [];
  handleSearch();
}

async function handleFormDepartmentChange(value?: number) {
  form.majorId = undefined;
  formMajorOptions.value = value ? await majorApi.options(value) : [];
}

async function openCreate() {
  editingId.value = null;
  Object.assign(form, emptyForm());
  formMajorOptions.value = majorOptions.value.length ? majorOptions.value : await majorApi.options();
  formVisible.value = true;
}

async function openEdit(row: ClassGroup) {
  editingId.value = row.id;
  const majors = await majorApi.options();
  formMajorOptions.value = majors;
  const major = majors.find((item) => item.id === row.major_id);
  Object.assign(form, {
    code: row.code,
    name: row.name,
    departmentId: major?.department_id ?? undefined,
    majorId: row.major_id,
    gradeYear: row.grade_year,
    counselorId: row.counselor_id ?? undefined,
    classroom: row.classroom ?? '',
    status: row.status,
  });
  formVisible.value = true;
}

async function handleSubmit() {
  if (!form.code.trim() || !form.name.trim() || !form.majorId) {
    ElMessage.warning('请填写班级编号、名称与所属专业');
    return;
  }
  const payload = {
    code: form.code.trim(),
    name: form.name.trim(),
    majorId: form.majorId,
    gradeYear: form.gradeYear,
    counselorId: form.counselorId ?? null,
    classroom: form.classroom || null,
    status: form.status,
  };

  saving.value = true;
  try {
    if (editingId.value) {
      await classApi.update(editingId.value, payload);
      ElMessage.success('班级已保存');
    } else {
      await classApi.create(payload);
      ElMessage.success('班级已创建');
    }
    formVisible.value = false;
    load();
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row: ClassGroup) {
  try {
    await ElMessageBox.confirm(`确认删除班级「${row.name}」？`, '删除班级', {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch {
    return;
  }
  await classApi.remove(row.id);
  ElMessage.success('班级已删除');
  load();
}

onMounted(async () => {
  const [departments, teachers, majors] = await Promise.all([
    departmentApi.options(),
    teacherApi.options(),
    majorApi.options(),
  ]);
  departmentOptions.value = departments;
  teacherOptions.value = teachers;
  majorOptions.value = majors;
  await load();
});
</script>
