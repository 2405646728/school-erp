<template>
  <div class="page">
    <div class="page-head">
      <div>
        <div class="page-title">站点设置 <small class="t4" style="font-size: 12px; font-weight: 400">site settings</small></div>
        <div class="page-desc">官网的名称、SEO 信息与联系方式，保存后前台页面即时生效</div>
      </div>
      <div class="page-actions">
        <el-button :icon="TopRight" @click="openSite">查看前台</el-button>
      </div>
    </div>

    <div v-loading="loading">
      <!-- 站点信息 -->
      <PanelCard title="标题与 SEO" en="title &amp; seo" subtitle="显示在浏览器标签页与搜索结果里">
        <template #extra>
          <span class="t4" style="font-size: 12px">前台 &lt;head&gt;</span>
        </template>

        <div class="field-grid">
          <div class="field">
            <div class="field-label">站点名称 <span class="en">site name</span></div>
            <el-input v-model="form.site_name" maxlength="40" placeholder="例如 启明大学" />
            <div class="field-hint">出现在浏览器标签页、页头校名与页脚版权信息中</div>
          </div>

          <div class="field">
            <div class="field-label">校训 / 标语 <span class="en">slogan</span></div>
            <el-input v-model="form.site_slogan" maxlength="60" placeholder="例如 明德 · 格物 · 笃行 · 致远" />
            <div class="field-hint">展示在官网顶部工具条左侧</div>
          </div>
        </div>

        <div class="field">
          <div class="field-label">关键词 <span class="en">keywords</span></div>
          <el-input v-model="form.site_keywords" maxlength="160" placeholder="多个关键词用英文逗号分隔" />
          <div class="field-hint">供搜索引擎参考，建议 3-8 个关键词</div>
        </div>

        <div class="field">
          <div class="field-label">站点描述 <span class="en">description</span></div>
          <el-input
            v-model="form.site_description"
            type="textarea"
            :rows="3"
            maxlength="255"
            show-word-limit
            placeholder="一句话介绍学校，用于搜索引擎摘要与页脚简介"
          />
          <div class="field-hint">建议 80-160 字符，同时用于页脚「学校简介」段落</div>
        </div>
      </PanelCard>

      <!-- 联系方式 -->
      <PanelCard title="联系方式" en="contact" subtitle="页脚与「联系我们」页面统一读取这里的配置">
        <div class="field-grid">
          <div class="field">
            <div class="field-label">学校地址 <span class="en">address</span></div>
            <el-input v-model="form.address" maxlength="120" />
          </div>
          <div class="field">
            <div class="field-label">邮政编码 <span class="en">postcode</span></div>
            <el-input v-model="form.postcode" maxlength="10" />
          </div>
          <div class="field">
            <div class="field-label">总机电话 <span class="en">phone</span></div>
            <el-input v-model="form.phone" maxlength="30" />
          </div>
          <div class="field">
            <div class="field-label">招生咨询电话 <span class="en">admission phone</span></div>
            <el-input v-model="form.admission_phone" maxlength="30" />
          </div>
          <div class="field">
            <div class="field-label">联系邮箱 <span class="en">email</span></div>
            <el-input v-model="form.email" maxlength="60" />
          </div>
          <div class="field">
            <div class="field-label">备案号 <span class="en">icp</span></div>
            <el-input v-model="form.icp" maxlength="60" placeholder="例如 京ICP备2025000000号-1" />
          </div>
        </div>

        <div class="field" style="margin-bottom: 0">
          <div class="field-label">版权信息 <span class="en">copyright</span></div>
          <el-input v-model="form.copyright" maxlength="80" placeholder="例如 © 2020-2026 启明大学 版权所有" />
        </div>

        <FormFooterBar
          :dirty="dirty"
          :loading="saving"
          latest-text="站点设置已是最新"
          @save="handleSave"
          @reset="resetForm"
        />
      </PanelCard>

      <!-- 前台预览 -->
      <PanelCard title="前台效果预览" en="preview" subtitle="以下信息将展示在官网页头与页脚">
        <div class="preview">
          <div class="preview-head">
            <div class="logo">{{ (form.site_name || '启').slice(0, 1) }}</div>
            <div>
              <div class="name">{{ form.site_name || '站点名称' }}</div>
              <div class="slogan">{{ form.site_slogan || '校训 / 标语' }}</div>
            </div>
            <el-button link type="primary" @click="openSite">前往前台查看 ›</el-button>
          </div>
          <div class="preview-foot">
            <div>
              <span class="label">地址</span>{{ form.address || '—' }}
            </div>
            <div>
              <span class="label">电话</span>{{ form.phone || '—' }}
            </div>
            <div>
              <span class="label">邮箱</span>{{ form.email || '—' }}
            </div>
            <div>
              <span class="label">备案</span>{{ form.icp || '—' }}
            </div>
            <div>
              <span class="label">版权</span>{{ form.copyright || '—' }}
            </div>
          </div>
        </div>
      </PanelCard>

      <div style="height: 16px" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { TopRight } from '@element-plus/icons-vue';
