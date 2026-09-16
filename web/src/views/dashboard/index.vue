<template>
  <div class="page" v-loading="loading">
    <div class="page-head">
      <div>
        <div class="page-title">
          {{ greeting }}，{{ data?.greetingName || userStore.displayName }}
          <small class="t4" style="font-size: 12px; font-weight: 400; margin-left: 6px">dashboard</small>
        </div>
        <div class="page-desc">
          当前学期 <b class="t2">{{ data?.currentSemester || userStore.currentSemester || '—' }}</b>
          · 数据实时取自教务库
        </div>
      </div>
      <div class="page-actions">
        <el-button :icon="Refresh" @click="load">刷新数据</el-button>
      </div>
    </div>

    <!-- 核心指标 -->
    <div class="stat-grid" style="margin-bottom: 16px">
      <div v-for="card in statCards" :key="card.label" class="stat-card">
        <div class="stat-label">{{ card.label }}</div>
        <div class="stat-value" :style="{ color: card.color }">
          <CountUp :value="card.value" />
        </div>
        <div class="stat-foot">{{ card.foot }}</div>
        <div class="stat-icon" :style="{ background: card.bg, color: card.color }">
          <el-icon><component :is="card.icon" /></el-icon>
        </div>
      </div>
    </div>

    <!-- 待办提醒 -->
    <PanelCard title="教务待办" en="to-do">
      <div class="todo-grid">
        <div v-for="item in data?.todos ?? []" :key="item.label" class="todo-item">
          <el-tag :type="item.type as never" effect="light" size="small" round>
            {{ item.value }}
          </el-tag>
          <span class="t2">{{ item.label }}</span>
        </div>
      </div>
    </PanelCard>

    <!-- 图表区 -->
    <div class="chart-grid">
      <PanelCard title="各院系在读学生分布" en="students by department">
        <ChartBox :option="departmentOption" height="280px" />
      </PanelCard>
      <PanelCard title="分年级招生趋势" en="enrollment trend">
        <ChartBox :option="trendOption" height="280px" />
      </PanelCard>
      <PanelCard title="成绩分段分布" en="score distribution">
        <ChartBox :option="scoreOption" height="280px" />
      </PanelCard>
      <PanelCard title="学籍状态构成" en="status">
        <ChartBox :option="statusOption" height="280px" />
      </PanelCard>
      <PanelCard title="热门课程 Top 6" en="popular courses">
        <ChartBox :option="hotCourseOption" height="280px" />
      </PanelCard>
      <PanelCard title="教师开课量 Top 5" en="teacher workload">
        <ChartBox :option="teacherLoadOption" height="280px" />
      </PanelCard>
    </div>

    <!-- 最近入库学生 -->
    <PanelCard title="最近新增学生" en="recent students" subtitle="按入库时间倒序展示最新 6 条学籍记录">
      <el-table :data="data?.recentStudents ?? []" size="default" style="width: 100%">
        <el-table-column prop="student_no" label="学号" width="150" />
        <el-table-column prop="name" label="姓名" width="110" />
        <el-table-column prop="gender" label="性别" width="70" />
        <el-table-column prop="major_name" label="专业" min-width="180" show-overflow-tooltip />
        <el-table-column prop="class_name" label="班级" min-width="200" show-overflow-tooltip />
        <el-table-column prop="enroll_year" label="年级" width="90" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status)" size="small" effect="light">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </PanelCard>

    <div style="height: 16px" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { EChartsOption } from 'echarts';
import { Refresh } from '@element-plus/icons-vue';
import { dashboardApi } from '@/api';
import ChartBox from '@/components/ChartBox.vue';
import CountUp from '@/components/CountUp.vue';
import PanelCard from '@/components/PanelCard.vue';
import { useUserStore } from '@/stores/user';
import type { DashboardData } from '@/types';
import { statusTag } from '@/utils/dict';
import { formatNumber } from '@/utils/format';

const userStore = useUserStore();
const loading = ref(false);
const data = ref<DashboardData | null>(null);

const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour < 6) return '凌晨好';
  if (hour < 12) return '上午好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  return '晚上好';
});

const statCards = computed(() => {
  const stats = data.value?.stats;
  return [
    {
      label: '在校学生',
      value: stats?.activeStudents ?? 0,
      foot: `全部学籍 ${formatNumber(stats?.totalStudents ?? 0)} 人`,
      icon: 'User',
      color: '#2b6cf6',
      bg: '#eaf1ff',
    },
    {
      label: '专任教师',
      value: stats?.totalTeachers ?? 0,
      foot: `院系 ${stats?.totalDepartments ?? 0} 个 · 专业 ${stats?.totalMajors ?? 0} 个`,
      icon: 'Avatar',
      color: '#00b42a',
      bg: '#e8ffea',
    },
    {
      label: '开设课程',
      value: stats?.totalCourses ?? 0,
      foot: `教学班 ${formatNumber(stats?.totalOfferings ?? 0)} 个`,
      icon: 'Notebook',
      color: '#ff7d00',
      bg: '#fff7e8',
    },
    {
      label: '选课记录',
      value: stats?.enrollments ?? 0,
      foot: `平均分 ${stats?.avgScore ?? 0} · 及格率 ${stats?.passRate ?? 0}%`,
      icon: 'EditPen',
      color: '#7b61ff',
      bg: '#f2efff',
    },
  ];
});

