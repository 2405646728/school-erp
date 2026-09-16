<template>
  <div class="page">
    <div class="page-head">
      <div>
        <div class="page-title">个人资料 <small class="t4" style="font-size: 12px; font-weight: 400">profile</small></div>
        <div class="page-desc">维护当前账号的显示信息与登录密码</div>
      </div>
      <div class="page-actions">
        <el-tag effect="light" :type="roleTag(userStore.role)">{{ userStore.roleLabel }}</el-tag>
      </div>
    </div>

    <div v-loading="loading">
      <!-- ============ 账号信息 ============ -->
      <PanelCard title="账号信息" en="account" subtitle="展示在系统头部与操作日志中">
        <template #extra>
          <span class="t4" style="font-size: 12px">个人中心 &lt;profile&gt;</span>
        </template>

        <div class="field-grid">
          <div class="field">
            <div class="field-label">显示名称 <span class="en">display name</span></div>
            <el-input v-model="form.realName" placeholder="请输入姓名" maxlength="30" />
            <div class="field-hint">出现在页面右上角、操作日志与审批记录中</div>
          </div>

          <div class="field">
            <div class="field-label">登录账号 <span class="en">username</span></div>
            <el-input :model-value="account?.username" disabled />
            <div class="field-hint">登录账号由管理员分配，如需变更请联系系统管理员</div>
          </div>
        </div>

        <div class="field-grid">
          <div class="field">
            <div class="field-label">手机号 <span class="en">phone</span></div>
            <el-input v-model="form.phone" placeholder="请输入手机号" maxlength="20" />
            <div class="field-hint">用于接收教务通知与密码找回</div>
          </div>

          <div class="field">
            <div class="field-label">邮箱 <span class="en">email</span></div>
            <el-input v-model="form.email" placeholder="请输入邮箱" maxlength="60" />
            <div class="field-hint">建议使用校内邮箱，长度不超过 60 字符</div>
          </div>
        </div>

        <div class="field" style="margin-bottom: 4px">
          <div class="field-label">账号状态 <span class="en">status</span></div>
          <el-space :size="16">
            <el-tag :type="statusTag(account?.status)" effect="light">{{ account?.status ?? '—' }}</el-tag>
            <span class="t3" style="font-size: 12px">
              最近登录：{{ formatDate(account?.last_login_at, true) }}
            </span>
            <span class="t3" style="font-size: 12px">
              创建时间：{{ formatDate(account?.created_at) }}
            </span>
          </el-space>
        </div>

        <FormFooterBar
          :dirty="dirty"
          :loading="saving"
          latest-text="资料已是最新"
          @save="saveProfile"
          @reset="resetForm"
        />
      </PanelCard>

      <!-- ============ 安全设置 ============ -->
      <PanelCard title="安全设置" en="security" subtitle="修改密码后当前登录状态仍然有效">
        <template #extra>
          <el-button link type="primary" @click="showPassword = !showPassword">
            {{ showPassword ? '收起' : '修改密码' }}
          </el-button>
        </template>

        <template v-if="showPassword">
          <div class="field-grid-3">
            <div class="field">
              <div class="field-label">原密码 <span class="en">current password</span></div>
              <el-input v-model="passwordForm.oldPassword" type="password" show-password placeholder="请输入原密码" />
            </div>
            <div class="field">
              <div class="field-label">新密码 <span class="en">new password</span></div>
              <el-input v-model="passwordForm.newPassword" type="password" show-password placeholder="至少 6 位" />
            </div>
            <div class="field">
              <div class="field-label">确认新密码 <span class="en">confirm</span></div>
              <el-input
                v-model="passwordForm.confirmPassword"
                type="password"
                show-password
                placeholder="请再次输入新密码"
              />
            </div>
          </div>

          <div class="field" style="margin-bottom: 0">
            <el-space>
              <el-button type="primary" :loading="changing" @click="changePassword">确认修改</el-button>
              <el-button @click="resetPasswordForm">清空</el-button>
            </el-space>
            <div class="field-hint">密码长度至少 6 位，建议包含字母、数字与符号的组合</div>
          </div>
        </template>
        <div v-else class="t3" style="font-size: 13px">如需修改登录密码，点击右上角「修改密码」。</div>
      </PanelCard>

      <!-- ============ 关联档案 ============ -->
      <PanelCard
        v-if="teacherProfile || studentProfile"
        :title="studentProfile ? '我的学籍档案' : '我的教师档案'"
        en="linked record"
        subtitle="档案信息由教务处维护，如需修改请联系教务老师"
      >
        <template #extra>
          <span class="t4" style="font-size: 12px">只读 read-only</span>
        </template>

        <el-descriptions v-if="studentProfile" :column="3" border size="small">
          <el-descriptions-item label="学号">{{ studentProfile.student_no }}</el-descriptions-item>
          <el-descriptions-item label="姓名">{{ studentProfile.name }}</el-descriptions-item>
          <el-descriptions-item label="性别">{{ studentProfile.gender }}</el-descriptions-item>
          <el-descriptions-item label="院系">{{ studentProfile.department_name || '—' }}</el-descriptions-item>
          <el-descriptions-item label="专业">{{ studentProfile.major_name || '—' }}</el-descriptions-item>
          <el-descriptions-item label="班级">{{ studentProfile.class_name || '未分班' }}</el-descriptions-item>
          <el-descriptions-item label="年级">{{ studentProfile.enroll_year }} 级</el-descriptions-item>
          <el-descriptions-item label="学籍状态">
            <el-tag :type="statusTag(String(studentProfile.status))" size="small" effect="light">
              {{ studentProfile.status }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="宿舍">{{ studentProfile.dormitory || '—' }}</el-descriptions-item>
        </el-descriptions>

        <el-descriptions v-else-if="teacherProfile" :column="3" border size="small">
          <el-descriptions-item label="工号">{{ teacherProfile.teacher_no }}</el-descriptions-item>
          <el-descriptions-item label="姓名">{{ teacherProfile.name }}</el-descriptions-item>
          <el-descriptions-item label="性别">{{ teacherProfile.gender }}</el-descriptions-item>
          <el-descriptions-item label="职称">{{ teacherProfile.title }}</el-descriptions-item>
          <el-descriptions-item label="所属院系">{{ teacherProfile.department_name || '—' }}</el-descriptions-item>
          <el-descriptions-item label="入职日期">{{ formatDate(String(teacherProfile.hire_date)) }}</el-descriptions-item>
        </el-descriptions>
      </PanelCard>

      <div style="height: 16px" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { authApi } from '@/api';
import FormFooterBar from '@/components/FormFooterBar.vue';
import PanelCard from '@/components/PanelCard.vue';
import { useUserStore } from '@/stores/user';
import type { SysAccount } from '@/types';
import { roleTag, statusTag } from '@/utils/dict';
import { formatDate } from '@/utils/format';

const userStore = useUserStore();
const loading = ref(false);
const saving = ref(false);
const changing = ref(false);
const showPassword = ref(false);

const account = ref<SysAccount | null>(null);
const teacherProfile = ref<Record<string, unknown> | null>(null);
const studentProfile = ref<Record<string, unknown> | null>(null);

const form = reactive({ realName: '', phone: '', email: '' });
let snapshot = JSON.stringify(form);

const passwordForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' });

const dirty = computed(() => JSON.stringify(form) !== snapshot);

function resetForm() {
  Object.assign(form, JSON.parse(snapshot));
}

function resetPasswordForm() {
  passwordForm.oldPassword = '';
  passwordForm.newPassword = '';
  passwordForm.confirmPassword = '';
}

async function load() {
  loading.value = true;
  try {
    const result = await authApi.profile();
    account.value = result.account;
    teacherProfile.value = result.teacher;
    studentProfile.value = result.student;

    form.realName = result.account.real_name;
    form.phone = result.account.phone ?? '';
    form.email = result.account.email ?? '';
    snapshot = JSON.stringify(form);
  } finally {
    loading.value = false;
  }
}

async function saveProfile() {
  if (!form.realName.trim()) {
    ElMessage.warning('显示名称不能为空');
    return;
  }
  saving.value = true;
  try {
    await authApi.updateProfile({
      realName: form.realName.trim(),
      phone: form.phone || null,
      email: form.email || null,
    });
    ElMessage.success('个人资料已保存');

    // 同步本地用户信息，头部展示立即生效
    if (userStore.user) {
      userStore.user.realName = form.realName.trim();
      localStorage.setItem('school-erp-user', JSON.stringify(userStore.user));
    }
    snapshot = JSON.stringify(form);
    await load();
  } finally {
    saving.value = false;
  }
}

async function changePassword() {
  if (!passwordForm.oldPassword || !passwordForm.newPassword) {
    ElMessage.warning('请填写原密码与新密码');
    return;
  }
  if (passwordForm.newPassword.length < 6) {
    ElMessage.warning('新密码至少 6 位');
    return;
  }
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    ElMessage.warning('两次输入的新密码不一致');
    return;
  }

  changing.value = true;
  try {
    await authApi.changePassword({
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword,
    });
    ElMessage.success('密码修改成功');
    resetPasswordForm();
    showPassword.value = false;
  } finally {
    changing.value = false;
  }
}

onMounted(load);
</script>
