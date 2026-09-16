<template>
  <div>
    <div class="crumb-bar">
      <div class="container">
        <div class="page-title">院系与专业</div>
        <div class="crumb">
          <router-link to="/">首页</router-link> / <b>院系专业</b>
        </div>
      </div>
    </div>

    <section class="page-section">
      <div class="container">
        <p v-reveal class="lead">
          学校现设 {{ departments.length }} 个学院，共
          {{ departments.reduce((sum, item) => sum + item.major_count, 0) }} 个本科专业，
          覆盖工学、理学、经济学、管理学、文学等多个学科门类。
        </p>

        <div v-if="loading" class="dept-list">
          <div v-for="i in 3" :key="i" class="skeleton" style="height: 180px; margin-bottom: 18px" />
        </div>

        <div v-else class="dept-list">
          <section
            v-for="(dept, index) in departments"
            :id="`dept-${dept.id}`"
            :key="dept.id"
            v-reveal="`${Math.min(index, 4) * 60}ms`"
            class="dept card"
          >
            <header class="dept-head">
              <div class="left">
                <div class="badge">{{ dept.code }}</div>
                <div>
                  <h2>{{ dept.name }}</h2>
                  <div class="sub">
                    <span v-if="dept.dean">院长：{{ dept.dean }}</span>
                    <span v-if="dept.office">办公地点：{{ dept.office }}</span>
                    <span v-if="dept.phone">电话：{{ dept.phone }}</span>
                  </div>
                </div>
              </div>
              <div class="counts">
                <div><b>{{ dept.major_count }}</b><span>本科专业</span></div>
                <div><b>{{ dept.teacher_count }}</b><span>专任教师</span></div>
                <div><b>{{ dept.student_count }}</b><span>在读学生</span></div>
              </div>
            </header>

            <p v-if="dept.description" class="desc">{{ dept.description }}</p>

            <div class="majors">
              <div v-for="major in dept.majors" :key="major.id" class="major">
                <div class="major-head">
                  <span class="name">{{ major.name }}</span>
                  <span class="code">{{ major.code }}</span>
                </div>
                <div class="major-meta">
                  <span>{{ major.degree_type }}</span>
                  <span>学制 {{ major.duration_years }} 年</span>
                  <span>现有 {{ major.class_count }} 个班级</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { publicApi, type DepartmentInfo } from '@/api';
import { loadSite, useSeo } from '@/store/site';

const departments = ref<DepartmentInfo[]>([]);
const loading = ref(true);

onMounted(async () => {
  await loadSite();
  useSeo('院系专业', '启明大学院系与本科专业设置，含专业代码、学位类型与学制信息。');
  try {
    departments.value = await publicApi.departments();
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped lang="scss">
.lead {
  max-width: 760px;
  margin-bottom: 34px;
  font-size: 15px;
  color: var(--text-2);
}
.dept-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.dept {
  padding: 28px 30px;
  scroll-margin-top: 110px;

  &:hover {
    transform: none;
  }
}
.dept-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;

  .left {
    display: flex;
    gap: 16px;
    align-items: flex-start;
  }
  .badge {
    flex: 0 0 auto;
    width: 48px;
    height: 48px;
    border-radius: 13px;
    background: var(--grad-primary);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--mono);
    font-size: 17px;
    font-weight: 700;
    box-shadow: 0 10px 26px rgba(40, 130, 240, 0.38);
  }
  h2 {
    font-size: 21px;
    letter-spacing: -0.015em;
    margin-bottom: 8px;
  }
  .sub {
    display: flex;
    flex-wrap: wrap;
    gap: 18px;
    font-family: var(--mono);
    font-size: 11.5px;
    letter-spacing: 0.04em;
    color: var(--text-4);
  }
  .counts {
    display: flex;
    gap: 30px;

    div {
      text-align: center;
    }
    b {
      display: block;
      font-family: var(--mono);
      font-size: 24px;
      letter-spacing: -0.02em;
      background: var(--grad-primary);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    span {
      font-size: 11px;
      letter-spacing: 0.08em;
      color: var(--text-4);
    }
  }
}

.desc {
  margin: 20px 0 0;
  font-size: 14px;
  line-height: 1.9;
  color: var(--text-3);
}

.majors {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 22px;
  padding-top: 22px;
  border-top: 1px solid var(--line);
}
.major {
  padding: 15px 17px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--bg-1);
  transition: all 0.26s var(--ease);

  &:hover {
    border-color: rgba(31, 95, 224, 0.3);
    background: rgba(31, 95, 224, 0.06);
  }
  .major-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 8px;
  }
  .name {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-1);
  }
  .code {
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.06em;
    color: var(--text-4);
  }
  .major-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.04em;
    color: var(--text-4);
  }
}

@media (max-width: 900px) {
  .majors {
    grid-template-columns: minmax(0, 1fr);
  }
  .dept-head .counts {
    gap: 22px;
  }
  .dept {
    padding: 22px 18px;
  }
}
</style>
