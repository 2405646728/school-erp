<template>
  <div class="page">
    <div class="page-head">
      <div>
        <div class="page-title">教师管理 <small class="t4" style="font-size: 12px; font-weight: 400">teachers</small></div>
        <div class="page-desc">教师基本信息、职称与院系归属，共 {{ total }} 位教师</div>
      </div>
      <div class="page-actions">
        <el-button type="primary" :icon="Plus" @click="openCreate">新增教师</el-button>
      </div>
    </div>

    <PanelCard>
      <div class="toolbar">
        <el-input
          v-model="query.keyword"
          placeholder="搜索工号 / 姓名 / 手机号"
          :prefix-icon="Search"
          clearable
          style="width: 240px"
          @keydown.enter="handleSearch"
        />
        <el-select v-model="query.departmentId" placeholder="全部院系" clearable style="width: 190px" @change="handleSearch">
          <el-option v-for="item in departmentOptions" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
        <el-select v-model="query.title" placeholder="职称" clearable style="width: 130px" @change="handleSearch">
          <el-option v-for="item in TEACHER_TITLES" :key="item" :label="item" :value="item" />
        </el-select>
        <el-select v-model="query.status" placeholder="在职状态" clearable style="width: 130px" @change="handleSearch">
          <el-option v-for="item in TEACHER_STATUS" :key="item" :label="item" :value="item" />
        </el-select>
        <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
        <el-button :icon="RefreshLeft" @click="handleReset">重置</el-button>
      </div>

      <el-table v-loading="loading" :data="list" style="width: 100%">
        <el-table-column prop="teacher_no" label="工号" width="110" fixed>
          <template #default="{ row }">
            <el-button link type="primary" class="mono" @click="openDetail(row.id)">{{ row.teacher_no }}</el-button>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="姓名" width="96" />
        <el-table-column prop="gender" label="性别" width="66" align="center" />
        <el-table-column prop="title" label="职称" width="100">
          <template #default="{ row }">
            <el-tag size="small" effect="plain" :type="row.title === '教授' ? 'danger' : row.title === '副教授' ? 'warning' : 'info'">
              {{ row.title }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="department_name" label="所属院系" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">{{ row.department_name || '—' }}</template>
        </el-table-column>
        <el-table-column prop="phone" label="手机号" width="122">
          <template #default="{ row }"><span class="mono">{{ row.phone || '—' }}</span></template>
        </el-table-column>
        <el-table-column prop="email" label="邮箱" min-width="170" show-overflow-tooltip />
        <el-table-column prop="hire_date" label="入职日期" width="104">
          <template #default="{ row }">{{ formatDate(row.hire_date) }}</template>
        </el-table-column>
        <el-table-column prop="offering_count" label="开课数" width="84" align="center" />
        <el-table-column label="状态" width="88" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status)" size="small" effect="light">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row.id)">详情</el-button>
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-dropdown trigger="click" @command="(cmd: string) => handleCommand(cmd, row)">
              <el-button link type="primary">更多<el-icon><ArrowDown /></el-icon></el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="reset">重置密码</el-dropdown-item>
                  <el-dropdown-item command="delete" divided>删除教师</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="没有符合条件的教师" :image-size="90" />
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

    <!-- 新增 / 编辑 -->
    <el-dialog
      v-model="formVisible"
      :title="editingId ? '编辑教师' : '新增教师'"
      width="640px"
      :close-on-click-modal="false"
    >
      <div class="field-grid">
        <div class="field">
          <div class="field-label">工号 <span class="en">teacher no.</span><span class="req">*</span></div>
          <el-input v-model="form.teacherNo" placeholder="例如 T0049" />
          <div class="field-hint">工号同时作为教师登录账号</div>
        </div>
        <div class="field">
          <div class="field-label">姓名 <span class="en">name</span><span class="req">*</span></div>
          <el-input v-model="form.name" placeholder="请输入教师姓名" />
        </div>
        <div class="field">
          <div class="field-label">性别 <span class="en">gender</span></div>
          <el-radio-group v-model="form.gender">
            <el-radio v-for="item in GENDER_OPTIONS" :key="item" :value="item">{{ item }}</el-radio>
          </el-radio-group>
        </div>
        <div class="field">
          <div class="field-label">职称 <span class="en">title</span></div>
          <el-select v-model="form.title" style="width: 100%">
            <el-option v-for="item in TEACHER_TITLES" :key="item" :label="item" :value="item" />
          </el-select>
        </div>
        <div class="field">
          <div class="field-label">所属院系 <span class="en">department</span></div>
          <el-select v-model="form.departmentId" placeholder="请选择院系" filterable clearable style="width: 100%">
            <el-option v-for="item in departmentOptions" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </div>
        <div class="field">
          <div class="field-label">在职状态 <span class="en">status</span></div>
          <el-select v-model="form.status" style="width: 100%">
            <el-option v-for="item in TEACHER_STATUS" :key="item" :label="item" :value="item" />
          </el-select>
        </div>
        <div class="field">
          <div class="field-label">手机号 <span class="en">phone</span></div>
          <el-input v-model="form.phone" maxlength="20" />
        </div>
        <div class="field">
          <div class="field-label">邮箱 <span class="en">email</span></div>
          <el-input v-model="form.email" maxlength="60" />
        </div>
        <div class="field">
          <div class="field-label">入职日期 <span class="en">hire date</span></div>
          <el-date-picker v-model="form.hireDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </div>
        <div class="field">
          <div class="field-label">备注 <span class="en">remark</span></div>
          <el-input v-model="form.remark" maxlength="255" />
        </div>
      </div>

      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 详情 -->
    <el-dialog v-model="detailVisible" title="教师详情" width="780px">
      <div v-loading="detailLoading">
        <template v-if="detail">
          <el-descriptions :column="3" border size="small">
            <el-descriptions-item label="工号">
              <span class="mono">{{ detail.teacher_no }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="姓名">{{ detail.name }}</el-descriptions-item>
            <el-descriptions-item label="性别">{{ detail.gender }}</el-descriptions-item>
            <el-descriptions-item label="职称">{{ detail.title }}</el-descriptions-item>
            <el-descriptions-item label="所属院系">{{ detail.department?.name || '—' }}</el-descriptions-item>
            <el-descriptions-item label="在职状态">
              <el-tag :type="statusTag(detail.status)" size="small" effect="light">{{ detail.status }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="手机号">
              <span class="mono">{{ detail.phone || '—' }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="邮箱">{{ detail.email || '—' }}</el-descriptions-item>
            <el-descriptions-item label="入职日期">{{ formatDate(detail.hire_date) }}</el-descriptions-item>
            <el-descriptions-item label="登录账号" :span="3">
              <template v-if="detail.account">
                <span class="mono">{{ detail.account.username }}</span>
                <el-tag :type="statusTag(String(detail.account.status))" size="small" effect="light" style="margin-left: 8px">
                  {{ detail.account.status }}
                </el-tag>
              </template>
              <span v-else class="t4">未开通登录账号</span>
            </el-descriptions-item>
          </el-descriptions>

          <div class="panel-title" style="margin: 20px 0 12px">
            授课教学班 <small>course offerings</small>
          </div>
          <el-table :data="detail.offerings" size="small" max-height="280">
            <el-table-column prop="offering_code" label="教学班编号" width="140" />
            <el-table-column prop="course_name" label="课程" min-width="160" show-overflow-tooltip />
            <el-table-column prop="semester" label="学期" width="120" />
            <el-table-column prop="classroom" label="教室" width="90" />
            <el-table-column prop="schedule" label="上课时间" width="120" />
            <el-table-column prop="student_count" label="选课人数" width="90" align="center" />
            <el-table-column label="状态" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="statusTag(row.status)" size="small" effect="light">{{ row.status }}</el-tag>
              </template>
            </el-table-column>
            <template #empty><el-empty description="暂无授课记录" :image-size="70" /></template>
          </el-table>
        </template>
      </div>
    </el-dialog>

    <div style="height: 16px" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowDown, Plus, RefreshLeft, Search } from '@element-plus/icons-vue';
import { departmentApi, teacherApi } from '@/api';
import PanelCard from '@/components/PanelCard.vue';
import type { Option, Teacher } from '@/types';
import { GENDER_OPTIONS, TEACHER_STATUS, TEACHER_TITLES, statusTag } from '@/utils/dict';
import { formatDate } from '@/utils/format';

const loading = ref(false);
const saving = ref(false);
const detailLoading = ref(false);
const list = ref<Teacher[]>([]);
const total = ref(0);
const departmentOptions = ref<Option[]>([]);

const formVisible = ref(false);
const detailVisible = ref(false);
const editingId = ref<number | null>(null);
const detail = ref<(Teacher & { department: { name: string } | null; offerings: Record<string, unknown>[]; account: Record<string, unknown> | null }) | null>(null);

const query = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
  departmentId: undefined as number | undefined,
  title: undefined as string | undefined,
  status: undefined as string | undefined,
});