import { cmsApi } from '@/api';
import FormFooterBar from '@/components/FormFooterBar.vue';
import PanelCard from '@/components/PanelCard.vue';
import { siteUrl } from '@/utils/env';


const loading = ref(false);
const saving = ref(false);

const KEYS = [
  'site_name',
  'site_slogan',
  'site_keywords',
  'site_description',
  'address',
  'postcode',
  'phone',
  'admission_phone',
  'email',
  'icp',
  'copyright',
] as const;

type SettingKey = (typeof KEYS)[number];

function emptyForm(): Record<SettingKey, string> {
  return KEYS.reduce(
    (acc, key) => ({ ...acc, [key]: '' }),
    {} as Record<SettingKey, string>,
  );
}

const form = reactive(emptyForm());
let snapshot = JSON.stringify(emptyForm());

const dirty = computed(() => JSON.stringify(form) !== snapshot);

function resetForm() {
  Object.assign(form, JSON.parse(snapshot));
}

function openSite() {
  window.open(siteUrl, '_blank');
}

async function load() {
  loading.value = true;
  try {
    const items = await cmsApi.settings();
    for (const item of items) {
      if ((KEYS as readonly string[]).includes(item.key)) {
        form[item.key as SettingKey] = item.value ?? '';
      }
    }
    snapshot = JSON.stringify(form);
  } finally {
    loading.value = false;
  }
}

async function handleSave() {
  if (!form.site_name.trim()) {
    ElMessage.warning('站点名称不能为空');
    return;
  }
  saving.value = true;
  try {
    await cmsApi.updateSettings(KEYS.map((key) => ({ key, value: form[key] ?? '' })));
    ElMessage.success('站点设置已保存，前台即刻生效');
    snapshot = JSON.stringify(form);
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<style scoped lang="scss">
.preview {
  border: 1px solid var(--c-border-light);
  border-radius: var(--radius);
  overflow: hidden;
}
.preview-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 20px;
  background: linear-gradient(120deg, #12307a, #1a4fd6);
  color: #fff;

  .logo {
    width: 40px;
    height: 40px;
    border-radius: 11px;
    background: rgba(255, 255, 255, 0.18);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    font-weight: 600;
  }
  .name {
    font-size: 16px;
    font-weight: 600;
  }
  .slogan {
    font-size: 12px;
    opacity: 0.78;
  }
  :deep(.el-button) {
    margin-left: auto;
    color: #fff;
  }
}
.preview-foot {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 24px;
  padding: 16px 20px;
  background: #fafbfc;
  font-size: 13px;
  color: var(--c-text-2);

  .label {
    display: inline-block;
    width: 42px;
    color: var(--c-text-4);
  }
}
</style>
