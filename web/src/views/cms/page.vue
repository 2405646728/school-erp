<template>
  <div class="page">
    <div class="page-head">
      <div>
        <div class="page-title">单页管理 <small class="t4" style="font-size: 12px; font-weight: 400">pages</small></div>
        <div class="page-desc">官网导航对应的独立页面内容，如学校概况、招生信息、联系方式</div>
      </div>
      <div class="page-actions">
        <el-button :icon="TopRight" @click="openSite">查看前台</el-button>
        <el-button type="primary" :icon="Plus" @click="openCreate">新增页面</el-button>
      </div>
    </div>

    <PanelCard title="页面列表" en="pages" subtitle="内置页面（about / admissions / campus / contact）不允许删除，可改为草稿下线">
      <el-table v-loading="loading" :data="list" style="width: 100%">
        <el-table-column prop="sort_order" label="排序" width="70" align="center" />
        <el-table-column prop="title" label="页面标题" min-width="160" />
        <el-table-column prop="slug" label="页面标识" width="150">
          <template #default="{ row }">
            <router-link :to="`/cms/pages`" class="mono t3" @click.prevent="preview(row)">
              /page/{{ row.slug }}
            </router-link>
          </template>
        </el-table-column>
        <el-table-column prop="subtitle" label="副标题" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">{{ row.subtitle || '—' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="94" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === '已发布' ? 'success' : 'info'" size="small" effect="light">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updated_at" label="更新时间" width="150">
          <template #default="{ row }">{{ formatDate(String(row.updated_at), true) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty><el-empty description="暂无页面" :image-size="90" /></template>
      </el-table>
    </PanelCard>

    <el-drawer
      v-model="formVisible"
      :title="editingId ? '编辑页面' : '新增页面'"
      size="860px"
      :close-on-click-modal="false"
      @open="loadEditor"
    >
      <div v-loading="editorLoading">
        <PanelCard title="基本设置" en="basic">
          <template #extra>
            <span class="t4" style="font-size: 12px">官网导航 nav</span>
          </template>

          <div class="field-grid">
            <div class="field">
              <div class="field-label">页面标题 <span class="en">title</span><span class="req">*</span></div>
              <el-input v-model="form.title" maxlength="60" placeholder="例如 学校概况" />
              <div class="field-hint">同时作为官网顶部导航的菜单名称</div>
            </div>
            <div class="field">
              <div class="field-label">页面标识 <span class="en">slug</span><span class="req">*</span></div>
              <el-input v-model="form.slug" maxlength="40" placeholder="小写字母 / 数字 / 连字符" />
              <div class="field-hint">前台访问地址：/page/{{ form.slug || 'slug' }}</div>
            </div>
          </div>

          <div class="field">
            <div class="field-label">副标题 <span class="en">subtitle</span></div>
            <el-input v-model="form.subtitle" maxlength="80" placeholder="展示在页面大标题下方的一句话" />
          </div>

          <div class="field-grid">
            <div class="field">
              <div class="field-label">发布状态 <span class="en">status</span></div>
              <el-radio-group v-model="form.status">
                <el-radio value="已发布">已发布</el-radio>
                <el-radio value="草稿">草稿</el-radio>
              </el-radio-group>
            </div>
            <div class="field">
              <div class="field-label">排序 <span class="en">sort</span></div>
              <el-input-number v-model="form.sortOrder" :min="0" :max="999" style="width: 100%" />
            </div>
          </div>
        </PanelCard>

        <PanelCard title="页面内容" en="content" subtitle="支持 HTML 标签，保存时自动过滤脚本等危险内容">
          <div class="field">
            <div class="field-label">正文 <span class="en">content</span></div>
            <el-input
              v-model="form.content"
              type="textarea"
              :rows="14"
              class="content-editor"
              placeholder="<p>段落内容</p>&#10;<h3>小标题</h3>&#10;<p>更多内容…</p>"
            />
            <div class="field-hint">h3 会渲染为带蓝色竖线的段落小标题</div>
          </div>
        </PanelCard>

        <PanelCard title="SEO 设置" en="seo" subtitle="影响该页面的浏览器标题与搜索摘要">
          <div class="field-grid">
            <div class="field">
              <div class="field-label">SEO 标题 <span class="en">title</span></div>
              <el-input v-model="form.seoTitle" maxlength="120" placeholder="留空则使用页面标题" />
            </div>
            <div class="field">
              <div class="field-label">SEO 关键词 <span class="en">keywords</span></div>
              <el-input v-model="form.seoKeywords" maxlength="160" placeholder="英文逗号分隔" />
            </div>
          </div>
          <div class="field">
            <div class="field-label">SEO 描述 <span class="en">description</span></div>
            <el-input v-model="form.seoDescription" type="textarea" :rows="2" maxlength="255" show-word-limit />
          </div>
        </PanelCard>

        <FormFooterBar
          :dirty="dirty"
          :loading="saving"
          :latest-text="editingId ? '页面已是最新' : '尚未保存的新页面'"
          @save="handleSave"
          @reset="resetForm"
        />
      </div>
    </el-drawer>

    <div style="height: 16px" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, TopRight } from '@element-plus/icons-vue';