function emptyForm() {
  return {
    teacherNo: '',
    name: '',
    gender: '男',
    title: '讲师',
    departmentId: undefined as number | undefined,
    phone: '',
    email: '',
    hireDate: '',
    status: '在职',
    remark: '',
  };
}

const form = reactive(emptyForm());

async function load() {
  loading.value = true;
  try {
    const result = await teacherApi.list({ ...query });
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
  query.title = undefined;
  query.status = undefined;
  handleSearch();
}

function openCreate() {
  editingId.value = null;
  Object.assign(form, emptyForm());
  formVisible.value = true;
}

function openEdit(row: Teacher) {
  editingId.value = row.id;
  Object.assign(form, {
    teacherNo: row.teacher_no,
    name: row.name,
    gender: row.gender,
    title: row.title,
    departmentId: row.department_id ?? undefined,
    phone: row.phone ?? '',
    email: row.email ?? '',
    hireDate: row.hire_date ?? '',
    status: row.status,
    remark: row.remark ?? '',
  });
  formVisible.value = true;
}

async function openDetail(id: number) {
  detailVisible.value = true;
  detailLoading.value = true;
  try {
    detail.value = await teacherApi.detail(id);
  } finally {
    detailLoading.value = false;
  }
}

async function handleSubmit() {
  if (!form.teacherNo.trim() || !form.name.trim()) {
    ElMessage.warning('请填写工号与姓名');
    return;
  }
  const payload = {
    teacherNo: form.teacherNo.trim(),
    name: form.name.trim(),
    gender: form.gender,
    title: form.title,
    departmentId: form.departmentId ?? null,
    phone: form.phone || null,
    email: form.email || null,
    hireDate: form.hireDate || null,
    status: form.status,
    remark: form.remark || null,
  };

  saving.value = true;
  try {
    if (editingId.value) {
      await teacherApi.update(editingId.value, payload);
      ElMessage.success('教师信息已保存');
    } else {
      await teacherApi.create(payload);
      ElMessage.success('教师已创建，登录账号为工号，初始密码 123456');
    }
    formVisible.value = false;
    load();
  } finally {
    saving.value = false;
  }
}

async function handleCommand(command: string, row: Teacher) {
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
    const result = await teacherApi.resetPassword(row.id);
    ElMessage.success(`密码已重置为 ${result.password}`);
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确认删除教师「${row.name}（${row.teacher_no}）」？其登录账号将同时被删除。`,
      '删除教师',
      { confirmButtonText: '确认删除', cancelButtonText: '取消', type: 'error' },
    );
  } catch {
    return;
  }
  await teacherApi.remove(row.id);
  ElMessage.success('教师已删除');
  load();
}

onMounted(async () => {
  departmentOptions.value = await departmentApi.options();
  await load();
});
</script>
