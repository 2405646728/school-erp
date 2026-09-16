<template>
  <div class="page">
    <div class="page-head">
      <div>
        <div class="page-title">新闻公告 <small class="t4" style="font-size: 12px; font-weight: 400">articles</small></div>
        <div class="page-desc">官网新闻、通知公告、学术活动与招生信息的发布与维护</div>
      </div>
      <div class="page-actions">
        <el-button :icon="TopRight" @click="openSite">查看前台</el-button>
        <el-button type="primary" :icon="Plus" @click="openCreate">发布内容</el-button>
      </div>
    </div>

    <div class="stat-grid" style="margin-bottom: 16px">
      <div class="stat-card">
        <div class="stat-label">内容总数</div>
        <div class="stat-value">{{ stats?.total ?? 0 }}</div>
        <div class="stat-foot">全部状态</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">已发布</div>
        <div class="stat-value" style="color: #00b42a">{{ stats?.published ?? 0 }}</div>
        <div class="stat-foot">官网可见</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">草稿</div>
        <div class="stat-value" style="color: #ff7d00">{{ stats?.draft ?? 0 }}</div>
        <div class="stat-foot">仅后台可见</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">累计阅读</div>
        <div class="stat-value" style="color: #2b6cf6">{{ formatNumber(stats?.views ?? 0) }}</div>
        <div class="stat-foot">前台浏览量合计</div>
      </div>
    </div>

    <PanelCard>
      <div class="toolbar">
        <el-input
          v-model="query.keyword"
          placeholder="搜索标题 / 摘要 / 标签"
          :prefix-icon="Search"
          clearable
          style="width: 250px"
          @keydown.enter="handleSearch"
        />
        <el-select v-model="query.category" placeholder="全部分类" clearable style="width: 150px" @change="handleSearch">
          <el-option v-for="item in CATEGORIES" :key="item" :label="item" :value="item" />
        </el-select>
        <el-select v-model="query.status" placeholder="全部状态" clearable style="width: 130px" @change="handleSearch">
          <el-option label="已发布" value="已发布" />
          <el-option label="草稿" value="草稿" />
        </el-select>
        <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
        <el-button :icon="RefreshLeft" @click="handleReset">重置</el-button>
      </div>

      <el-table v-loading="loading" :data="list" style="width: 100%">
        <el-table-column label="标题" min-width="320">
          <template #default="{ row }">
            <div class="title-cell">
              <el-tag v-if="row.is_top" type="danger" size="small" effect="light" style="margin-right: 6px">置顶</el-tag>
              <div>
                <div class="title">{{ row.title }}</div>
                <div class="summary">{{ row.summary }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="category" label="分类" width="110" align="center">
          <template #default="{ row }">
            <el-tag size="small" effect="plain" :type="row.category === '通知公告' ? 'warning' : row.category === '招生信息' ? 'success' : 'primary'">
              {{ row.category }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="author" label="作者" width="110">
          <template #default="{ row }">{{ row.author || '—' }}</template>
        </el-table-column>
        <el-table-column prop="published_at" label="发布时间" width="150">
          <template #default="{ row }">{{ formatDate(String(row.published_at), true) }}</template>
        </el-table-column>
        <el-table-column prop="view_count" label="阅读" width="86" align="center" />
        <el-table-column label="状态" width="94" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === '已发布' ? 'success' : 'info'" size="small" effect="light">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="230" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(Number(row.id))">编辑</el-button>
            <el-button link type="primary" @click="handleToggleStatus(row)">
              {{ row.status === '已发布' ? '转草稿' : '发布' }}
            </el-button>
            <el-button link type="primary" @click="handleToggleTop(row)">
              {{ row.is_top ? '取消置顶' : '置顶' }}
            </el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty><el-empty description="暂无内容" :image-size="90" /></template>
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

    <!-- ============ 内容编辑器 ============ -->
    <el-drawer
      v-model="editorVisible"
      :title="editingId ? '编辑内容' : '发布新内容'"
      size="960px"
      :close-on-click-modal="false"
      @open="loadEditor"
    >
      <div v-loading="editorLoading" class="editor">
        <PanelCard title="标题与 SEO" en="title & seo" subtitle="展示在浏览器标签页与搜索结果里">
          <template #extra>
            <span class="t4" style="font-size: 12px">前台 &lt;head&gt;</span>
          </template>

          <div class="field-grid">
            <div class="field">
              <div class="field-label">内容标题 <span class="en">title</span><span class="req">*</span></div>
              <el-input v-model="form.title" maxlength="120" show-word-limit placeholder="请输入新闻/公告标题" />
              <div class="field-hint">出现在列表页、详情页大标题与搜索结果标题</div>
            </div>
            <div class="field">
              <div class="field-label">内容分类 <span class="en">category</span></div>
              <el-select v-model="form.category" style="width: 100%">
                <el-option v-for="item in CATEGORIES" :key="item" :label="item" :value="item" />
              </el-select>
              <div class="field-hint">决定内容在前台的栏目归属与筛选标签</div>
            </div>
          </div>

          <div class="field">
            <div class="field-label">摘要 <span class="en">summary</span></div>
            <el-input
              v-model="form.summary"
              type="textarea"
              :rows="2"
              maxlength="255"
              show-word-limit
              placeholder="列表页展示的简介，留空将自动截取正文前 120 字"
            />
            <div class="field-hint">建议 60-120 字，用于列表页与搜索引擎结果摘要</div>
          </div>

          <div class="field-grid">
            <div class="field">
              <div class="field-label">SEO 关键词 <span class="en">keywords</span></div>
              <el-input v-model="form.seoKeywords" maxlength="160" placeholder="多个关键词用英文逗号分隔" />
            </div>
            <div class="field">
              <div class="field-label">标签 <span class="en">tags</span></div>
              <el-input v-model="form.tags" maxlength="120" placeholder="例如 招生,本科（英文逗号分隔）" />
            </div>
          </div>

          <div class="field">
            <div class="field-label">SEO 描述 <span class="en">description</span></div>
            <el-input
              v-model="form.seoDescription"
              type="textarea"
              :rows="2"
              maxlength="255"
              show-word-limit
              placeholder="供搜索引擎参考，留空则使用摘要"
            />
          </div>
        </PanelCard>

        <PanelCard title="正文内容" en="content" subtitle="支持 HTML 标签，保存时会自动过滤脚本等危险内容">
          <div class="field">
            <div class="field-label">
              正文 <span class="en">content</span>
              <el-button link type="primary" style="margin-left: auto" @click="insertSample">
                插入示例段落
              </el-button>
            </div>
            <el-input
              v-model="form.content"
              type="textarea"
              :rows="14"
              placeholder="<p>正文段落</p>&#10;<h3>小标题</h3>&#10;<p>更多内容…</p>"
              class="content-editor"
            />
            <div class="field-hint">
              支持 p、h3、ul、li、b、img 等常用标签；前台按正文样式渲染
            </div>
          </div>

          <div class="preview-box">
            <div class="preview-title">效果预览</div>
            <div class="rich-preview" v-html="form.content || '<p class=&quot;t4&quot;>正文为空</p>'" />
          </div>
        </PanelCard>

        <PanelCard title="发布设置" en="publish">
          <div class="field-grid-3">
            <div class="field">
              <div class="field-label">发布状态 <span class="en">status</span></div>
              <el-radio-group v-model="form.status">
                <el-radio value="已发布">立即发布</el-radio>
                <el-radio value="草稿">存为草稿</el-radio>
              </el-radio-group>
            </div>
            <div class="field">
              <div class="field-label">是否置顶 <span class="en">top</span></div>
              <el-switch v-model="form.isTop" :active-value="1" :inactive-value="0" active-text="置顶" />
            </div>
            <div class="field">
              <div class="field-label">作者 / 来源 <span class="en">author</span></div>
              <div style="display: flex; gap: 8px">
                <el-input v-model="form.author" placeholder="作者" maxlength="40" />
                <el-input v-model="form.source" placeholder="来源" maxlength="60" />
              </div>
            </div>
          </div>
        </PanelCard>

        <FormFooterBar
          :dirty="dirty"
          :loading="saving"
          :latest-text="editingId ? '内容已是最新' : '尚未保存的新内容'"
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
import { Plus, RefreshLeft, Search, TopRight } from '@element-plus/icons-vue';
import { cmsApi } from '@/api';
import FormFooterBar from '@/components/FormFooterBar.vue';
import PanelCard from '@/components/PanelCard.vue';
import { siteUrl } from '@/utils/env';
import { formatDate, formatNumber } from '@/utils/format';

const CATEGORIES = ['学校新闻', '通知公告', '学术活动', '招生信息'];

const loading = ref(false);
const list = ref<Record<string, unknown>[]>([]);
const total = ref(0);
const stats = ref<{ total: number; published: number; draft: number; views: number } | null>(null);

const editorVisible = ref(false);
const editorLoading = ref(false);
const saving = ref(false);
const editingId = ref<number | null>(null);

const query = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
  category: undefined as string | undefined,
  status: undefined as string | undefined,
});

