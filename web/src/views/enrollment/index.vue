<template>
  <div class="page">
    <div class="page-head">
      <div>
        <div class="page-title">选课与成绩 <small class="t4" style="font-size: 12px; font-weight: 400">enrollments &amp; scores</small></div>
        <div class="page-desc">选课名单查询与成绩录入，支持直接修改成绩后批量保存</div>
      </div>
      <div class="page-actions">
        <el-button :icon="RefreshLeft" @click="load">刷新</el-button>
      </div>
    </div>

    <!-- 概览 -->
    <div class="stat-grid" style="margin-bottom: 16px">
      <div class="stat-card">
        <div class="stat-label">选课总记录</div>
        <div class="stat-value">{{ formatNumber(overview?.total ?? 0) }}</div>
        <div class="stat-foot">覆盖全部学期</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">已录入成绩</div>
        <div class="stat-value" style="color: #00b42a">{{ formatNumber(overview?.scored ?? 0) }}</div>
        <div class="stat-foot">成绩录入进度 {{ progress }}%</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">待录入成绩</div>
        <div class="stat-value" style="color: #ff7d00">{{ formatNumber(overview?.unscored ?? 0) }}</div>
        <div class="stat-foot">含本学期新开课程</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">总体平均分</div>
        <div class="stat-value" style="color: #2b6cf6">{{ overview?.avgScore ?? 0 }}</div>
        <div class="stat-foot">已录入成绩样本</div>
      </div>
    </div>

    <PanelCard>
      <div class="toolbar">
        <el-input
          v-model="query.keyword"
          placeholder="搜索学号 / 姓名 / 课程"
          :prefix-icon="Search"
          clearable
          style="width: 250px"
          @keydown.enter="handleSearch"
        />
        <el-select v-model="query.semester" placeholder="全部学期" clearable style="width: 150px" @change="handleSearch">
          <el-option v-for="item in semesters" :key="item" :label="item" :value="item" />
        </el-select>
        <el-select v-model="query.teacherId" placeholder="授课教师" clearable filterable style="width: 160px" @change="handleSearch">
          <el-option v-for="item in teacherOptions" :key="item.id" :label="`${item.teacher_no} ${item.name}`" :value="item.id" />
        </el-select>
        <el-select v-model="query.scoreState" placeholder="成绩状态" clearable style="width: 130px" @change="handleSearch">
          <el-option label="已录入" value="已录入" />
          <el-option label="未录入" value="未录入" />
        </el-select>
        <el-checkbox v-model="onlyFail" @change="handleSearch">仅看不及格</el-checkbox>
        <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
        <el-button :icon="RefreshLeft" @click="handleReset">重置</el-button>

        <div class="toolbar-right">
          <span v-if="dirtyCount" class="t3" style="font-size: 12px">
            待保存 {{ dirtyCount }} 条
          </span>
          <el-button type="primary" :loading="saving" :disabled="!dirtyCount" :icon="Check" @click="saveScores">
            保存成绩
          </el-button>
        </div>
      </div>

      <el-table v-loading="loading" :data="list" style="width: 100%">
        <el-table-column prop="student_no" label="学号" width="138" fixed>
          <template #default="{ row }"><span class="mono">{{ row.student_no }}</span></template>
        </el-table-column>
        <el-table-column prop="student_name" label="姓名" width="86" />
        <el-table-column prop="class_name" label="班级" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">{{ row.class_name || '—' }}</template>
        </el-table-column>
        <el-table-column prop="course_name" label="课程" min-width="140" show-overflow-tooltip />
        <el-table-column prop="semester" label="学期" width="112" />
        <el-table-column prop="teacher_name" label="教师" width="88">
          <template #default="{ row }">{{ row.teacher_name || '—' }}</template>
        </el-table-column>
        <el-table-column prop="credit" label="学分" width="62" align="center" />
        <el-table-column label="成绩" width="136" align="center">
          <template #default="{ row }">
            <el-input-number
              v-model="row.score"
              :min="0"
              :max="100"
              :precision="1"
              size="small"
              controls-position="right"
              style="width: 116px"
              placeholder="未录入"
            />
          </template>
        </el-table-column>
        <el-table-column label="等级 / 绩点" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="scoreLevel(row.score).type" size="small" effect="light">
              {{ scoreLevel(row.score).text }}
            </el-tag>
            <span class="mono t3" style="margin-left: 6px">{{ toGradePoint(row.score) ?? '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="考试类型" width="112">
          <template #default="{ row }">
            <el-select v-model="row.exam_type" size="small">
              <el-option v-for="item in EXAM_TYPES" :key="item" :label="item" :value="item" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="86" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.select_status)" size="small" effect="light">{{ row.select_status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="76" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="danger" @click="handleDrop(row)">退选</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="没有符合条件的选课记录" :image-size="90" />
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

    <FormFooterBar
      :dirty="dirtyCount > 0"
      :loading="saving"
      :latest-text="`成绩数据已是最新（待录入 ${overview?.unscored ?? 0} 条）`"
      @save="saveScores"
      @reset="load"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Check, RefreshLeft, Search } from '@element-plus/icons-vue';
