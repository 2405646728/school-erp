<template>
  <div class="page">
    <div class="page-head">
      <div>
        <div class="page-title">学生管理 <small class="t4" style="font-size: 12px; font-weight: 400">students</small></div>
        <div class="page-desc">学籍档案的查询、维护与批量管理，共 {{ total }} 条学籍记录</div>
      </div>
      <div class="page-actions">
        <el-button :icon="Download" @click="handleExport">导出 CSV</el-button>
        <el-button :icon="Upload" @click="importVisible = true">批量导入</el-button>
        <el-button type="primary" :icon="Plus" @click="openCreate">新增学生</el-button>
      </div>
    </div>

    <PanelCard>
      <!-- 筛选条件 -->
      <div class="toolbar">
        <el-input
          v-model="query.keyword"
          placeholder="搜索学号 / 姓名 / 手机号 / 身份证号"
          :prefix-icon="Search"
          clearable
          style="width: 260px"
          @keydown.enter="handleSearch"
        />
        <el-select v-model="query.departmentId" placeholder="全部院系" clearable style="width: 180px" @change="handleDepartmentChange">
          <el-option v-for="item in departmentOptions" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
        <el-select v-model="query.majorId" placeholder="全部专业" clearable style="width: 180px" @change="handleMajorChange">
          <el-option v-for="item in majorOptions" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
        <el-select v-model="query.classId" placeholder="全部班级" clearable style="width: 200px">
          <el-option v-for="item in classOptions" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
        <el-select v-model="query.status" placeholder="学籍状态" clearable style="width: 130px">
          <el-option v-for="item in STUDENT_STATUS" :key="item" :label="item" :value="item" />
        </el-select>
        <el-select v-model="query.enrollYear" placeholder="年级" clearable style="width: 120px">
          <el-option v-for="year in gradeYearOptions()" :key="year" :label="`${year} 级`" :value="year" />
        </el-select>
        <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
        <el-button :icon="RefreshLeft" @click="handleReset">重置</el-button>

        <div class="toolbar-right">
          <el-button
            v-if="selection.length"
            type="danger"
            plain
            :icon="Delete"
            @click="handleBatchDelete"
          >
            删除选中 {{ selection.length }} 项
          </el-button>
        </div>
      </div>

      <!-- 数据表 -->
      <el-table
        v-loading="loading"
        :data="list"
        row-key="id"
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="44" reserve-selection />
        <el-table-column prop="student_no" label="学号" width="150" fixed>
          <template #default="{ row }">
            <el-button link type="primary" class="mono" @click="openDetail(row.id)">
              {{ row.student_no }}
            </el-button>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column prop="gender" label="性别" width="66" align="center" />
        <el-table-column prop="department_name" label="院系" min-width="132" show-overflow-tooltip />
        <el-table-column prop="major_name" label="专业" min-width="150" show-overflow-tooltip />
        <el-table-column prop="class_name" label="班级" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ row.class_name || '未分班' }}</template>
        </el-table-column>
        <el-table-column prop="enroll_year" label="年级" width="80" align="center">
          <template #default="{ row }">{{ row.enroll_year }} 级</template>
        </el-table-column>
        <el-table-column prop="phone" label="手机号" width="124">
          <template #default="{ row }"><span class="mono">{{ row.phone || '—' }}</span></template>
        </el-table-column>
        <el-table-column label="学籍状态" width="92" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status)" size="small" effect="light">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="190" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row.id)">详情</el-button>
            <el-button link type="primary" @click="openEdit(row.id)">编辑</el-button>
            <el-dropdown trigger="click" @command="(cmd: string) => handleCommand(cmd, row)">
              <el-button link type="primary">更多<el-icon><ArrowDown /></el-icon></el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="reset">重置密码</el-dropdown-item>
                  <el-dropdown-item command="delete" divided>删除档案</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="没有符合条件的学生" :image-size="90" />
        </template>
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

    <StudentFormDrawer v-model="formVisible" :student-id="editingId" @saved="load" />
    <StudentDetailDrawer
      v-model="detailVisible"
      :student-id="detailId"
      @edit="handleDetailEdit"
      @changed="load"
    />
    <StudentImportDialog v-model="importVisible" @imported="load" />
    <div style="height: 16px" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  ArrowDown,
  Delete,
  Download,
  Plus,
  RefreshLeft,
  Search,
  Upload,
} from '@element-plus/icons-vue';
import { classApi, departmentApi, majorApi, studentApi } from '@/api';
import PanelCard from '@/components/PanelCard.vue';
import StudentDetailDrawer from './StudentDetailDrawer.vue';
import StudentFormDrawer from './StudentFormDrawer.vue';
import StudentImportDialog from './StudentImportDialog.vue';
import type { Option, Student } from '@/types';
import { STUDENT_STATUS, gradeYearOptions, statusTag } from '@/utils/dict';

