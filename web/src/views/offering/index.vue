<template>
  <div class="page">
    <div class="page-head">
      <div>
        <div class="page-title">教学班管理 <small class="t4" style="font-size: 12px; font-weight: 400">course offerings</small></div>
        <div class="page-desc">按学期开设的教学班、授课教师与选课名单，共 {{ total }} 个教学班</div>
      </div>
      <div class="page-actions">
        <el-button type="primary" :icon="Plus" @click="openCreate">新增教学班</el-button>
      </div>
    </div>

    <PanelCard>
      <div class="toolbar">
        <el-input
          v-model="query.keyword"
          placeholder="搜索教学班编号 / 课程 / 教师 / 教室"
          :prefix-icon="Search"
          clearable
          style="width: 280px"
          @keydown.enter="handleSearch"
        />
        <el-select v-model="query.semester" placeholder="全部学期" clearable style="width: 150px" @change="handleSearch">
          <el-option v-for="item in semesters" :key="item" :label="item" :value="item" />
        </el-select>
        <el-select v-model="query.departmentId" placeholder="开课院系" clearable style="width: 180px" @change="handleSearch">
          <el-option v-for="item in departmentOptions" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
        <el-select v-model="query.teacherId" placeholder="授课教师" clearable filterable style="width: 160px" @change="handleSearch">
          <el-option v-for="item in teacherOptions" :key="item.id" :label="`${item.teacher_no} ${item.name}`" :value="item.id" />
        </el-select>
        <el-select v-model="query.status" placeholder="状态" clearable style="width: 130px" @change="handleSearch">
          <el-option v-for="item in OFFERING_STATUS" :key="item" :label="item" :value="item" />
        </el-select>
        <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
        <el-button :icon="RefreshLeft" @click="handleReset">重置</el-button>
      </div>

      <el-table v-loading="loading" :data="list" style="width: 100%">
        <el-table-column prop="offering_code" label="教学班编号" width="132" fixed>
          <template #default="{ row }">
            <el-button link type="primary" class="mono" @click="openDetail(row.id)">{{ row.offering_code }}</el-button>
          </template>
        </el-table-column>
        <el-table-column prop="course_name" label="课程" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.course_name }}
            <el-tag size="small" effect="plain" type="info" style="margin-left: 6px">{{ row.course_type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="credit" label="学分" width="62" align="center" />
        <el-table-column prop="teacher_name" label="授课教师" width="96">
          <template #default="{ row }">{{ row.teacher_name || '—' }}</template>
        </el-table-column>
        <el-table-column prop="semester" label="学期" width="112" />
        <el-table-column prop="class_name" label="面向班级" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ row.class_name || '全校选修' }}</template>
        </el-table-column>
        <el-table-column prop="classroom" label="教室" width="94" />
        <el-table-column prop="schedule" label="上课时间" width="118" />
        <el-table-column label="选课 / 容量" width="106" align="center">
          <template #default="{ row }">
            <span :class="{ 'over-capacity': row.student_count >= row.capacity }">
              {{ row.student_count }} / {{ row.capacity }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="92" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status)" size="small" effect="light">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="168" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row.id)">名单/成绩</el-button>
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="没有符合条件的教学班" :image-size="90" />
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
      :title="editingId ? '编辑教学班' : '新增教学班'"
      width="680px"
      :close-on-click-modal="false"
    >
      <div class="field-grid">
        <div class="field">
          <div class="field-label">教学班编号 <span class="en">offering code</span><span class="req">*</span></div>
          <el-input v-model="form.offeringCode" placeholder="例如 20252026-1-0001" />
        </div>
        <div class="field">
          <div class="field-label">课程 <span class="en">course</span><span class="req">*</span></div>
          <el-select v-model="form.courseId" placeholder="请选择课程" filterable style="width: 100%">
            <el-option
              v-for="item in courseOptions"
              :key="item.id"
              :label="`${item.course_code} ${item.name}（${item.credit} 学分）`"
              :value="item.id"
            />
          </el-select>
        </div>
        <div class="field">
          <div class="field-label">授课教师 <span class="en">teacher</span></div>
          <el-select v-model="form.teacherId" placeholder="请选择教师" filterable clearable style="width: 100%">
            <el-option
              v-for="item in teacherOptions"
              :key="item.id"
              :label="`${item.teacher_no} ${item.name}（${item.title}）`"
              :value="item.id"
            />
          </el-select>
        </div>
        <div class="field">
          <div class="field-label">学期 <span class="en">semester</span><span class="req">*</span></div>
          <el-select v-model="form.semester" allow-create filterable style="width: 100%">
            <el-option v-for="item in semesterList" :key="item" :label="item" :value="item" />
          </el-select>
        </div>
        <div class="field">
          <div class="field-label">面向班级 <span class="en">class</span></div>
          <el-select v-model="form.classId" placeholder="留空表示全校选修" filterable clearable style="width: 100%">
            <el-option v-for="item in classOptions" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
          <div class="field-hint">选择班级后，创建时会自动把该班在读学生加入名单</div>
        </div>
        <div class="field">
          <div class="field-label">容量 <span class="en">capacity</span></div>
          <el-input-number v-model="form.capacity" :min="1" :max="500" :step="10" style="width: 100%" />
        </div>
        <div class="field">
          <div class="field-label">教室 <span class="en">classroom</span></div>
          <el-input v-model="form.classroom" placeholder="例如 A101" />
        </div>
        <div class="field">
          <div class="field-label">上课时间 <span class="en">schedule</span></div>
          <el-input v-model="form.schedule" placeholder="例如 周一 1-2 节" />
        </div>
        <div class="field">
          <div class="field-label">状态 <span class="en">status</span></div>
          <el-select v-model="form.status" style="width: 100%">
            <el-option v-for="item in OFFERING_STATUS" :key="item" :label="item" :value="item" />
          </el-select>
        </div>
      </div>

      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>

    <OfferingDetailDrawer v-model="detailVisible" :offering-id="detailId" @changed="load" />
    <div style="height: 16px" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, RefreshLeft, Search } from '@element-plus/icons-vue';
