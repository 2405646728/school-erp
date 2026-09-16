<template>
  <div class="page">
    <div class="page-head">
      <div>
        <div class="page-title">用户管理 <small class="t4" style="font-size: 12px; font-weight: 400">accounts</small></div>
        <div class="page-desc">系统登录账号、角色与绑定档案，共 {{ total }} 个账号</div>
      </div>
      <div class="page-actions">
        <el-button type="primary" :icon="Plus" @click="openCreate">新增账号</el-button>
      </div>
    </div>

    <PanelCard>
      <div class="toolbar">
        <el-input
          v-model="query.keyword"
          placeholder="搜索账号 / 姓名"
          :prefix-icon="Search"
          clearable
          style="width: 240px"
          @keydown.enter="handleSearch"
        />
        <el-select v-model="query.role" placeholder="全部角色" clearable style="width: 150px" @change="handleSearch">
          <el-option label="系统管理员" value="admin" />
          <el-option label="教师" value="teacher" />
          <el-option label="学生" value="student" />
        </el-select>
        <el-select v-model="query.status" placeholder="账号状态" clearable style="width: 130px" @change="handleSearch">
          <el-option v-for="item in ACCOUNT_STATUS" :key="item" :label="item" :value="item" />
        </el-select>
        <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
        <el-button :icon="RefreshLeft" @click="handleReset">重置</el-button>
      </div>

      <el-table v-loading="loading" :data="list" style="width: 100%">
        <el-table-column prop="username" label="登录账号" width="150" fixed>
          <template #default="{ row }"><span class="mono">{{ row.username }}</span></template>
        </el-table-column>
        <el-table-column prop="real_name" label="姓名" width="110" />
        <el-table-column label="角色" width="120">
          <template #default="{ row }">
            <el-tag :type="roleTag(row.role)" size="small" effect="light">{{ row.role_label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="绑定档案" width="120">
          <template #default="{ row }">
            <span v-if="row.ref_id" class="t2">#{{ row.ref_id }}</span>
            <span v-else class="t4">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="手机号" width="130">
          <template #default="{ row }"><span class="mono">{{ row.phone || '—' }}</span></template>
        </el-table-column>
        <el-table-column prop="email" label="邮箱" min-width="200" show-overflow-tooltip />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status)" size="small" effect="light">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="last_login_at" label="最近登录" width="150">
          <template #default="{ row }">{{ formatDate(row.last_login_at, true) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="210" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link type="primary" @click="handleToggle(row)">
              {{ row.status === '启用' ? '停用' : '启用' }}
            </el-button>
            <el-dropdown trigger="click" @command="(cmd: string) => handleCommand(cmd, row)">
              <el-button link type="primary">更多<el-icon><ArrowDown /></el-icon></el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="reset">重置密码</el-dropdown-item>
                  <el-dropdown-item command="delete" divided>删除账号</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
        <template #empty><el-empty description="没有符合条件的账号" :image-size="90" /></template>
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

    <el-dialog
      v-model="formVisible"
      :title="editingId ? '编辑账号' : '新增账号'"
      width="620px"
      :close-on-click-modal="false"
    >
      <div class="field-grid">
        <div class="field">
          <div class="field-label">登录账号 <span class="en">username</span><span class="req">*</span></div>
          <el-input v-model="form.username" :disabled="Boolean(editingId)" placeholder="字母 / 数字 / 下划线" />
          <div class="field-hint" v-if="!editingId">创建后初始密码为 123456</div>
        </div>
        <div class="field">
          <div class="field-label">姓名 <span class="en">name</span><span class="req">*</span></div>
          <el-input v-model="form.realName" placeholder="请输入姓名" />
        </div>
        <div class="field">
          <div class="field-label">角色 <span class="en">role</span></div>
          <el-select v-model="form.role" style="width: 100%" @change="handleRoleChange">
            <el-option label="系统管理员" value="admin" />
            <el-option label="教师" value="teacher" />
            <el-option label="学生" value="student" />
          </el-select>
        </div>
        <div class="field">
          <div class="field-label">绑定档案 <span class="en">linked record</span></div>
          <el-select
            v-model="form.refId"
            :disabled="form.role === 'admin'"
            :placeholder="form.role === 'admin' ? '管理员无需绑定' : '请选择关联的教师/学生'"
            filterable
            clearable
            style="width: 100%"
          >
            <el-option v-for="item in bindableOptions" :key="item.id" :label="item.label" :value="item.id" />
          </el-select>
        </div>
        <div class="field">
          <div class="field-label">手机号 <span class="en">phone</span></div>
          <el-input v-model="form.phone" maxlength="20" />
        </div>
        <div class="field">
          <div class="field-label">邮箱 <span class="en">email</span></div>
          <el-input v-model="form.email" maxlength="60" />
        </div>
        <div class="field">
          <div class="field-label">账号状态 <span class="en">status</span></div>
          <el-select v-model="form.status" style="width: 100%">
            <el-option v-for="item in ACCOUNT_STATUS" :key="item" :label="item" :value="item" />
          </el-select>
        </div>
      </div>

      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>

    <div style="height: 16px" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowDown, Plus, RefreshLeft, Search } from '@element-plus/icons-vue';
