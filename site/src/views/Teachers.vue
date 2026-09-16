<template>
  <div>
    <div class="crumb-bar">
      <div class="container">
        <div class="page-title">师资队伍</div>
        <div class="crumb">
          <router-link to="/">首页</router-link> / <b>师资队伍</b>
        </div>
      </div>
    </div>

    <section class="page-section">
      <div class="container">
        <p v-reveal class="lead">
          学校现有在职专任教师 {{ teachers.length }} 人，其中教授、副教授占比过半，形成了一支结构合理、
          教学与工程实践能力兼备的师资队伍。
        </p>

        <div class="filters">
          <button :class="{ on: !departmentId }" @click="selectDepartment(undefined)">全部院系</button>
          <button
            v-for="dept in departments"
            :key="dept.id"
            :class="{ on: departmentId === dept.id }"
            @click="selectDepartment(dept.id)"
          >
            {{ dept.name }}
          </button>
        </div>

        <div v-if="loading" class="grid">
          <div v-for="i in 8" :key="i" class="skeleton" style="height: 96px" />
        </div>
        <div v-else-if="teachers.length" v-reveal class="grid">
          <article v-for="teacher in teachers" :key="teacher.id" class="teacher card">
            <div class="avatar" :class="{ female: teacher.gender === '女' }">{{ teacher.name.slice(0, 1) }}</div>
            <div class="info">
              <div class="name">
                {{ teacher.name }}
                <span class="title-tag">{{ teacher.title }}</span>
              </div>
              <div class="dept">{{ teacher.department_name || '公共教学部' }}</div>
              <div class="meta">
                <span v-if="teacher.email">{{ teacher.email }}</span>
                <span>主讲 {{ teacher.offering_count }} 门次课程</span>
              </div>
            </div>
          </article>
        </div>
        <div v-else class="empty">该院系暂无教师信息</div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { publicApi, type DepartmentInfo, type TeacherInfo } from '@/api';
import { loadSite, useSeo } from '@/store/site';

const route = useRoute();
const router = useRouter();

const teachers = ref<TeacherInfo[]>([]);
const departments = ref<DepartmentInfo[]>([]);
const departmentId = ref<number | undefined>(undefined);
const loading = ref(true);

async function load() {
  loading.value = true;
  try {
    teachers.value = await publicApi.teachers(
      departmentId.value ? { departmentId: departmentId.value } : undefined,
    );
  } finally {
    loading.value = false;
  }
}

function selectDepartment(id?: number) {
  departmentId.value = id;
  router.replace({ path: '/teachers', query: id ? { departmentId: String(id) } : {} });
  load();
}

onMounted(async () => {
  await loadSite();
  useSeo('师资队伍', '启明大学师资队伍介绍，按院系查询教师职称与主讲课程。');
  departments.value = await publicApi.departments();

  // 兼容通过院系名称跳转（首页师资卡片）
  const query = route.query.departmentId;
  if (typeof query === 'string' && query) {
    const numeric = Number(query);
    if (Number.isFinite(numeric) && String(numeric) === query) {
      departmentId.value = numeric;
    } else {
      const matched = departments.value.find((item) => item.name === query);
      if (matched) departmentId.value = matched.id;
    }
  }
  await load();
});

watch(departmentId, () => useSeo('师资队伍', '启明大学师资队伍介绍，按院系查询教师职称与主讲课程。'));
</script>

<style scoped lang="scss">
.lead {
  max-width: 760px;
  margin-bottom: 28px;
  font-size: 15px;
  color: var(--text-2);
}
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 30px;

  button {
    height: 36px;
    padding: 0 16px;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: var(--bg-1);
    color: var(--text-2);
    font-size: 13px;
    cursor: pointer;
    transition: all 0.24s var(--ease);

    &:hover {
      border-color: rgba(31, 95, 224, 0.4);
      color: var(--text-1);
      background: rgba(31, 95, 224, 0.06);
    }
    &.on {
      background: var(--grad-primary);
      border-color: transparent;
      color: #fff;
      font-weight: 600;
      box-shadow: 0 8px 22px rgba(40, 130, 240, 0.3);
    }
  }
}
.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
.teacher {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px;

  .avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 54px;
    height: 54px;
    flex: 0 0 auto;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(77, 141, 255, 0.26), rgba(6, 182, 212, 0.16));
    border: 1px solid rgba(31, 95, 224, 0.24);
    color: var(--c-blue);
    font-size: 21px;
    font-weight: 600;

    &.female {
      background: linear-gradient(135deg, rgba(236, 72, 153, 0.14), rgba(124, 58, 237, 0.12));
      border-color: rgba(236, 72, 153, 0.26);
      color: #a21caf;
    }
  }
  .info {
    min-width: 0;
  }
  .name {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-1);
  }
  .title-tag {
    font-family: var(--mono);
    font-size: 10px;
    letter-spacing: 0.08em;
    color: var(--c-amber);
    background: rgba(217, 119, 6, 0.1);
    border: 1px solid rgba(217, 119, 6, 0.24);
    padding: 2px 7px;
    border-radius: 5px;
  }
  .dept {
    margin-top: 4px;
    font-size: 12.5px;
    color: var(--text-3);
  }
  .meta {
    margin-top: 3px;
    display: flex;
    flex-direction: column;
    gap: 1px;
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.04em;
    color: var(--text-4);
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

@media (max-width: 1000px) {
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 620px) {
  .grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
