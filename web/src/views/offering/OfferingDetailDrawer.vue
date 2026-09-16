<template>
  <el-drawer
    :model-value="modelValue"
    title="教学班名单与成绩录入"
    size="920px"
    @update:model-value="emit('update:modelValue', $event)"
    @open="load"
  >
    <div v-loading="loading">
      <template v-if="detail">
        <!-- 教学班信息 -->
        <div class="offering-head">
          <div class="head-main">
            <div class="head-title">
              {{ detail.course_name }}
              <el-tag size="small" effect="plain" type="info">{{ detail.course_type }}</el-tag>
              <el-tag :type="statusTag(detail.status)" size="small" effect="light">{{ detail.status }}</el-tag>
            </div>
            <div class="head-sub t3">
              <span class="mono">{{ detail.offering_code }}</span>
              <el-divider direction="vertical" />
              <span>{{ detail.semester }}</span>
              <el-divider direction="vertical" />
              <span>{{ detail.teacher_name || '未安排教师' }}</span>
              <el-divider direction="vertical" />
              <span>{{ detail.classroom || '未安排教室' }} · {{ detail.schedule || '时间待定' }}</span>
            </div>
          </div>
          <div class="head-actions">
            <el-button size="small" :icon="Plus" @click="addVisible = true">添加学生</el-button>
            <el-button
              size="small"
              type="primary"
              :loading="saving"
              :disabled="!dirtyCount"
              @click="saveScores"
            >
              保存成绩{{ dirtyCount ? `（${dirtyCount}）` : '' }}
            </el-button>
          </div>
        </div>

        <!-- 统计 -->
        <div class="mini-stats">
          <div class="mini-stat">
            <div class="label">选课人数 / 容量</div>
            <div class="value">{{ detail.summary.enrolled }} / {{ detail.capacity }}</div>
          </div>
          <div class="mini-stat">
            <div class="label">已录成绩</div>
            <div class="value">{{ detail.summary.scoredCount }}</div>
          </div>
          <div class="mini-stat">
            <div class="label">平均分</div>
            <div class="value">{{ detail.summary.avgScore }}</div>
          </div>
          <div class="mini-stat">
            <div class="label">最高 / 最低</div>
            <div class="value">{{ detail.summary.maxScore }} / {{ detail.summary.minScore }}</div>
          </div>
          <div class="mini-stat">
            <div class="label">及格率</div>
            <div class="value">{{ detail.summary.passRate }}%</div>
          </div>
        </div>

        <el-alert
          v-if="unscoredCount"
          :title="`还有 ${unscoredCount} 名学生未录入成绩，可直接在下方表格填写后点击「保存成绩」`"
          type="warning"
          :closable="false"
          show-icon
          style="margin-bottom: 12px"
        />

        <!-- 名单 + 成绩录入 -->
        <el-table :data="roster" size="small" max-height="440">
          <el-table-column type="index" label="#" width="50" />
          <el-table-column prop="student_no" label="学号" width="140">
            <template #default="{ row }"><span class="mono">{{ row.student_no }}</span></template>
          </el-table-column>
          <el-table-column prop="student_name" label="姓名" width="100" />
          <el-table-column prop="gender" label="性别" width="66" align="center" />
          <el-table-column prop="class_name" label="班级" min-width="180" show-overflow-tooltip />
          <el-table-column label="成绩（0-100）" width="170" align="center">
            <template #default="{ row }">
              <el-input-number
                v-model="row.score"
                :min="0"
                :max="100"
                :precision="1"
                :step="1"
                size="small"
                controls-position="right"
                style="width: 130px"
                placeholder="未录入"
              />
            </template>
          </el-table-column>
          <el-table-column label="等级" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="scoreLevel(row.score).type" size="small" effect="light">
                {{ scoreLevel(row.score).text }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="考试类型" width="130">
            <template #default="{ row }">
              <el-select v-model="row.exam_type" size="small">
                <el-option v-for="item in EXAM_TYPES" :key="item" :label="item" :value="item" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="80" align="center">
            <template #default="{ row }">
              <el-button link type="danger" @click="handleDrop(row)">移除</el-button>
            </template>
          </el-table-column>
          <template #empty><el-empty description="该教学班暂无学生" :image-size="80" /></template>
        </el-table>

        <FormFooterBar
          :dirty="dirtyCount > 0"
          :loading="saving"
          :latest-text="`成绩已是最新（共 ${detail.summary.scoredCount} 条）`"
          @save="saveScores"
          @reset="load"
        />
      </template>
    </div>

    <!-- 添加学生 -->
    <el-dialog v-model="addVisible" title="添加学生到教学班" width="620px" append-to-body>
      <div class="field">
        <div class="field-label">按班级筛选 <span class="en">filter by class</span></div>
        <el-select
          v-model="pickerClassId"
          placeholder="选择班级后可批量勾选学生"
          filterable
          clearable
          style="width: 100%"
          @change="loadPickerStudents"
        >
          <el-option v-for="item in classOptions" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </div>

      <el-table
        :data="pickerStudents"
        size="small"
        max-height="320"
        @selection-change="handlePickerSelection"
      >
        <el-table-column type="selection" width="46" />
        <el-table-column prop="student_no" label="学号" width="150" />
        <el-table-column prop="name" label="姓名" width="110" />
        <el-table-column prop="status" label="学籍状态" width="100" />
        <template #empty><el-empty description="请先选择班级" :image-size="70" /></template>
      </el-table>

      <template #footer>
        <el-button @click="addVisible = false">取消</el-button>
        <el-button type="primary" :loading="adding" :disabled="!pickerSelection.length" @click="submitAdd">
          添加 {{ pickerSelection.length }} 名学生
        </el-button>
      </template>
    </el-dialog>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { classApi, enrollmentApi, offeringApi, studentApi } from '@/api';
import FormFooterBar from '@/components/FormFooterBar.vue';
import type { OfferingDetail, Option, RosterRow, Student } from '@/types';
import { EXAM_TYPES, scoreLevel, statusTag } from '@/utils/dict';

const props = defineProps<{ modelValue: boolean; offeringId: number | null }>();
const emit = defineEmits<{ 'update:modelValue': [boolean]; changed: [] }>();

const loading = ref(false);
const saving = ref(false);
const adding = ref(false);
const detail = ref<OfferingDetail | null>(null);
const roster = ref<RosterRow[]>([]);

const addVisible = ref(false);
const pickerClassId = ref<number | undefined>(undefined);
const pickerStudents = ref<Student[]>([]);
const pickerSelection = ref<{ id: number }[]>([]);
const classOptions = ref<Option[]>([]);

/** 成绩基线快照：与当前编辑值比对判断未保存改动，不依赖组件的 change 事件 */
interface ScoreSnapshot {
  score: number | null;
  examType: string;
}
const baseline = ref<Map<number, ScoreSnapshot>>(new Map());

function normalizeScore(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const dirtyRows = computed(() =>
  roster.value.filter((row) => {
    const base = baseline.value.get(row.id);
    if (!base) return false;
    return base.score !== normalizeScore(row.score) || base.examType !== row.exam_type;
  }),
);

const dirtyCount = computed(() => dirtyRows.value.length);
const unscoredCount = computed(() => roster.value.filter((row) => row.score === null || row.score === undefined).length);

function handlePickerSelection(rows: { id: number }[]) {
  pickerSelection.value = rows;
}

async function load() {
  if (!props.offeringId) return;
  loading.value = true;
  try {
    detail.value = await offeringApi.detail(props.offeringId);
    roster.value = detail.value.roster;
    baseline.value = new Map(
      detail.value.roster.map((row) => [
        row.id,
        { score: normalizeScore(row.score), examType: row.exam_type },
      ]),
    );
  } finally {
    loading.value = false;
  }
}

async function saveScores() {
  const items = dirtyRows.value.map((row) => ({
    id: row.id,
    score: normalizeScore(row.score),
    examType: row.exam_type,
  }));

  if (!items.length) {
    ElMessage.info('没有需要保存的成绩');
    return;
  }

  saving.value = true;
  try {
    const result = await enrollmentApi.batchScore(items);
    ElMessage.success(`已保存 ${result.updated} 条成绩`);
    await load();
    emit('changed');
  } finally {
    saving.value = false;
  }
}

async function handleDrop(row: RosterRow) {
  try {
    await ElMessageBox.confirm(`确认将「${row.student_name}」移出本教学班？`, '移除学生', {
      confirmButtonText: '确认移除',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch {
    return;
  }
  await enrollmentApi.drop(row.id);
  ElMessage.success('已移出教学班');
  await load();
  emit('changed');
}

async function loadPickerStudents() {
  pickerSelection.value = [];
  if (!pickerClassId.value) {
    pickerStudents.value = [];
    return;
  }
  const result = await studentApi.list({ classId: pickerClassId.value, pageSize: 200, status: '在读' });
  const existing = new Set(roster.value.map((row) => row.student_id));
  pickerStudents.value = result.list.filter((item) => !existing.has(item.id));
}

async function submitAdd() {
  if (!props.offeringId) return;
  adding.value = true;
  try {
    const result = await offeringApi.addStudents(
      props.offeringId,
      pickerSelection.value.map((item) => item.id),
    );
    ElMessage.success(`已添加 ${result.added} 名学生`);
    addVisible.value = false;
    pickerClassId.value = undefined;
    pickerStudents.value = [];
    await load();
    emit('changed');
  } finally {
    adding.value = false;
  }
}

/** 打开「添加学生」时按需加载班级下拉 */
watch(addVisible, async (visible) => {
  if (visible && !classOptions.value.length) {
    classOptions.value = await classApi.options();
  }
});
</script>

<style scoped lang="scss">
.offering-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px;
  border: 1px solid var(--c-border-light);
  border-radius: var(--radius-lg);
  background: linear-gradient(180deg, #f7faff 0%, #ffffff 100%);
}
.head-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 17px;
  font-weight: 600;
}
.head-sub {
  margin-top: 6px;
  font-size: 12px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}
.mini-stats {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin: 14px 0;
}
.mini-stat {
  padding: 12px 14px;
  border: 1px solid var(--c-border-light);
  border-radius: var(--radius);
  background: #fcfcfd;

  .label {
    font-size: 12px;
    color: var(--c-text-3);
  }
  .value {
    margin-top: 6px;
    font-size: 19px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
}
</style>