const loading = ref(false);
const list = ref<Student[]>([]);
const total = ref(0);
const selection = ref<Student[]>([]);

const formVisible = ref(false);
const detailVisible = ref(false);
const importVisible = ref(false);
const editingId = ref<number | null>(null);
const detailId = ref<number | null>(null);

const departmentOptions = ref<Option[]>([]);
const majorOptions = ref<Option[]>([]);
const classOptions = ref<Option[]>([]);

const query = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
  departmentId: undefined as number | undefined,
  majorId: undefined as number | undefined,
  classId: undefined as number | undefined,
  status: undefined as string | undefined,
  enrollYear: undefined as number | undefined,
});

async function load() {
  loading.value = true;
  try {
    const result = await studentApi.list({ ...query });
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

function handleSelectionChange(rows: Student[]) {
  selection.value = rows;
}

function handleReset() {
  query.keyword = '';
  query.departmentId = undefined;
  query.majorId = undefined;
  query.classId = undefined;
  query.status = undefined;
  query.enrollYear = undefined;
  majorOptions.value = [];
  classOptions.value = [];
  handleSearch();
}

async function handleDepartmentChange(value?: number) {
  query.majorId = undefined;
  query.classId = undefined;
  majorOptions.value = value ? await majorApi.options(value) : [];
  classOptions.value = [];
  handleSearch();
}

async function handleMajorChange(value?: number) {
  query.classId = undefined;
  classOptions.value = value ? await classApi.options(value) : [];
  handleSearch();
}

function openCreate() {
  editingId.value = null;
  formVisible.value = true;
}

function openEdit(id: number) {
  editingId.value = id;
  formVisible.value = true;
}

function openDetail(id: number) {
  detailId.value = id;
  detailVisible.value = true;
}

/** 从详情抽屉直接跳到编辑，先关详情再开表单 */
function handleDetailEdit(id: number) {
  detailVisible.value = false;
  setTimeout(() => openEdit(id), 200);
}

async function handleExport() {
  await studentApi.exportCsv({
    keyword: query.keyword,
    departmentId: query.departmentId,
    majorId: query.majorId,
    classId: query.classId,
    status: query.status,
    enrollYear: query.enrollYear,
  });
  ElMessage.success('导出任务已完成，请查看下载文件');
}

async function handleCommand(command: string, row: Student) {
  if (command === 'reset') {
    try {
      await ElMessageBox.confirm(`确认重置「${row.name}」的登录密码？`, '重置密码', {
        confirmButtonText: '确认重置',
        cancelButtonText: '取消',
        type: 'warning',
      });
    } catch {
      return;
    }
    const result = await studentApi.resetPassword(row.id);
    ElMessage.success(`密码已重置为 ${result.password}`);
    return;
  }

  if (command === 'delete') {
    try {
      await ElMessageBox.confirm(
        `确认删除学生「${row.name}（${row.student_no}）」？其选课与成绩记录将一并删除，且不可恢复。`,
        '删除学生档案',
        { confirmButtonText: '确认删除', cancelButtonText: '取消', type: 'error' },
      );
    } catch {
      return;
    }
    await studentApi.remove(row.id);
    ElMessage.success('学生档案已删除');
    load();
  }
}

async function handleBatchDelete() {
  const names = selection.value.slice(0, 3).map((item) => item.name).join('、');
  try {
    await ElMessageBox.confirm(
      `确认删除选中的 ${selection.value.length} 名学生（${names}${selection.value.length > 3 ? ' 等' : ''}）？该操作不可恢复。`,
      '批量删除',
      { confirmButtonText: '确认删除', cancelButtonText: '取消', type: 'error' },
    );
  } catch {
    return;
  }
  const result = await studentApi.batchDelete(selection.value.map((item) => item.id));
  ElMessage.success(`已删除 ${result.deleted} 名学生`);
  selection.value = [];
  load();
}

onMounted(async () => {
  departmentOptions.value = await departmentApi.options();
  await load();
});
</script>
