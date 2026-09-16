<template>
  <el-drawer
    :model-value="modelValue"
    title="学生档案详情"
    size="860px"
    @update:model-value="emit('update:modelValue', $event)"
    @open="load"
  >
    <div v-loading="loading">
      <template v-if="detail">
        <!-- 头部档案卡 -->
        <div class="profile-head">
          <div class="avatar">{{ detail.name.slice(0, 1) }}</div>
          <div class="profile-main">
            <div class="profile-name">
              {{ detail.name }}
              <el-tag :type="statusTag(detail.status)" size="small" effect="light">{{ detail.status }}</el-tag>
              <el-tag size="small" effect="plain" type="info">{{ detail.gender }}</el-tag>
            </div>
            <div class="profile-sub t3">
              <span class="mono">{{ detail.student_no }}</span>
              <el-divider direction="vertical" />
              <span>{{ detail.department_name || '—' }}</span>
              <el-divider direction="vertical" />
              <span>{{ detail.major_name || '—' }}</span>
              <el-divider direction="vertical" />
              <span>{{ detail.class_name || '未分班' }}</span>
            </div>
          </div>
          <div class="profile-actions">
            <el-button size="small" :icon="EditPen" @click="emit('edit', detail.id)">编辑档案</el-button>
            <el-button size="small" :icon="Key" @click="handleResetPassword">重置密码</el-button>
          </div>
        </div>

        <!-- 学业概览 -->
        <div class="mini-stats">
          <div class="mini-stat">
            <div class="label">已选课程</div>
            <div class="value">{{ detail.summary.courseCount }}</div>
          </div>
          <div class="mini-stat">
            <div class="label">已录入成绩</div>
            <div class="value">{{ detail.summary.scoredCount }}</div>
          </div>
          <div class="mini-stat">
            <div class="label">已获学分</div>
            <div class="value">{{ detail.summary.totalCredit }}</div>
          </div>
          <div class="mini-stat">
            <div class="label">平均分</div>
            <div class="value">{{ detail.summary.avgScore }}</div>
          </div>
          <div class="mini-stat">
            <div class="label">不及格门数</div>
            <div class="value" :style="{ color: detail.summary.failCount ? '#f53f3f' : undefined }">
              {{ detail.summary.failCount }}
            </div>
          </div>
        </div>

        <!-- 基本信息 -->
        <PanelCard title="基本信息" en="basic profile">
          <el-descriptions :column="3" border size="small">
            <el-descriptions-item label="学号">{{ detail.student_no }}</el-descriptions-item>
            <el-descriptions-item label="姓名">{{ detail.name }}</el-descriptions-item>
            <el-descriptions-item label="性别">{{ detail.gender }}</el-descriptions-item>
            <el-descriptions-item label="出生日期">{{ formatDate(detail.birth_date) }}</el-descriptions-item>
            <el-descriptions-item label="身份证号">
              <span class="mono">{{ detail.id_card || '—' }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="政治面貌">{{ detail.political_status }}</el-descriptions-item>
            <el-descriptions-item label="民族">{{ detail.ethnicity || '—' }}</el-descriptions-item>
            <el-descriptions-item label="籍贯">{{ detail.native_place || '—' }}</el-descriptions-item>
            <el-descriptions-item label="入学年份">{{ detail.enroll_year }} 年</el-descriptions-item>
            <el-descriptions-item label="手机号">
              <span class="mono">{{ detail.phone || '—' }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="邮箱">{{ detail.email || '—' }}</el-descriptions-item>
            <el-descriptions-item label="宿舍">{{ detail.dormitory || '—' }}</el-descriptions-item>
            <el-descriptions-item label="监护人">
              {{ detail.guardian_name || '—' }} {{ detail.guardian_phone ? `(${detail.guardian_phone})` : '' }}
            </el-descriptions-item>
            <el-descriptions-item label="家庭住址" :span="2">{{ detail.address || '—' }}</el-descriptions-item>
            <el-descriptions-item label="登录账号" :span="3">
              <template v-if="detail.account">
                <span class="mono">{{ detail.account.username }}</span>
                <el-tag :type="statusTag(detail.account.status)" size="small" effect="light" style="margin-left: 8px">
                  {{ detail.account.status }}
                </el-tag>
                <span class="t4" style="margin-left: 10px">
                  最近登录：{{ formatDate(detail.account.last_login_at, true) }}
                </span>
              </template>
              <span v-else class="t4">未开通登录账号</span>
            </el-descriptions-item>
          </el-descriptions>
        </PanelCard>

        <!-- 成绩单 -->
        <PanelCard title="成绩单" en="transcript" :subtitle="`共 ${detail.transcript.length} 条选课记录`">
          <el-table :data="detail.transcript" size="small" max-height="420">
            <el-table-column prop="semester" label="学期" width="120" />
            <el-table-column prop="course_code" label="课程代码" width="100" />
            <el-table-column prop="course_name" label="课程名称" min-width="160" show-overflow-tooltip />
            <el-table-column prop="credit" label="学分" width="70" align="center" />
            <el-table-column prop="course_type" label="类型" width="80" align="center" />
            <el-table-column prop="teacher_name" label="任课教师" width="100" />
            <el-table-column label="成绩" width="90" align="center">
              <template #default="{ row }">
                <span :class="{ 'score-fail': row.score !== null && row.score < 60 }">
                  {{ formatScore(row.score) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="等级" width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="scoreLevel(row.score).type" size="small" effect="light">
                  {{ scoreLevel(row.score).text }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </PanelCard>
      </template>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { EditPen, Key } from '@element-plus/icons-vue';
import { studentApi } from '@/api';
import PanelCard from '@/components/PanelCard.vue';
import type { StudentDetail } from '@/types';
import { scoreLevel, statusTag } from '@/utils/dict';
import { formatDate, formatScore } from '@/utils/format';

const props = defineProps<{ modelValue: boolean; studentId: number | null }>();
const emit = defineEmits<{ 'update:modelValue': [boolean]; edit: [number]; changed: [] }>();

const loading = ref(false);
const detail = ref<StudentDetail | null>(null);

async function load() {
  if (!props.studentId) return;
  loading.value = true;
  try {
    detail.value = await studentApi.detail(props.studentId);
  } finally {
    loading.value = false;
  }
}

async function handleResetPassword() {
  if (!detail.value) return;
  try {
    await ElMessageBox.confirm(
      `确认将「${detail.value.name}」的登录密码重置为初始密码？`,
      '重置密码',
      { confirmButtonText: '确认重置', cancelButtonText: '取消', type: 'warning' },
    );
  } catch {
    return;
  }
  const result = await studentApi.resetPassword(detail.value.id);
  ElMessage.success(`密码已重置为 ${result.password}`);
  emit('changed');
}
</script>

<style scoped lang="scss">
.profile-head {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border: 1px solid var(--c-border-light);
  border-radius: var(--radius-lg);
  background: linear-gradient(180deg, #f7faff 0%, #ffffff 100%);
}
.avatar {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  background: var(--c-primary);
  color: #fff;
  font-size: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.profile-main {
  flex: 1;
  min-width: 0;
}
.profile-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 17px;
  font-weight: 600;
}
.profile-sub {
  margin-top: 6px;
  font-size: 12px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}
.profile-actions {
  display: flex;
  gap: 8px;
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
    font-size: 20px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
}

.score-fail {
  color: var(--c-danger);
  font-weight: 600;
}
</style>
