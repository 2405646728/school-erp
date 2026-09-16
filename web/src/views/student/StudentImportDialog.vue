<template>
  <el-dialog
    :model-value="modelValue"
    title="批量导入学生"
    width="820px"
    :close-on-click-modal="false"
    @update:model-value="emit('update:modelValue', $event)"
    @open="reset"
  >
    <el-steps :active="step" simple style="margin-bottom: 18px">
      <el-step title="选择文件" :icon="Upload" />
      <el-step title="数据预览" :icon="View" />
      <el-step title="导入结果" :icon="CircleCheck" />
    </el-steps>

    <!-- 第一步：选择文件 -->
    <template v-if="step === 0">
      <el-upload
        drag
        :auto-upload="false"
        :show-file-list="false"
        accept=".csv,.txt"
        :on-change="handleFile"
      >
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">将 CSV 文件拖到此处，或<em>点击选择文件</em></div>
        <template #tip>
          <div class="el-upload__tip">
            支持 UTF-8 / GBK 编码的 <b>.csv</b> 文件，单次最多 2000 行
          </div>
        </template>
      </el-upload>

      <div class="import-tip">
        <div class="tip-title">表头要求（中英文表头均可，顺序不限）</div>
        <div class="tip-body mono">{{ headerHint }}</div>
        <div class="tip-note">
          其中「班级」填写班级名称或班级编号，系统会自动匹配；未匹配到班级时该生将保持“未分班”状态。
        </div>
        <el-button link type="primary" :icon="MagicStick" @click="fillSample">填入示例数据预览</el-button>
      </div>
    </template>

    <!-- 第二步：预览 -->
    <template v-else-if="step === 1">
      <el-alert
        :title="`共解析到 ${rows.length} 条记录，请确认后点击「开始导入」`"
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom: 12px"
      />
      <el-table :data="rows.slice(0, 8)" size="small" max-height="320" border>
        <el-table-column type="index" label="#" width="50" />
        <el-table-column
          v-for="column in previewColumns"
          :key="column"
          :prop="column"
          :label="column"
          min-width="110"
          show-overflow-tooltip
        />
      </el-table>
      <div v-if="rows.length > 8" class="t3" style="margin-top: 8px; font-size: 12px">
        仅预览前 8 条，导入时将处理全部 {{ rows.length }} 条记录
      </div>
    </template>

    <!-- 第三步：结果 -->
    <template v-else>
      <el-result
        :icon="result?.failed ? 'warning' : 'success'"
        :title="`导入完成：成功 ${result?.success ?? 0} 条，失败 ${result?.failed ?? 0} 条`"
        :sub-title="`共提交 ${result?.total ?? 0} 条记录`"
      >
        <template #extra>
          <el-button type="primary" @click="closeAndRefresh">完成</el-button>
        </template>
      </el-result>

      <el-table v-if="result?.errors.length" :data="result.errors" size="small" max-height="240" border>
        <el-table-column prop="row" label="行号" width="80" />
        <el-table-column prop="message" label="失败原因" />
      </el-table>
    </template>

    <template #footer>
      <template v-if="step === 1">
        <el-button @click="step = 0">上一步</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">开始导入</el-button>
      </template>
      <template v-else-if="step === 0">
        <el-button @click="emit('update:modelValue', false)">取消</el-button>
        <el-button type="primary" :disabled="!rows.length" @click="step = 1">下一步</el-button>
      </template>
      <template v-else>
        <el-button type="primary" @click="closeAndRefresh">关闭</el-button>
      </template>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { CircleCheck, MagicStick, Upload, UploadFilled, View } from '@element-plus/icons-vue';
import { studentApi } from '@/api';
import type { ImportResult } from '@/types';

defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [boolean]; imported: [] }>();

const step = ref(0);
const submitting = ref(false);
const rows = ref<Record<string, string>[]>([]);
const result = ref<ImportResult | null>(null);

const headerHint =
  '学号, 姓名, 性别, 班级, 入学年份, 学籍状态, 政治面貌, 民族, 籍贯, 手机号, 邮箱, 监护人, 监护人电话, 宿舍';

const previewColumns = computed(() => (rows.value.length ? Object.keys(rows.value[0]) : []));

function reset() {
  step.value = 0;
  rows.value = [];
  result.value = null;
  submitting.value = false;
}

/** 轻量 CSV 解析：支持引号包裹、逗号与换行 */
function parseCsv(text: string): Record<string, string>[] {
  const content = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const records: string[][] = [];
  let field = '';
  let record: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    if (inQuotes) {
      if (char === '"' && content[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      record.push(field.trim());
      field = '';
    } else if (char === '\n') {
      record.push(field.trim());
      records.push(record);
      record = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field || record.length) {
    record.push(field.trim());
    records.push(record);
  }

  const [header, ...body] = records.filter((item) => item.some((cell) => cell !== ''));
  if (!header) return [];
  return body.map((cells) => {
    const row: Record<string, string> = {};
    header.forEach((key, index) => {
      row[key] = cells[index] ?? '';
    });
    return row;
  });
}

function handleFile(file: { raw?: File }) {
  const raw = file.raw;
  if (!raw) return;
  const reader = new FileReader();
  reader.onload = () => {
    const parsed = parseCsv(String(reader.result ?? ''));
    if (!parsed.length) {
      ElMessage.warning('未解析到有效数据，请检查文件内容');
      return;
    }
    rows.value = parsed;
    ElMessage.success(`已解析 ${parsed.length} 条记录`);
    step.value = 1;
  };
  reader.readAsText(raw, 'UTF-8');
}

function fillSample() {
  rows.value = [
    {
      学号: '2025080901901',
      姓名: '李明轩',
      性别: '男',
      班级: '计算机科学与技术2025级1班',
      入学年份: '2025',
      学籍状态: '在读',
      政治面貌: '共青团员',
      民族: '汉族',
      籍贯: '江苏省南京市',
      手机号: '13800001111',
      邮箱: '2025080901901@stu.university.edu.cn',
      监护人: '李建国',
      监护人电话: '13900002222',
      宿舍: '紫荆公寓3号楼-502',
    },
    {
      学号: '2025080901902',
      姓名: '王雨涵',
      性别: '女',
      班级: '计算机科学与技术2025级1班',
      入学年份: '2025',
      学籍状态: '在读',
      政治面貌: '共青团员',
      民族: '汉族',
      籍贯: '浙江省杭州市',
      手机号: '13800003333',
      邮箱: '2025080901902@stu.university.edu.cn',
      监护人: '王海燕',
      监护人电话: '13900004444',
      宿舍: '紫荆公寓5号楼-308',
    },
  ];
  step.value = 1;
}

async function submit() {
  submitting.value = true;
  try {
    result.value = await studentApi.import(rows.value as Record<string, unknown>[]);
    step.value = 2;
    emit('imported');
  } finally {
    submitting.value = false;
  }
}

function closeAndRefresh() {
  emit('update:modelValue', false);
}
</script>

<style scoped lang="scss">
.import-tip {
  margin-top: 16px;
  padding: 14px 16px;
  background: var(--c-fill-2);
  border: 1px dashed var(--c-border);
  border-radius: var(--radius);

  .tip-title {
    font-size: 13px;
    font-weight: 500;
    margin-bottom: 8px;
  }
  .tip-body {
    font-size: 12px;
    color: var(--c-text-2);
    line-height: 20px;
    word-break: break-all;
  }
  .tip-note {
    margin: 8px 0;
    font-size: 12px;
    color: var(--c-text-3);
    line-height: 18px;
  }
}
</style>