function emptyForm() {
  return {
    title: '',
    category: '学校新闻',
    summary: '',
    content: '',
    author: '',
    source: '',
    tags: '',
    status: '已发布',
    isTop: 0,
    seoKeywords: '',
    seoDescription: '',
  };
}

const form = reactive(emptyForm());
let snapshot = JSON.stringify(emptyForm());
const dirty = computed(() => JSON.stringify(form) !== snapshot);

function resetForm() {
  Object.assign(form, JSON.parse(snapshot));
}

function insertSample() {
  form.content += `<p>${new Date().toLocaleDateString('zh-CN')}，学校组织召开专题工作会议，就相关工作作出部署。</p>\n<h3>工作安排</h3>\n<ul>\n  <li>第一阶段：动员部署</li>\n  <li>第二阶段：组织实施</li>\n</ul>\n`;
}

async function load() {
  loading.value = true;
  try {
    const [page, stat] = await Promise.all([
      cmsApi.articles({ ...query }),
      cmsApi.articleStats(),
    ]);
    list.value = page.list;
    total.value = page.total;
    stats.value = stat;
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
  query.category = undefined;
  query.status = undefined;
  handleSearch();
}

function openSite() {
  window.open(siteUrl, '_blank');
}

function openCreate() {
  editingId.value = null;
  Object.assign(form, emptyForm());
  snapshot = JSON.stringify(form);
  editorVisible.value = true;
}

async function openEdit(id: number) {
  editingId.value = id;
  editorVisible.value = true;
}

async function loadEditor() {
  if (!editingId.value) return;
  editorLoading.value = true;
  try {
    const row = await cmsApi.article(editingId.value);
    Object.assign(form, {
      title: row.title ?? '',
      category: row.category ?? '学校新闻',
      summary: row.summary ?? '',
      content: row.content ?? '',
      author: row.author ?? '',
      source: row.source ?? '',
      tags: row.tags ?? '',
      status: row.status ?? '已发布',
      isTop: Number(row.is_top ?? 0),
      seoKeywords: row.seo_keywords ?? '',
      seoDescription: row.seo_description ?? '',
    });
    snapshot = JSON.stringify(form);
  } finally {
    editorLoading.value = false;
  }
}

async function handleSave() {
  if (!form.title.trim()) {
    ElMessage.warning('请填写内容标题');
    return;
  }

  const payload = {
    title: form.title.trim(),
    category: form.category,
    summary: form.summary || null,
    content: form.content || null,
    author: form.author || null,
    source: form.source || null,
    tags: form.tags || null,
    status: form.status,
    isTop: form.isTop,
    seoKeywords: form.seoKeywords || null,
    seoDescription: form.seoDescription || null,
  };

  saving.value = true;
  try {
    if (editingId.value) {
      await cmsApi.updateArticle(editingId.value, payload);
      ElMessage.success('内容已保存');
    } else {
      await cmsApi.createArticle(payload);
      ElMessage.success(form.status === '已发布' ? '内容已发布到官网' : '草稿已保存');
    }
    snapshot = JSON.stringify(form);
    editorVisible.value = false;
    load();
  } finally {
    saving.value = false;
  }
}

async function handleToggleStatus(row: Record<string, unknown>) {
  const result = await cmsApi.toggleArticleStatus(Number(row.id));
  ElMessage.success(`内容已${result.status === '已发布' ? '发布' : '转为草稿'}`);
  load();
}

async function handleToggleTop(row: Record<string, unknown>) {
  const result = await cmsApi.toggleArticleTop(Number(row.id));
  ElMessage.success(result.isTop ? '已置顶' : '已取消置顶');
  load();
}

async function handleDelete(row: Record<string, unknown>) {
  try {
    await ElMessageBox.confirm(`确认删除内容「${row.title}」？该操作不可恢复。`, '删除内容', {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      type: 'error',
    });
  } catch {
    return;
  }
  await cmsApi.removeArticle(Number(row.id));
  ElMessage.success('内容已删除');
  load();
}

onMounted(load);
</script>

<style scoped lang="scss">
.title-cell {
  display: flex;
  align-items: flex-start;
}
.title-cell .title {
  font-weight: 500;
  line-height: 20px;
}
.title-cell .summary {
  margin-top: 3px;
  font-size: 12px;
  color: var(--c-text-3);
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.editor {
  :deep(.panel) + :deep(.panel) {
    margin-top: 16px;
  }
}

.content-editor :deep(textarea) {
  font-family: 'SF Mono', Consolas, 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.8;
}

.preview-box {
  margin-top: 4px;
  padding: 16px 18px;
  border: 1px dashed var(--c-border);
  border-radius: var(--radius);
  background: #fcfcfd;
}
.preview-title {
  margin-bottom: 10px;
  font-size: 12px;
  color: var(--c-text-3);
}
.rich-preview {
  font-size: 14px;
  line-height: 1.9;
  color: var(--c-text-2);
  max-height: 260px;
  overflow: auto;

  :deep(h3) {
    margin: 14px 0 8px;
    font-size: 15px;
    color: var(--c-text-1);
    padding-left: 10px;
    border-left: 3px solid var(--c-primary);
  }
  :deep(p) {
    margin: 0 0 10px;
  }
  :deep(ul) {
    padding-left: 20px;
  }
}
</style>
