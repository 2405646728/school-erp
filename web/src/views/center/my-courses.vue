<template>
  <div class="page">
    <div class="page-head">
      <div>
        <div class="page-title">我的课程 <small class="t4" style="font-size: 12px; font-weight: 400">my courses</small></div>
        <div class="page-desc">本学期及历史学期的选课记录与上课安排</div>
      </div>
      <div class="page-actions">
        <el-select v-model="semester" placeholder="全部学期" clearable style="width: 170px" @change="load">
          <el-option v-for="item in semesters" :key="item" :label="item" :value="item" />
        </el-select>
        <el-button :icon="RefreshLeft" @click="load">刷新</el-button>
      </div>
    </div>

    <div class="stat-grid" style="margin-bottom: 16px">
      <div class="stat-card">
        <div class="stat-label">已选课程</div>
        <div class="stat-value">{{ list.length }}</div>
        <div class="stat-foot">{{ semester || '全部学期' }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">累计学分</div>
        <div class="stat-value" style="color: #2b6cf6">{{ totalCredit }}</div>
        <div class="stat-foot">按已选课程统计</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">已出成绩</div>
        <div class="stat-value" style="color: #00b42a">
          {{ list.filter((item) => item.score !== null && item.score !== undefined).length }}
        </div>
        <div class="stat-foot">未出成绩 {{ list.filter((item) => item.score === null).length }} 门</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">待修学分</div>
        <div class="stat-value" style="color: #ff7d00">
          {{
            list
              .filter((item) => item.score === null || item.score === undefined)
              .reduce((sum, item) => sum + Number(item.credit ?? 0), 0)
              .toFixed(1)
          }}
        </div>
        <div class="stat-foot">成绩未公布</div>
      </div>
    </div>

    <PanelCard title="选课明细" en="enrollment detail">
      <el-table v-loading="loading" :data="list" style="width: 100%">
        <el-table-column prop="semester" label="学期" width="130" />
        <el-table-column prop="course_code" label="课程代码" width="110">
          <template #default="{ row }"><span class="mono">{{ row.course_code }}</span></template>
        </el-table-column>
        <el-table-column prop="course_name" label="课程名称" min-width="180" show-overflow-tooltip />
        <el-table-column prop="course_type" label="类型" width="86" align="center">
          <template #default="{ row }">
            <el-tag size="small" effect="light" :type="row.course_type === '必修' ? 'primary' : 'info'">
              {{ row.course_type }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="credit" label="学分" width="70" align="center" />
        <el-table-column prop="teacher_name" label="任课教师" width="110">
          <template #default="{ row }">{{ row.teacher_name || '—' }}</template>
        </el-table-column>
        <el-table-column prop="schedule" label="上课时间" width="140">
          <template #default="{ row }">{{ row.schedule || '—' }}</template>
        </el-table-column>
        <el-table-column prop="classroom" label="教室" width="120">
          <template #default="{ row }">{{ row.classroom || '—' }}</template>
        </el-table-column>
        <el-table-column label="成绩" width="110" align="center">
          <template #default="{ row }">
            <span v-if="row.score === null || row.score === undefined" class="t4">未公布</span>
            <el-tag v-else :type="scoreLevel(row.score).type" size="small" effect="light">
              {{ formatScore(row.score) }} · {{ scoreLevel(row.score).text }}
            </el-tag>
          </template>
        </el-table-column>
        <template #empty><el-empty description="当前学期没有选课记录" :image-size="90" /></template>
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

const loading = ref(false);
const list = ref<Record<string, unknown>[]>([]);
const semesters = ref<string[]>([]);
const semester = ref<string | undefined>(undefined);
const totalCredit = ref(0);

async function load() {
  loading.value = true;
  try {
    const result = await enrollmentApi.myCourses(semester.value);
    list.value = result.list;
    semesters.value = result.semesters;
    totalCredit.value = result.totalCredit;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>
