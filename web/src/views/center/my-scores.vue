<template>
  <div class="page">
    <div class="page-head">
      <div>
        <div class="page-title">我的成绩 <small class="t4" style="font-size: 12px; font-weight: 400">my scores</small></div>
        <div class="page-desc">已公布成绩的课程与绩点统计（4.0 绩点制）</div>
      </div>
      <div class="page-actions">
        <el-button :icon="RefreshLeft" @click="load">刷新</el-button>
      </div>
    </div>

    <div class="stat-grid" style="margin-bottom: 16px">
      <div class="stat-card">
        <div class="stat-label">平均绩点 GPA</div>
        <div class="stat-value" style="color: #2b6cf6">{{ summary?.gpa ?? 0 }}</div>
        <div class="stat-foot">加权平均，含全部已出成绩课程</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">已获学分</div>
        <div class="stat-value" style="color: #00b42a">{{ summary?.passedCredit ?? 0 }}</div>
        <div class="stat-foot">选课总学分 {{ summary?.totalCredit ?? 0 }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">平均分</div>
        <div class="stat-value">{{ summary?.avgScore ?? 0 }}</div>
        <div class="stat-foot">共 {{ summary?.courseCount ?? 0 }} 门课程</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">不及格门数</div>
        <div class="stat-value" :style="{ color: summary?.failCount ? '#f53f3f' : '#00b42a' }">
          {{ summary?.failCount ?? 0 }}
        </div>
        <div class="stat-foot">{{ summary?.failCount ? '请及时关注补考安排' : '全部通过，继续保持' }}</div>
      </div>
    </div>

    <PanelCard title="成绩单" en="transcript" subtitle="按学期倒序排列">
      <el-table v-loading="loading" :data="list" style="width: 100%">
        <el-table-column prop="semester" label="学期" width="130" />
        <el-table-column prop="course_code" label="课程代码" width="110">
          <template #default="{ row }"><span class="mono">{{ row.course_code }}</span></template>
        </el-table-column>
        <el-table-column prop="course_name" label="课程名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="course_type" label="类型" width="86" align="center" />
        <el-table-column prop="credit" label="学分" width="70" align="center" />
        <el-table-column prop="teacher_name" label="任课教师" width="110">
          <template #default="{ row }">{{ row.teacher_name || '—' }}</template>
        </el-table-column>
        <el-table-column label="成绩" width="100" align="center">
          <template #default="{ row }">
            <b :class="{ 'score-fail': Number(row.score) < 60 }">{{ formatScore(row.score) }}</b>
          </template>
        </el-table-column>
        <el-table-column label="绩点" width="90" align="center">
          <template #default="{ row }">
            <span class="mono">{{ Number(row.grade_point).toFixed(1) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="等级" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="scoreLevel(row.score).type" size="small" effect="light">
              {{ scoreLevel(row.score).text }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="exam_type" label="考试类型" width="110" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.exam_type !== '正常考试'" size="small" effect="plain" type="warning">
              {{ row.exam_type }}
            </el-tag>
            <span v-else class="t3">{{ row.exam_type }}</span>
          </template>
        </el-table-column>
        <template #empty><el-empty description="暂无已公布的成绩" :image-size="90" /></template>
      </el-table>
    </PanelCard>

    <div style="height: 16px" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RefreshLeft } from '@element-plus/icons-vue';
import { enrollmentApi } from '@/api';
import PanelCard from '@/components/PanelCard.vue';
import { scoreLevel } from '@/utils/dict';
import { formatScore } from '@/utils/format';

interface ScoreSummary {
  courseCount: number;
  passedCredit: number;
  totalCredit: number;
  gpa: number;
  avgScore: number;
  failCount: number;
}

const loading = ref(false);
const list = ref<Record<string, unknown>[]>([]);
const summary = ref<ScoreSummary | null>(null);

async function load() {
  loading.value = true;
  try {
    const result = await enrollmentApi.myScores();
    list.value = result.list;
    summary.value = result.summary;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped lang="scss">
.score-fail {
  color: var(--c-danger);
}
</style>