import { classApi, courseApi, departmentApi, offeringApi, teacherApi } from '@/api';
import PanelCard from '@/components/PanelCard.vue';
import OfferingDetailDrawer from './OfferingDetailDrawer.vue';
import type { Offering, Option } from '@/types';
import { OFFERING_STATUS, semesterOptions, statusTag } from '@/utils/dict';

const loading = ref(false);
const saving = ref(false);
const list = ref<Offering[]>([]);
const total = ref(0);

const semesters = ref<string[]>([]);
const departmentOptions = ref<Option[]>([]);
const teacherOptions = ref<Option[]>([]);
const courseOptions = ref<Option[]>([]);
const classOptions = ref<Option[]>([]);
const semesterList = semesterOptions();

const formVisible = ref(false);
const detailVisible = ref(false);
const editingId = ref<number | null>(null);
const detailId = ref<number | null>(null);

const query = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
  semester: undefined as string | undefined,
  departmentId: undefined as number | undefined,
  teacherId: undefined as number | undefined,
  status: undefined as string | undefined,
});

function emptyForm() {
  return {
    offeringCode: '',
    courseId: undefined as number | undefined,
    teacherId: undefined as number | undefined,
    semester: semesters.value[0] ?? '2025-2026-1',
    classId: undefined as number | undefined,
    classroom: '',
    schedule: '',
    capacity: 60,
    status: '开放选课',
  };
}

const form = reactive(emptyForm());

async function load() {
  loading.value = true;
  try {
    const result = await offeringApi.list({ ...query });
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
  query.semester = undefined;
  query.departmentId = undefined;
  query.teacherId = undefined;
  query.status = undefined;
  handleSearch();
}

function openCreate() {
  editingId.value = null;
  Object.assign(form, emptyForm());
  form.offeringCode = `${String(form.semester).replace(/-/g, '').replace(/^(\d{4})(\d{4})/, '$1$2')}-${String(
    Date.now(),
  ).slice(-4)}`;
  formVisible.value = true;
}

function openEdit(row: Offering) {
  editingId.value = row.id;
  Object.assign(form, {
    offeringCode: row.offering_code,
    courseId: row.course_id,
    teacherId: row.teacher_id ?? undefined,
    semester: row.semester,
    classId: row.class_id ?? undefined,
    classroom: row.classroom ?? '',
    schedule: row.schedule ?? '',
    capacity: row.capacity,
    status: row.status,
  });
  formVisible.value = true;
}

function openDetail(id: number) {
  detailId.value = id;
  detailVisible.value = true;
}

async function handleSubmit() {
  if (!form.offeringCode.trim() || !form.courseId || !form.semester) {
    ElMessage.warning('请填写教学班编号、课程与学期');
    return;
  }
  const payload = {
    offeringCode: form.offeringCode.trim(),
    courseId: form.courseId,
    teacherId: form.teacherId ?? null,
    semester: form.semester,
    classId: form.classId ?? null,
    classroom: form.classroom || null,
    schedule: form.schedule || null,
    capacity: form.capacity,
    status: form.status,
  };

  saving.value = true;
  try {
    if (editingId.value) {
      await offeringApi.update(editingId.value, payload);
      ElMessage.success('教学班已保存');
    } else {
      await offeringApi.create(payload);
      ElMessage.success('教学班已创建');
    }
    formVisible.value = false;
    await load();
    semesters.value = await offeringApi.semesters();
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row: Offering) {
  try {
    await ElMessageBox.confirm(`确认删除教学班「${row.offering_code}」？其选课记录将一并删除。`, '删除教学班', {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch {
    return;
  }
  await offeringApi.remove(row.id);
  ElMessage.success('教学班已删除');
  load();
}

onMounted(async () => {
  const [semesterData, departments, teachers, courses, classes] = await Promise.all([
    offeringApi.semesters(),
    departmentApi.options(),
    teacherApi.options(),
    courseApi.options(),
    classApi.options(),
  ]);
  semesters.value = semesterData;
  departmentOptions.value = departments;
  teacherOptions.value = teachers;
  courseOptions.value = courses;
  classOptions.value = classes;
  await load();
});
</script>

<style scoped lang="scss">
.over-capacity {
  color: var(--c-warning);
  font-weight: 600;
}
</style>
