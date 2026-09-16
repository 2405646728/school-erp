<template>
  <el-drawer
    :model-value="modelValue"
    :title="isEdit ? '编辑学生档案' : '新增学生'"
    size="720px"
    :close-on-click-modal="false"
    @update:model-value="emit('update:modelValue', $event)"
    @open="handleOpen"
  >
    <div v-loading="loading" class="student-form">
      <div class="form-section">
        <div class="section-title">基本信息 <small>basic profile</small></div>
        <div class="field-grid">
          <div class="field">
            <div class="field-label">学号 <span class="en">student no.</span><span class="req">*</span></div>
            <el-input
              v-model="form.studentNo"
              :disabled="isEdit"
              placeholder="例如 2025080901001"
              maxlength="30"
            />
            <div class="field-hint">学号同时作为学生登录账号，创建后不可修改</div>
          </div>

          <div class="field">
            <div class="field-label">姓名 <span class="en">name</span><span class="req">*</span></div>
            <el-input v-model="form.name" placeholder="请输入真实姓名" maxlength="30" />
          </div>

          <div class="field">
            <div class="field-label">性别 <span class="en">gender</span></div>
            <el-radio-group v-model="form.gender">
              <el-radio v-for="item in GENDER_OPTIONS" :key="item" :value="item">{{ item }}</el-radio>
            </el-radio-group>
          </div>

          <div class="field">
            <div class="field-label">出生日期 <span class="en">birth date</span></div>
            <el-date-picker
              v-model="form.birthDate"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="选择日期"
              style="width: 100%"
            />
          </div>

          <div class="field">
            <div class="field-label">身份证号 <span class="en">id card</span></div>
            <el-input v-model="form.idCard" placeholder="18 位身份证号" maxlength="30" />
          </div>

          <div class="field">
            <div class="field-label">政治面貌 <span class="en">political status</span></div>
            <el-select v-model="form.politicalStatus" style="width: 100%">
              <el-option v-for="item in POLITICAL_STATUS" :key="item" :label="item" :value="item" />
            </el-select>
          </div>
        </div>
      </div>

      <div class="form-section">
        <div class="section-title">学籍归属 <small>academic affiliation</small></div>
        <div class="field-grid">
          <div class="field">
            <div class="field-label">院系 <span class="en">department</span></div>
            <el-select
              v-model="form.departmentId"
              placeholder="请选择院系"
              style="width: 100%"
              filterable
              @change="handleDepartmentChange"
            >
              <el-option
                v-for="item in departmentOptions"
                :key="item.id"
                :label="`${item.code} ${item.name}`"
                :value="item.id"
              />
            </el-select>
            <div class="field-hint">用于筛选专业，不直接保存到学生档案</div>
          </div>

          <div class="field">
            <div class="field-label">专业 <span class="en">major</span></div>
            <el-select
              v-model="form.majorId"
              placeholder="请先选择院系"
              style="width: 100%"
              filterable
              :disabled="!form.departmentId"
              @change="handleMajorChange"
            >
              <el-option
                v-for="item in majorOptions"
                :key="item.id"
                :label="`${item.code} ${item.name}`"
                :value="item.id"
              />
            </el-select>
          </div>

          <div class="field">
            <div class="field-label">班级 <span class="en">class</span></div>
            <el-select
              v-model="form.classId"
              placeholder="请先选择专业"
              style="width: 100%"
              filterable
              clearable
              :disabled="!form.majorId"
            >
              <el-option
                v-for="item in classOptions"
                :key="item.id"
                :label="`${item.name}（${item.code}）`"
                :value="item.id"
              />
            </el-select>
          </div>

          <div class="field">
            <div class="field-label">入学年份 <span class="en">enroll year</span></div>
            <el-select v-model="form.enrollYear" style="width: 100%">
              <el-option v-for="year in gradeYearOptions()" :key="year" :label="`${year} 年`" :value="year" />
            </el-select>
          </div>

          <div class="field">
            <div class="field-label">学籍状态 <span class="en">status</span></div>
            <el-select v-model="form.status" style="width: 100%">
              <el-option v-for="item in STUDENT_STATUS" :key="item" :label="item" :value="item" />
            </el-select>
          </div>

          <div class="field">
            <div class="field-label">宿舍 <span class="en">dormitory</span></div>
            <el-input v-model="form.dormitory" placeholder="例如 紫荆公寓3号楼-502" maxlength="30" />
          </div>
        </div>
      </div>

      <div class="form-section">
        <div class="section-title">联系方式 <small>contact</small></div>
        <div class="field-grid">
          <div class="field">
            <div class="field-label">手机号 <span class="en">phone</span></div>
            <el-input v-model="form.phone" placeholder="11 位手机号" maxlength="20" />
          </div>
          <div class="field">
            <div class="field-label">邮箱 <span class="en">email</span></div>
            <el-input v-model="form.email" placeholder="name@stu.university.edu.cn" maxlength="60" />
          </div>
          <div class="field">
            <div class="field-label">监护人 <span class="en">guardian</span></div>
            <el-input v-model="form.guardianName" placeholder="监护人姓名" maxlength="30" />
          </div>
          <div class="field">
            <div class="field-label">监护人电话 <span class="en">guardian phone</span></div>
            <el-input v-model="form.guardianPhone" placeholder="监护人联系电话" maxlength="20" />
          </div>
        </div>

        <div class="field">
          <div class="field-label">籍贯 <span class="en">native place</span></div>
          <el-input v-model="form.nativePlace" placeholder="例如 江苏省南京市" maxlength="60" />
        </div>

        <div class="field">
          <div class="field-label">家庭住址 <span class="en">address</span></div>
          <el-input v-model="form.address" placeholder="请输入详细家庭住址" maxlength="150" />
        </div>

        <div class="field">
          <div class="field-label">备注 <span class="en">remark</span></div>
          <el-input
            v-model="form.remark"
            type="textarea"
            :rows="2"
            maxlength="255"
            show-word-limit
            placeholder="选填，例如转专业、交换生等补充说明"
          />
        </div>
      </div>

      <FormFooterBar :dirty="dirty" :loading="saving" @save="handleSubmit" @reset="resetForm" />
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { classApi, departmentApi, majorApi, studentApi } from '@/api';
import FormFooterBar from '@/components/FormFooterBar.vue';
import type { Option, StudentDetail } from '@/types';
import {
  GENDER_OPTIONS,
  POLITICAL_STATUS,
  STUDENT_STATUS,
  gradeYearOptions,
} from '@/utils/dict';

