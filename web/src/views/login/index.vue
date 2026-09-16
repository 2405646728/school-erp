<template>
  <div class="login-page">
    <div class="login-panel">
      <!-- 品牌区 -->
      <div class="brand-side">
        <div class="brand-top">
          <div class="logo">
            <el-icon><School /></el-icon>
          </div>
          <div>
            <div class="brand-title">学生管理系统</div>
            <div class="brand-sub">Student Management System</div>
          </div>
        </div>

        <div class="brand-body">
          <h1>高校教务一体化管理平台</h1>
          <p>覆盖学籍档案、组织架构、课程与教学班、选课及成绩的完整教务流程。</p>
          <ul>
            <li v-for="item in highlights" :key="item">
              <el-icon><Select /></el-icon>
              <span>{{ item }}</span>
            </li>
          </ul>
        </div>

        <div class="brand-foot">school-erp-api v{{ userStore.version }} · {{ year }}</div>
      </div>

      <!-- 表单区 -->
      <div class="form-side">
        <div class="form-head">
          <h2>欢迎回来</h2>
          <p class="t3">请使用教务账号登录管理后台</p>
        </div>

        <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent>
          <div class="field">
            <div class="field-label">
              账号 <span class="en">username</span>
            </div>
            <el-input v-model="form.username" size="large" placeholder="学号 / 工号 / 管理员账号" clearable />
          </div>

          <div class="field">
            <div class="field-label">
              密码 <span class="en">password</span>
            </div>
            <el-input
              v-model="form.password"
              size="large"
              type="password"
              placeholder="请输入登录密码"
              show-password
              @keydown.enter="handleLogin"
            />
          </div>

          <el-button type="primary" size="large" class="submit" :loading="loading" @click="handleLogin">
            登录
          </el-button>
        </el-form>

        <div class="demo-accounts">
          <div class="demo-title">演示账号（点击自动填入）</div>
          <div class="demo-list">
            <button v-for="item in demoAccounts" :key="item.username" @click="fill(item)">
              <span class="role">{{ item.role }}</span>
              <span class="mono">{{ item.username }}</span>
              <span class="pwd mono">/ {{ item.password }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { homePathFor } from '@/router';
import { useUserStore } from '@/stores/user';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

const formRef = ref<FormInstance>();
const loading = ref(false);
const year = new Date().getFullYear();

const form = reactive({ username: 'admin', password: 'admin123' });

const rules: FormRules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
};

const highlights = [
  '学籍档案全生命周期管理',
  '院系 / 专业 / 班级三级组织架构',
  '选课名单与成绩批量录入',
  '多角色权限：管理员 / 教师 / 学生',
];

const demoAccounts = [
  { role: '管理员', username: 'admin', password: 'admin123' },
  { role: '教师', username: 'T0001', password: '123456' },
  { role: '学生', username: '2024080901001', password: '123456' },
];

function fill(item: { username: string; password: string }) {
  form.username = item.username;
  form.password = item.password;
}

async function handleLogin() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  loading.value = true;
  try {
    const user = await userStore.login({ ...form });
    ElMessage.success(`欢迎回来，${user.realName}`);
    const redirect = route.query.redirect as string | undefined;
    await router.replace(redirect || homePathFor(user.role));
  } catch {
    /* 错误提示已由请求拦截器统一处理 */
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  if (userStore.isLogin) router.replace(homePathFor(userStore.role));
});
</script>

<style scoped lang="scss">
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background: radial-gradient(1200px 600px at 15% 10%, #e8f0ff 0%, #f6f7f9 45%, #f6f7f9 100%);
}

.login-panel {
  width: 100%;
  max-width: 980px;
  min-height: 560px;
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  background: #fff;
  border-radius: 16px;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.brand-side {
  display: flex;
  flex-direction: column;
  padding: 32px;
  color: #fff;
  background: linear-gradient(150deg, #2b6cf6 0%, #1b4fd0 55%, #16307a 100%);
}
.brand-top {
  display: flex;
  align-items: center;
  gap: 12px;
}
.logo {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}
.brand-title {
  font-size: 16px;
  font-weight: 600;
}
.brand-sub {
  font-size: 12px;
  opacity: 0.7;
}
.brand-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;

  h1 {
    font-size: 26px;
    line-height: 36px;
    margin: 0 0 12px;
  }
  p {
    font-size: 13px;
    line-height: 22px;
    opacity: 0.82;
    margin: 0 0 20px;
  }
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  li {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    opacity: 0.92;
  }
}
.brand-foot {
  font-size: 12px;
  opacity: 0.6;
}

.form-side {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 40px 44px;
}
.form-head {
  margin-bottom: 22px;

  h2 {
    margin: 0 0 6px;
    font-size: 22px;
  }
  p {
    margin: 0;
    font-size: 13px;
  }
}
.submit {
  width: 100%;
  margin-top: 4px;
}

.demo-accounts {
  margin-top: 26px;
  padding-top: 18px;
  border-top: 1px dashed var(--c-border);
}
.demo-title {
  font-size: 12px;
  color: var(--c-text-3);
  margin-bottom: 10px;
}
.demo-list {
  display: flex;
  flex-direction: column;
  gap: 6px;

  button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 10px;
    border: 1px solid var(--c-border-light);
    border-radius: var(--radius);
    background: #fafbfc;
    font-size: 12px;
    color: var(--c-text-2);
    cursor: pointer;
    text-align: left;
    transition: all 0.16s;

    &:hover {
      border-color: var(--c-primary);
      background: var(--c-primary-soft-2);
    }
    .role {
      color: var(--c-text-1);
      font-weight: 500;
      min-width: 42px;
    }
    .pwd {
      color: var(--c-text-4);
    }
  }
}

@media (max-width: 900px) {
  .login-panel {
    grid-template-columns: 1fr;
  }
  .brand-side {
    display: none;
  }
}
</style>