const departmentOption = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: 8, right: 20, top: 20, bottom: 8, containLabel: true },
  xAxis: {
    type: 'category',
    data: (data.value?.charts.departmentDistribution ?? []).map((item) =>
      item.name.replace('学院', ''),
    ),
    axisLabel: { fontSize: 11, color: '#86909c', interval: 0, width: 60, overflow: 'break' },
    axisLine: { lineStyle: { color: '#e5e6eb' } },
  },
  yAxis: {
    type: 'value',
    splitLine: { lineStyle: { color: '#f2f3f5' } },
    axisLabel: { color: '#86909c' },
  },
  series: [
    {
      type: 'bar',
      data: (data.value?.charts.departmentDistribution ?? []).map((item) => item.value),
      barMaxWidth: 26,
      itemStyle: { color: '#2b6cf6', borderRadius: [4, 4, 0, 0] },
    },
  ],
}));

const trendOption = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 8, right: 20, top: 20, bottom: 8, containLabel: true },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: (data.value?.charts.enrollmentTrend ?? []).map((item) => item.name),
    axisLabel: { color: '#86909c' },
    axisLine: { lineStyle: { color: '#e5e6eb' } },
  },
  yAxis: {
    type: 'value',
    splitLine: { lineStyle: { color: '#f2f3f5' } },
    axisLabel: { color: '#86909c' },
  },
  series: [
    {
      type: 'line',
      smooth: true,
      symbolSize: 7,
      data: (data.value?.charts.enrollmentTrend ?? []).map((item) => item.value),
      itemStyle: { color: '#00b42a' },
      lineStyle: { width: 2.5, color: '#00b42a' },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(0,180,42,0.24)' },
            { offset: 1, color: 'rgba(0,180,42,0.02)' },
          ],
        },
      },
    },
  ],
}));

const scoreOption = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: 8, right: 20, top: 20, bottom: 8, containLabel: true },
  xAxis: {
    type: 'category',
    data: (data.value?.charts.scoreDistribution ?? []).map((item) => item.name),
    axisLabel: { color: '#86909c' },
    axisLine: { lineStyle: { color: '#e5e6eb' } },
  },
  yAxis: {
    type: 'value',
    splitLine: { lineStyle: { color: '#f2f3f5' } },
    axisLabel: { color: '#86909c' },
  },
  series: [
    {
      type: 'bar',
      barMaxWidth: 40,
      data: (data.value?.charts.scoreDistribution ?? []).map((item, index) => ({
        value: item.value,
        itemStyle: {
          color: ['#00b42a', '#2b6cf6', '#14c9c9', '#ff7d00', '#f53f3f'][index] ?? '#2b6cf6',
          borderRadius: [4, 4, 0, 0],
        },
      })),
      label: { show: true, position: 'top', color: '#4e5969', fontSize: 11 },
    },
  ],
}));

const statusOption = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'item', formatter: '{b}: {c} 人 ({d}%)' },
  legend: { bottom: 0, icon: 'circle', textStyle: { color: '#4e5969', fontSize: 12 } },
  color: ['#00b42a', '#ff7d00', '#86909c', '#f53f3f'],
  series: [
    {
      type: 'pie',
      radius: ['46%', '68%'],
      center: ['50%', '44%'],
      avoidLabelOverlap: true,
      itemStyle: { borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      data: (data.value?.charts.statusDistribution ?? []).map((item) => ({
        name: item.name,
        value: item.value,
      })),
    },
  ],
}));

const hotCourseOption = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: 8, right: 30, top: 10, bottom: 8, containLabel: true },
  xAxis: {
    type: 'value',
    splitLine: { lineStyle: { color: '#f2f3f5' } },
    axisLabel: { color: '#86909c' },
  },
  yAxis: {
    type: 'category',
    inverse: true,
    data: (data.value?.charts.hotCourses ?? []).map((item) => item.name),
    axisLabel: { color: '#4e5969', fontSize: 12 },
    axisLine: { lineStyle: { color: '#e5e6eb' } },
  },
  series: [
    {
      type: 'bar',
      barMaxWidth: 16,
      data: (data.value?.charts.hotCourses ?? []).map((item) => item.value),
      itemStyle: { color: '#7b61ff', borderRadius: [0, 4, 4, 0] },
      label: { show: true, position: 'right', color: '#86909c', fontSize: 11 },
    },
  ],
}));

const teacherLoadOption = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: 8, right: 30, top: 10, bottom: 8, containLabel: true },
  xAxis: {
    type: 'value',
    splitLine: { lineStyle: { color: '#f2f3f5' } },
    axisLabel: { color: '#86909c' },
  },
  yAxis: {
    type: 'category',
    inverse: true,
    data: (data.value?.charts.teacherLoad ?? []).map((item) => item.name),
    axisLabel: { color: '#4e5969', fontSize: 12 },
    axisLine: { lineStyle: { color: '#e5e6eb' } },
  },
  series: [
    {
      type: 'bar',
      barMaxWidth: 16,
      data: (data.value?.charts.teacherLoad ?? []).map((item) => item.value),
      itemStyle: { color: '#00b42a', borderRadius: [0, 4, 4, 0] },
      label: { show: true, position: 'right', color: '#86909c', fontSize: 11 },
    },
  ],
}));

async function load() {
  loading.value = true;
  try {
    data.value = await dashboardApi.overview();
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped lang="scss">
.todo-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
@media (max-width: 1100px) {
  .todo-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.todo-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid var(--c-border-light);
  border-radius: var(--radius);
  background: #fcfcfd;
  font-size: 13px;
}

.chart-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 16px;

  :deep(.panel) {
    margin-top: 0;
  }
}
@media (max-width: 1100px) {
  .chart-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