import { enrollmentApi, offeringApi, teacherApi } from '@/api';
import FormFooterBar from '@/components/FormFooterBar.vue';
import PanelCard from '@/components/PanelCard.vue';
import type { Enrollment, Option } from '@/types';
import { EXAM_TYPES, scoreLevel, statusTag } from '@/utils/dict';
import { formatNumber } from '@/utils/format';

const loading = ref(false);
const saving = ref(false);
const list = ref<Enrollment[]>([]);
const total = ref(0);
const semesters = ref<string[]>([]);
const teacherOptions = ref<Option[]>([]);
const onlyFail = ref(false);
const overview = ref<{
  total: number;
  scored: number;
  unscored: number;
  avgScore: number;
} | null>(null);

/** 成绩快照：与当前编辑值比对即可判断哪些行被改动过（不依赖组件的 change 事件） */
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

const dirtyItems = computed(() =>
  list.value.filter((row) => {
    const base = baseline.value.get(row.id);
    if (!base) return false;
    return base.score !== normalizeScore(row.score) || base.examType !== row.exam_type;
  }),
);

const dirtyCount = computed(() => dirtyItems.value.length);

const progress = computed(() => {
  if (!overview.value?.total) return 0;
  return Math.round((overview.value.scored / overview.value.total) * 100);
});

/** 与后端保持一致的绩点换算 */
function toGradePoint(score: number | null | undefined): number | null {
  if (score === null || score === undefined) return null;
  const value = Number(score);
  if (value >= 90) return 4;
  if (value >= 85) return 3.7;
  if (value >= 82) return 3.3;
  if (value >= 78) return 3;
  if (value >= 75) return 2.7;
  if (value >= 72) return 2.3;
  if (value >= 68) return 2;
  if (value >= 64) return 1.5;
  if (value >= 60) return 1;
  return 0;
}

const query = reactive({
  page: 1,
  pageSize: 20,
  keyword: '',
  semester: undefined as string | undefined,
  teacherId: undefined as number | undefined,
  scoreState: undefined as string | undefined,
});

async function load() {
  loading.value = true;
  try {
    const [page, over] = await Promise.all([
      enrollmentApi.list({ ...query, onlyFail: onlyFail.value ? 1 : undefined }),
      enrollmentApi.overview(),
    ]);
    list.value = page.list;
    total.value = page.total;
    overview.value = over;
    // 记录本轮的服务端数据基线，用于比对未保存的改动
    baseline.value = new Map(
      page.list.map((row) => [
        row.id,
        { score: normalizeScore(row.score), examType: row.exam_type },
      ]),
    );
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
  query.teacherId = undefined;
  query.scoreState = undefined;
  onlyFail.value = false;
  handleSearch();
}

async function saveScores() {
  const items = dirtyItems.value.map((row) => ({
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
  } finally {
    saving.value = false;
  }
}

async function handleDrop(row: Enrollment) {
  try {
    await ElMessageBox.confirm(
      `确认将「${row.student_name}」的《${row.course_name}》选课记录退选？`,
      '退选',
      { confirmButtonText: '确认退选', cancelButtonText: '取消', type: 'warning' },
    );
  } catch {
    return;
  }
  await enrollmentApi.drop(row.id);
  ElMessage.success('已退选');
  load();
}

onMounted(async () => {
  const [semesterData, teachers] = await Promise.all([offeringApi.semesters(), teacherApi.options()]);
  semesters.value = semesterData;
  teacherOptions.value = teachers;
  await load();
});
</script>