const props = defineProps<{ modelValue: boolean; studentId: number | null }>();
const emit = defineEmits<{ 'update:modelValue': [boolean]; saved: [] }>();

const isEdit = computed(() => props.studentId !== null);
const loading = ref(false);
const saving = ref(false);

const departmentOptions = ref<Option[]>([]);
const majorOptions = ref<Option[]>([]);
const classOptions = ref<Option[]>([]);

function emptyForm() {
  return {
    studentNo: '',
    name: '',
    gender: '男',
    birthDate: '',
    idCard: '',
    phone: '',
    email: '',
    departmentId: null as number | null,
    majorId: null as number | null,
    classId: null as number | null,
    enrollYear: new Date().getFullYear(),
    status: '在读',
    politicalStatus: '共青团员',
    ethnicity: '汉族',
    nativePlace: '',
    address: '',
    guardianName: '',
    guardianPhone: '',
    dormitory: '',
    remark: '',
  };
}

const form = reactive(emptyForm());
let snapshot = JSON.stringify(emptyForm());

const dirty = computed(() => JSON.stringify(form) !== snapshot);

function resetForm() {
  Object.assign(form, JSON.parse(snapshot));
}

async function loadDepartments() {
  if (departmentOptions.value.length) return;
  departmentOptions.value = await departmentApi.options();
}

