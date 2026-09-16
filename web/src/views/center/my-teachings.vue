<template>
  <div class="page">
    <div class="page-head">
      <div>
        <div class="page-title">我的授课 <small class="t4" style="font-size: 12px; font-weight: 400">my teaching</small></div>
        <div class="page-desc">本人承担的教学班与成绩录入进度</div>
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
        <div class="stat-label">教学班数量</div>
        <div class="stat-value">{{ list.length }}</div>
        <div class="stat-foot">{{ semester || '全部学期' }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">选课学生总数</div>
        <div class="stat-value" style="color: #2b6cf6">
          {{ list.reduce((sum, item) => sum + Number(item.student_count ?? 0), 0) }}
        </div>
        <div class="stat-foot">按教学班汇总</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">已录入成绩</div>
        <div class="stat-value" style="color: #00b42a">
          {{ list.reduce((sum, item) => sum + Number(item.scored_count ?? 0), 0) }}
        </div>
        <div class="stat-foot">已完成录入的选课记录</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">待录入成绩</div>
        <div class="stat-value" style="color: #ff7d00">
          {{
            list.reduce(
              (sum, item) => sum + Number(item.student_count ?? 0) - Number(item.scored_count ?? 0),
              0,
            )
          }}
        </div>
        <div class="stat-foot">点击右侧「录入成绩」处理</div>
      </div>
    </div>

    <PanelCard title="授课教学班" en="offerings">
      <el-table v-loading="loading" :data="list" style="width: 100%">
        <el-table-column prop="offering_code" label="教学班编号" width="150">
          <template #default="{ row }"><span class="mono">{{ row.offering_code }}</span></template>
        </el-table-column>
        <el-table-column prop="course_name" label="课程名称" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.course_name }}
            <el-tag size="small" effect="plain" type="info" style="margin-left: 6px">{{ row.course_type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="semester" label="学期" width="130" />
        <el-table-column prop="class_name" label="面向班级" min-width="190" show-overflow-tooltip>
          <template #default="{ row }">{{ row.class_name || '全校选修' }}</template>
        </el-table-column>
        <el-table-column prop="schedule" label="上课时间" width="140" />
        <el-table-column prop="classroom" label="教室" width="120" />
        <el-table-column label="选课人数" width="100" align="center">
          <template #default="{ row }">{{ row.student_count }} / {{ row.capacity }}</template>
        </el-table-column>
        <el-table-column label="成绩进度" width="180">
          <template #default="{ row }">
            <el-progress
              :percentage="
                Number(row.student_count)
                  ? Math.round((Number(row.scored_count) / Number(row.student_count)) * 100)
                  : 0
              "
              :stroke-width="8"
              :color="Number(row.scored_count) === Number(row.student_count) ? '#00b42a' : '#2b6cf6'"
            />
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status)" size="small" effect="light">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openScores(Number(row.id))">录入成绩</el-button>
          </template>
        </el-table-column>
        <template #empty><el-empty description="暂无授课安排" :image-size="90" /></template>
      </el-table>
    </PanelCard>

    <OfferingDetailDrawer v-model="drawerVisible" :offering-id="offeringId" @changed="load" />
    <div style="height: 16px" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RefreshLeft } from '@element-plus/icons-vue';
import { enrollmentApi } from '@/api';
import PanelCard from '@/components/PanelCard.vue';
import OfferingDetailDrawer from '@/views/offering/OfferingDetailDrawer.vue';
import { statusTag } from '@/utils/dict';

const loading = ref(false);
const list = ref<Record<string, unknown>[]>([]);
const semesters = ref<string[]>([]);
const semester = ref<string | undefined>(undefined);
const drawerVisible = ref(false);
const offeringId = ref<number | null>(null);

async function load() {
  loading.value = true;
  try {
    const result = await enrollmentApi.myTeachings(semester.value);
    list.value = result.list;
    semesters.value = result.semesters;
  } finally {
    loading.value = false;
  }
}

function openScores(id: number) {
  offeringId.value = id;
  drawerVisible.value = true;
}

onMounted(load);
</script>
