<template>
  <div class="page">
    <div class="page-head">
      <div>
        <div class="page-title">轮播图管理 <small class="t4" style="font-size: 12px; font-weight: 400">banners</small></div>
        <div class="page-desc">官网首页首屏轮播内容，列表顺序即前台展示顺序</div>
      </div>
      <div class="page-actions">
        <el-button :icon="TopRight" @click="openSite">查看前台</el-button>
        <el-button type="primary" :icon="Plus" @click="openCreate">新增轮播图</el-button>
      </div>
    </div>

    <PanelCard title="轮播列表" en="carousel" :subtitle="`共 ${list.length} 条，仅「已发布」的内容会在官网展示`">
      <template #extra>
        <el-tag type="info" effect="plain" size="small">拖动顺序请使用 ↑ ↓ 按钮</el-tag>
      </template>

      <el-table v-loading="loading" :data="list" style="width: 100%">
        <el-table-column type="index" label="#" width="56" />
        <el-table-column label="预览" width="120">
          <template #default="{ row }">
            <div class="banner-preview" :style="previewStyle(row)" />
          </template>
        </el-table-column>
        <el-table-column prop="title" label="主标题" min-width="220" show-overflow-tooltip />
        <el-table-column prop="subtitle" label="副标题" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">{{ row.subtitle || '—' }}</template>
        </el-table-column>
        <el-table-column prop="link" label="跳转链接" min-width="180" show-overflow-tooltip>
          <template #default="{ row }"><span class="mono t3">{{ row.link || '—' }}</span></template>
        </el-table-column>
        <el-table-column prop="sort_order" label="排序" width="76" align="center" />
        <el-table-column label="状态" width="94" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === '已发布' ? 'success' : 'info'" size="small" effect="light">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="230" fixed="right">
          <template #default="{ row, $index }">
            <el-button link type="primary" :disabled="$index === 0" @click="move(row, 'up')">↑</el-button>
            <el-button link type="primary" :disabled="$index === list.length - 1" @click="move(row, 'down')">
              ↓
            </el-button>
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty><el-empty description="暂无轮播图" :image-size="90" /></template>
      </el-table>
    </PanelCard>

    <el-dialog
      v-model="formVisible"
      :title="editingId ? '编辑轮播图' : '新增轮播图'"
      width="620px"
      :close-on-click-modal="false"
    >
      <div class="field">
        <div class="field-label">主标题 <span class="en">title</span><span class="req">*</span></div>
        <el-input v-model="form.title" maxlength="80" placeholder="例如 启明大学 2025 级新生开学典礼隆重举行" />
      </div>
      <div class="field">
        <div class="field-label">副标题 <span class="en">subtitle</span></div>
        <el-input v-model="form.subtitle" maxlength="120" placeholder="一句话说明，展示在主标题下方" />
      </div>
      <div class="field">
        <div class="field-label">背景图片 <span class="en">image</span></div>
        <el-input v-model="form.image" placeholder="图片地址，或 CSS 渐变（如 linear-gradient(...)）" />
        <div class="field-hint">留空时使用系统默认蓝色渐变背景；填写图片地址将自动叠加遮罩以保证文字可读</div>
      </div>
      <div class="field">
        <div class="field-label">跳转链接 <span class="en">link</span></div>
        <el-input v-model="form.link" placeholder="例如 /news 或 /page/admissions" />
      </div>
      <div class="field-grid">
        <div class="field">
          <div class="field-label">排序 <span class="en">sort</span></div>
          <el-input-number v-model="form.sortOrder" :min="0" :max="999" style="width: 100%" />
        </div>
        <div class="field">
          <div class="field-label">发布状态 <span class="en">status</span></div>
          <el-radio-group v-model="form.status">
            <el-radio value="已发布">已发布</el-radio>
            <el-radio value="草稿">草稿</el-radio>
          </el-radio-group>
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
import { Plus, TopRight } from '@element-plus/icons-vue';
import { cmsApi } from '@/api';
import PanelCard from '@/components/PanelCard.vue';
import { siteUrl } from '@/utils/env';


const loading = ref(false);
const saving = ref(false);
const list = ref<Record<string, unknown>[]>([]);
const formVisible = ref(false);
const editingId = ref<number | null>(null);

function emptyForm() {
  return {
    title: '',
    subtitle: '',
    image: '',
    link: '',
    sortOrder: 0,
    status: '已发布',
  };
}

const form = reactive(emptyForm());

const gradients = [
  'linear-gradient(120deg, #12307a 0%, #1a4fd6 55%, #2f74ff 100%)',
  'linear-gradient(120deg, #0f2350 0%, #1b3f8f 60%, #2b6cf6 100%)',
  'linear-gradient(120deg, #10305f 0%, #1f5fb8 55%, #3f8ae0 100%)',
  'linear-gradient(120deg, #16265c 0%, #2a4fa8 60%, #4a7cf0 100%)',
];

function previewStyle(row: Record<string, unknown>) {
  const image = String(row.image ?? '');
  if (image.startsWith('linear-gradient')) return { background: image };
  if (image) return { background: `url(${image}) center/cover no-repeat` };
  return { background: gradients[Number(row.sort_order ?? 0) % gradients.length] };
}

async function load() {
  loading.value = true;
  try {
    list.value = await cmsApi.banners();
  } finally {
    loading.value = false;
  }
}

function openSite() {
  window.open(siteUrl, '_blank');
}

function openCreate() {
  editingId.value = null;
  Object.assign(form, emptyForm());
  form.sortOrder = list.value.length + 1;
  formVisible.value = true;
}

function openEdit(row: Record<string, unknown>) {
  editingId.value = Number(row.id);
  Object.assign(form, {
    title: row.title,
    subtitle: row.subtitle ?? '',
    image: row.image ?? '',
    link: row.link ?? '',
    sortOrder: row.sort_order,
    status: row.status,
  });
  formVisible.value = true;
}

async function handleSubmit() {
  if (!form.title.trim()) {
    ElMessage.warning('请填写主标题');
    return;
  }
  const payload = {
    title: form.title.trim(),
    subtitle: form.subtitle || null,
    image: form.image || null,
    link: form.link || null,
    sortOrder: form.sortOrder,
    status: form.status,
  };

  saving.value = true;
  try {
    if (editingId.value) {
      await cmsApi.updateBanner(editingId.value, payload);
      ElMessage.success('轮播图已保存');
    } else {
      await cmsApi.createBanner(payload);
      ElMessage.success('轮播图已创建');
    }
    formVisible.value = false;
    load();
  } finally {
    saving.value = false;
  }
}

async function move(row: Record<string, unknown>, direction: 'up' | 'down') {
  await cmsApi.moveBanner(Number(row.id), direction);
  await load();
}

async function handleDelete(row: Record<string, unknown>) {
  try {
    await ElMessageBox.confirm(`确认删除轮播图「${row.title}」？`, '删除轮播图', {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch {
    return;
  }
  await cmsApi.removeBanner(Number(row.id));
  ElMessage.success('轮播图已删除');
  load();
}

onMounted(load);
</script>

<style scoped lang="scss">
.banner-preview {
  width: 96px;
  height: 44px;
  border-radius: 6px;
  border: 1px solid var(--c-border-light);
}
</style>