async function handleDepartmentChange(value: number | null) {
  form.majorId = null;
  form.classId = null;
  majorOptions.value = [];
  classOptions.value = [];
  if (value) majorOptions.value = await majorApi.options(value);
}

async function handleMajorChange(value: number | null) {
  form.classId = null;
  classOptions.value = [];
  if (value) classOptions.value = await classApi.options(value);
}

async function handleOpen() {
  loading.value = true;
  try {
    await loadDepartments();

    if (isEdit.value && props.studentId) {
      const detail: StudentDetail = await studentApi.detail(props.studentId);
      form.studentNo = detail.student_no;
      form.name = detail.name;
      form.gender = detail.gender;
      form.birthDate = detail.birth_date ?? '';
      form.idCard = detail.id_card ?? '';
      form.phone = detail.phone ?? '';
      form.email = detail.email ?? '';
      form.departmentId = detail.department_id ?? null;
      form.majorId = detail.major_id ?? null;
      form.classId = detail.class_id ?? null;
      form.enrollYear = detail.enroll_year;
      form.status = detail.status;
      form.politicalStatus = detail.political_status;
      form.ethnicity = detail.ethnicity ?? '';
      form.nativePlace = detail.native_place ?? '';
      form.address = detail.address ?? '';
      form.guardianName = detail.guardian_name ?? '';
      form.guardianPhone = detail.guardian_phone ?? '';
      form.dormitory = detail.dormitory ?? '';
      form.remark = detail.remark ?? '';

      if (form.departmentId) majorOptions.value = await majorApi.options(form.departmentId);
      if (form.majorId) classOptions.value = await classApi.options(form.majorId);
    } else {
      Object.assign(form, emptyForm());
      majorOptions.value = [];
      classOptions.value = [];
    }

    snapshot = JSON.stringify(form);
  } finally {
    loading.value = false;
  }
}

async function handleSubmit() {
  if (!isEdit.value && !form.studentNo.trim()) {
    ElMessage.warning('请填写学号');
    return;
  }
  if (!form.name.trim()) {
    ElMessage.warning('请填写姓名');
    return;
  }

  const payload = {
    name: form.name.trim(),
    gender: form.gender,
    birthDate: form.birthDate || null,
    idCard: form.idCard || null,
    phone: form.phone || null,
    email: form.email || null,
    classId: form.classId,
    enrollYear: form.enrollYear,
    status: form.status,
    politicalStatus: form.politicalStatus,
    ethnicity: form.ethnicity || null,
    nativePlace: form.nativePlace || null,
    address: form.address || null,
    guardianName: form.guardianName || null,
    guardianPhone: form.guardianPhone || null,
    dormitory: form.dormitory || null,
    remark: form.remark || null,
  };

  saving.value = true;
  try {
    if (isEdit.value && props.studentId) {
      await studentApi.update(props.studentId, payload);
      ElMessage.success('学生档案已保存');
    } else {
      await studentApi.create({ studentNo: form.studentNo.trim(), ...payload });
      ElMessage.success('学生已创建，登录账号为学号，初始密码 123456');
    }
    snapshot = JSON.stringify(form);
    emit('saved');
    emit('update:modelValue', false);
  } finally {
    saving.value = false;
  }
}

watch(
  () => props.modelValue,
  (visible) => {
    if (!visible) loading.value = false;
  },
);
</script>

<style scoped lang="scss">
.form-section {
  margin-bottom: 8px;

  & + .form-section {
    margin-top: 22px;
    padding-top: 20px;
    border-top: 1px solid var(--c-border-light);
  }
}
.section-title {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 14px;
  font-size: 14px;
  font-weight: 600;

  small {
    font-size: 12px;
    font-weight: 400;
    color: var(--c-text-4);
  }
}
</style>
