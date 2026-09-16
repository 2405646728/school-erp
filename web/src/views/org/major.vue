<template>
  <div class="page">
    <div class="page-head">
      <div>
        <div class="page-title">专业管理 <small class="t4" style="font-size: 12px; font-weight: 400">majors</small></div>
        <div class="page-desc">院系下设专业与学制信息，班级按专业分设，共 {{ total }} 个专业</div>
      </div>
      <div class="page-actions">
        <el-button type="primary" :icon="Plus" @click="openCreate">新增专业</el-button>
      </div>
    </div>

    <PanelCard>
      <div class="toolbar">
        <el-input
          v-model="query.keyword"
          placeholder="搜索专业代码 / 名称"
          :prefix-icon="Search"
          clearable
          style="width: 240px"
          @keydown.enter="handleSearch"
        />
        <el-select v-model="query.departmentId" placeholder="全部院系" clearable style="width: 200px" @change="handleSearch">
          <el-option v-for="item in departmentOptions" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
        <el-select v-model="query.degreeType" placeholder="学历层次" clearable style="width: 140px" @change="handleSearch">
          <el-option v-for="item in DEGREE_TYPES" :key="item" :label="item" :value="item" />
        </el-select>
        <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
        <el-button :icon="RefreshLeft" @click="handleReset">重置</el-button>
      </div>

      <el-table v-loading="loading" :data="list" style="width: 100%">
        <el-table-column prop="code" label="专业代码" width="120" fixed>
          <template #default="{ row }"><span class="mono">{{ row.code }}</span></template>
        </el-table-column>
        <el-table-column prop="name" label="专业名称" min-width="210" show-overflow-tooltip />
        <el-table-column prop="department_name" label="所属院系" min-width="190" show-overflow-tooltip />
        <el-table-column prop="degree_type" label="层次" width="90" align="center">
          <template #default="{ row }">
            <el-tag size="small" effect="light" :type="row.degree_type === '本科' ? 'primary' : 'warning'">
              {{ row.degree_type }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="duration_years" label="学制" width="80" align="center">
          <template #default="{ row }">{{ row.duration_years }} 年</template>
        </el-table-column>
        <el-table-column prop="class_count" label="班级数" width="86" align="center" />
        <el-table-column prop="student_count" label="学生数" width="86" align="center">
          <template #default="{ row }"><b>{{ row.student_count }}</b></template>
        </el-table-column>
        <el-table-column prop="description" label="专业简介" min-width="220" show-overflow-tooltip />
        <el-table-column label="操作" width="130" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty><el-empty description="没有符合条件的专业" :image-size="90" /></template>
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
      :title="editingId ? '编辑专业' : '新增专业'"
      width="620px"
      :close-on-click-modal="false"
    >
      <div class="field-grid">
        <div class="field">
          <div class="field-label">专业代码 <span class="en">code</span><span class="req">*</span></div>
          <el-input v-model="form.code" placeholder="教育部专业代码，例如 080903" maxlength="20" />
        </div>
        <div class="field">
          <div class="field-label">专业名称 <span class="en">name</span><span class="req">*</span></div>
          <el-input v-model="form.name" placeholder="例如 网络空间安全" maxlength="50" />
        </div>
        <div class="field">
          <div class="field-label">所属院系 <span class="en">department</span><span class="req">*</span></div>
          <el-select v-model="form.departmentId" placeholder="请选择院系" filterable style="width: 100%">
            <el-option v-for="item in departmentOptions" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </div>
        <div class="field">
          <div class="field-label">学历层次 <span class="en">degree</span></div>
          <el-select v-model="form.degreeType" style="width: 100%">
            <el-option v-for="item in DEGREE_TYPES" :key="item" :label="item" :value="item" />
          </el-select>
        </div>
        <div class="field">
          <div class="field-label">学制（年） <span class="en">duration</span></div>
          <el-input-number v-model="form.durationYears" :min="2" :max="8" style="width: 100%" />
        </div>
      </div>

      <div class="field">
        <div class="field-label">专业简介 <span class="en">description</span></div>
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
import { departmentApi, majorApi } from '@/api';
import PanelCard from '@/components/PanelCard.vue';
import type { Major, Option } from '@/types';
import { DEGREE_TYPES } from '@/utils/dict';

const loading = ref(false);
const saving = ref(false);
const list = ref<Major[]>([]);
const total = ref(0);
const departmentOptions = ref<Option[]>([]);
const formVisible = ref(false);
const editingId = ref<number | null>(null);

const query = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
  departmentId: undefined as number | undefined,
  degreeType: undefined as string | undefined,
});

function emptyForm() {
  return {
    code: '',
    name: '',
    departmentId: undefined as number | undefined,
    degreeType: '本科',
    durationYears: 4,
    description: '',
  };
}

const form = reactive(emptyForm());

async function load() {
  loading.value = true;
  try {
    const result = await majorApi.list({ ...query });
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
  query.degreeType = undefined;
  handleSearch();
}

function openCreate() {
  editingId.value = null;
  Object.assign(form, emptyForm());
  formVisible.value = true;
}

function openEdit(row: Major) {
  editingId.value = row.id;
  Object.assign(form, {
    code: row.code,
    name: row.name,
    departmentId: row.department_id,
    degreeType: row.degree_type,
    durationYears: row.duration_years,
    description: row.description ?? '',
  });
  formVisible.value = true;
}

async function handleSubmit() {
  if (!form.code.trim() || !form.name.trim() || !form.departmentId) {
    ElMessage.warning('请填写专业代码、名称与所属院系');
    return;
  }
  const payload = {
    code: form.code.trim(),
    name: form.name.trim(),
    departmentId: form.departmentId,
    degreeType: form.degreeType,
    durationYears: form.durationYears,
    description: form.description || null,
  };

  saving.value = true;
  try {
    if (editingId.value) {
      await majorApi.update(editingId.value, payload);
      ElMessage.success('专业已保存');
    } else {
      await majorApi.create(payload);
      ElMessage.success('专业已创建');
    }
    formVisible.value = false;
    load();
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row: Major) {
  try {
    await ElMessageBox.confirm(`确认删除专业「${row.name}」？`, '删除专业', {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch {
    return;
  }
  await majorApi.remove(row.id);
  ElMessage.success('专业已删除');
  load();
}

onMounted(async () => {
  departmentOptions.value = await departmentApi.options();
  await load();
});
</script>