import { userApi } from '@/api';
import PanelCard from '@/components/PanelCard.vue';
import type { Role, SysAccount } from '@/types';
import { ACCOUNT_STATUS, roleTag, statusTag } from '@/utils/dict';
import { formatDate } from '@/utils/format';

const loading = ref(false);
const saving = ref(false);
const list = ref<SysAccount[]>([]);
const total = ref(0);
const bindableOptions = ref<{ id: number; label: string }[]>([]);
const formVisible = ref(false);
const editingId = ref<number | null>(null);

const query = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
  role: undefined as string | undefined,
  status: undefined as string | undefined,
});

function emptyForm() {
  return {
    username: '',
    realName: '',
    role: 'teacher' as Role,
    refId: undefined as number | undefined,
    phone: '',
    email: '',
    status: '启用',
  };
}

const form = reactive(emptyForm());

async function load() {
  loading.value = true;
  try {
    const result = await userApi.list({ ...query });
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
  query.role = undefined;
  query.status = undefined;
  handleSearch();
}

async function handleRoleChange(role: Role) {
  form.refId = undefined;
  bindableOptions.value = role === 'admin' ? [] : await userApi.bindable(role);
}

async function openCreate() {
  editingId.value = null;
  Object.assign(form, emptyForm());
  bindableOptions.value = await userApi.bindable('teacher');
  formVisible.value = true;
}

async function openEdit(row: SysAccount) {
  editingId.value = row.id;
  Object.assign(form, {
    username: row.username,
    realName: row.real_name,
    role: row.role,
    refId: row.ref_id ?? undefined,
    phone: row.phone ?? '',
    email: row.email ?? '',
    status: row.status,
  });
  bindableOptions.value = row.role === 'admin' ? [] : await userApi.bindable(row.role);
  formVisible.value = true;
}

async function handleSubmit() {
  if (!form.realName.trim()) {
    ElMessage.warning('请填写姓名');
    return;
  }
  if (!editingId.value && !form.username.trim()) {
    ElMessage.warning('请填写登录账号');
    return;
  }

  const payload = {
    realName: form.realName.trim(),
    role: form.role,
    refId: form.role === 'admin' ? null : form.refId ?? null,
    phone: form.phone || null,
    email: form.email || null,
    status: form.status,
  };

  saving.value = true;
  try {
    if (editingId.value) {
      await userApi.update(editingId.value, payload);
      ElMessage.success('账号已保存');
    } else {
      await userApi.create({ username: form.username.trim(), ...payload });
      ElMessage.success('账号已创建，初始密码 123456');
    }
    formVisible.value = false;
    load();
  } finally {
    saving.value = false;
  }
}

async function handleToggle(row: SysAccount) {
  try {
    await ElMessageBox.confirm(
      `确认${row.status === '启用' ? '停用' : '启用'}账号「${row.username}」？`,
      '状态变更',
      { confirmButtonText: '确认', cancelButtonText: '取消', type: 'warning' },
    );
  } catch {
    return;
  }
  const result = await userApi.toggleStatus(row.id);
  ElMessage.success(`账号已${result.status}`);
  load();
}

async function handleCommand(command: string, row: SysAccount) {
  if (command === 'reset') {
    try {
      await ElMessageBox.confirm(`确认重置「${row.username}」的登录密码？`, '重置密码', {
        confirmButtonText: '确认重置',
        cancelButtonText: '取消',
        type: 'warning',
      });
    } catch {
      return;
    }
    const result = await userApi.resetPassword(row.id);
    ElMessage.success(`密码已重置为 ${result.password}`);
    return;
  }

  try {
    await ElMessageBox.confirm(`确认删除账号「${row.username}」？`, '删除账号', {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      type: 'error',
    });
  } catch {
    return;
  }
  await userApi.remove(row.id);
  ElMessage.success('账号已删除');
  load();
}

onMounted(load);
</script>