import { cmsApi } from '@/api';
import FormFooterBar from '@/components/FormFooterBar.vue';
import PanelCard from '@/components/PanelCard.vue';
import { siteUrl } from '@/utils/env';
import { formatDate } from '@/utils/format';


const loading = ref(false);
const editorLoading = ref(false);
const saving = ref(false);
const list = ref<Record<string, unknown>[]>([]);
const formVisible = ref(false);
const editingId = ref<number | null>(null);

function emptyForm() {
  return {
    slug: '',
    title: '',
    subtitle: '',
    content: '',
    seoTitle: '',
    seoKeywords: '',
    seoDescription: '',
    status: '已发布',
    sortOrder: 0,
  };
}

const form = reactive(emptyForm());
let snapshot = JSON.stringify(emptyForm());
const dirty = computed(() => JSON.stringify(form) !== snapshot);

function resetForm() {
  Object.assign(form, JSON.parse(snapshot));
}

async function load() {
  loading.value = true;
  try {
    list.value = await cmsApi.pages();
  } finally {
    loading.value = false;
  }
}

function openSite() {
  window.open(siteUrl, '_blank');
}

function preview(row: Record<string, unknown>) {
  window.open(`${siteUrl}/page/${row.slug}`, '_blank');
}

function openCreate() {
  editingId.value = null;
  Object.assign(form, emptyForm());
  snapshot = JSON.stringify(form);
  formVisible.value = true;
}

function openEdit(row: Record<string, unknown>) {
  editingId.value = Number(row.id);
  formVisible.value = true;
}

async function loadEditor() {
  if (!editingId.value) return;
  editorLoading.value = true;
  try {
    const row = (list.value.find((item) => Number(item.id) === editingId.value) ?? {}) as Record<string, unknown>;
    Object.assign(form, {
      slug: row.slug ?? '',
      title: row.title ?? '',
      subtitle: row.subtitle ?? '',
      content: row.content ?? '',
      seoTitle: row.seo_title ?? '',
      seoKeywords: row.seo_keywords ?? '',
      seoDescription: row.seo_description ?? '',
      status: row.status ?? '已发布',
      sortOrder: Number(row.sort_order ?? 0),
    });
    snapshot = JSON.stringify(form);
  } finally {
    editorLoading.value = false;
  }
}

async function handleSave() {
  if (!form.title.trim() || !form.slug.trim()) {
    ElMessage.warning('请填写页面标题与页面标识');
    return;
  }
  if (!/^[a-z0-9-]+$/.test(form.slug)) {
    ElMessage.warning('页面标识只能包含小写字母、数字与连字符');
    return;
  }

  const payload = {
    slug: form.slug.trim(),
    title: form.title.trim(),
    subtitle: form.subtitle || null,
    content: form.content || null,
    seoTitle: form.seoTitle || null,
    seoKeywords: form.seoKeywords || null,
    seoDescription: form.seoDescription || null,
    status: form.status,
    sortOrder: form.sortOrder,
  };

  saving.value = true;
  try {
    if (editingId.value) {
      await cmsApi.updatePage(editingId.value, payload);
      ElMessage.success('页面已保存');
    } else {
      await cmsApi.createPage(payload);
      ElMessage.success('页面已创建');
    }
    snapshot = JSON.stringify(form);
    formVisible.value = false;
    load();
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row: Record<string, unknown>) {
  try {
    await ElMessageBox.confirm(`确认删除页面「${row.title}」？`, '删除页面', {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch {
    return;
  }
  await cmsApi.removePage(Number(row.id));
  ElMessage.success('页面已删除');
  load();
}

onMounted(load);
</script>

<style scoped lang="scss">
.content-editor :deep(textarea) {
  font-family: 'SF Mono', Consolas, 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.8;
}
</style>
