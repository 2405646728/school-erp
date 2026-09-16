<template>
  <div>
    <div class="crumb-bar">
      <div class="container">
        <div class="page-title">课程资源</div>
        <div class="crumb">
          <router-link to="/">首页</router-link> / <b>课程资源</b>
        </div>
      </div>
    </div>

    <section class="page-section">
      <div class="container">
        <p v-reveal class="lead">
          学校共开设 {{ total }} 门本科课程，涵盖专业必修、专业选修与通识教育课程，
          其中通识课程面向全校学生开放选课。
        </p>

        <div class="toolbar">
          <div class="filters">
            <button :class="{ on: !departmentId }" @click="setDepartment(undefined)">全部院系</button>
            <button
              v-for="dept in departments"
              :key="dept.id"
              :class="{ on: departmentId === dept.id }"
              @click="setDepartment(dept.id)"
            >
              {{ dept.name }}
            </button>
          </div>
          <div class="search">
            <input v-model="keyword" placeholder="搜索课程名称或代码" @keydown.enter="load" />
            <button @click="load">搜索</button>
          </div>
        </div>

        <div v-if="loading" class="grid">
          <div v-for="i in 9" :key="i" class="skeleton" style="height: 120px" />
        </div>
        <div v-else-if="courses.length" v-reveal class="grid">
          <article v-for="course in courses" :key="course.id" class="course card">
            <div class="head">
              <span class="code">{{ course.course_code }}</span>
              <span class="type" :class="typeClass(course.course_type)">{{ course.course_type }}</span>
            </div>
            <h3>{{ course.name }}</h3>
            <p class="desc">{{ course.description }}</p>
            <div class="foot">
              <span>{{ course.credit }} 学分</span>
              <span>{{ course.hours }} 学时</span>
              <span class="dept">{{ course.department_name || '公共课' }}</span>
            </div>
          </article>
        </div>
        <div v-else class="empty">没有符合条件的课程</div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { publicApi, type CourseInfo, type DepartmentInfo } from '@/api';
import { loadSite, useSeo } from '@/store/site';

const courses = ref<CourseInfo[]>([]);
const departments = ref<DepartmentInfo[]>([]);
const departmentId = ref<number | undefined>(undefined);
const keyword = ref('');
const loading = ref(true);
const total = computed(() => courses.value.length);

function typeClass(type: string) {
  if (type === '必修') return 'must';
  if (type === '选修') return 'elective';
  if (type === '实践') return 'practice';
  return 'general';
}

async function load() {
  loading.value = true;
  try {
    courses.value = await publicApi.courses({
      departmentId: departmentId.value,
      keyword: keyword.value.trim() || undefined,
    });
  } finally {
    loading.value = false;
  }
}

function setDepartment(id?: number) {
  departmentId.value = id;
  load();
}

onMounted(async () => {
  await loadSite();
  useSeo('课程资源', '启明大学本科课程资源，包含课程代码、学分学时与开课院系。');
  departments.value = await publicApi.departments();
  await load();
});
</script>

<style scoped lang="scss">
.lead {
  max-width: 760px;
  margin-bottom: 28px;
  font-size: 15px;
  color: var(--text-2);
}
.toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 30px;
}
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  flex: 1;
  min-width: 260px;

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
.search {
  display: flex;
  gap: 8px;

  input {
    width: 220px;
    height: 38px;
    padding: 0 16px;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: var(--bg-1);
    outline: none;
    font-size: 13.5px;
    color: var(--text-1);

    &::placeholder {
      color: var(--text-4);
    }
    &:focus {
      border-color: rgba(31, 95, 224, 0.4);
      box-shadow: 0 0 0 4px rgba(77, 141, 255, 0.1);
    }
  }
  button {
    height: 38px;
    padding: 0 20px;
    border: 0;
    border-radius: 999px;
    background: var(--grad-primary);
    color: #fff;
    font-size: 13.5px;
    font-weight: 600;
    cursor: pointer;
    transition: filter 0.22s var(--ease);

    &:hover {
      filter: brightness(1.08);
    }
  }
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
.course {
  padding: 22px;
  display: flex;
  flex-direction: column;

  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  .code {
    font-family: var(--mono);
    font-size: 11.5px;
    letter-spacing: 0.08em;
    color: var(--text-4);
  }
  .type {
    font-family: var(--mono);
    font-size: 10.5px;
    letter-spacing: 0.08em;
    padding: 3px 9px;
    border-radius: 5px;

    &.must {
      color: var(--c-blue);
      background: rgba(31, 95, 224, 0.1);
      border: 1px solid rgba(31, 95, 224, 0.26);
    }
    &.elective {
      color: var(--c-amber);
      background: rgba(217, 119, 6, 0.1);
      border: 1px solid rgba(217, 119, 6, 0.24);
    }
    &.general {
      color: var(--c-mint);
      background: rgba(5, 150, 105, 0.1);
      border: 1px solid rgba(5, 150, 105, 0.24);
    }
    &.practice {
      color: var(--c-violet);
      background: rgba(124, 58, 237, 0.1);
      border: 1px solid rgba(124, 58, 237, 0.26);
    }
  }
  h3 {
    font-size: 17px;
    margin-bottom: 10px;
    color: var(--text-1);
  }
  .desc {
    flex: 1;
    margin: 0 0 16px;
    font-size: 13px;
    color: var(--text-3);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .foot {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    padding-top: 14px;
    border-top: 1px solid var(--line);
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.06em;
    color: var(--text-4);

    .dept {
      margin-left: auto;
      color: var(--c-cyan);
    }
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
  .search input {
    width: 140px;
  }
}
</style>
