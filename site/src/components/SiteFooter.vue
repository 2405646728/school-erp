<template>
  <footer class="site-footer">
    <div class="glow-line" />
    <div class="container">
      <div class="cols">
        <div class="col brand-col">
          <div class="brand">
            <span class="logo">启</span>
            <div>
              <div class="cn">{{ setting('site_name', '启明大学') }}</div>
              <div class="en mono">QIMING UNIVERSITY</div>
            </div>
          </div>
          <p class="intro">{{ setting('site_description') }}</p>
          <div class="status mono">
            <span class="pulse-dot" />
            系统运行正常
          </div>
        </div>

        <div class="col">
          <h4 class="mono">// 快速导航</h4>
          <ul>
            <li v-for="item in quickLinks" :key="item.path">
              <router-link :to="item.path">{{ item.label }}</router-link>
            </li>
          </ul>
        </div>

        <div class="col">
          <h4 class="mono">// 教学单位</h4>
          <ul>
            <li v-for="dept in departmentLinks" :key="dept.id">
              <router-link :to="`/departments#dept-${dept.id}`">{{ dept.name }}</router-link>
            </li>
          </ul>
        </div>

        <div class="col">
          <h4 class="mono">// 联系我们</h4>
          <ul class="contact mono">
            <li>
              <span class="label">地址</span>
              <span class="value">{{ setting('address', '北京市海淀区启明路 1 号') }}</span>
            </li>
            <li>
              <span class="label">邮编</span>
              <span class="value">{{ setting('postcode', '100084') }}</span>
            </li>
            <li>
              <span class="label">电话</span>
              <span class="value">{{ setting('phone', '010-62785000') }}</span>
            </li>
            <li>
              <span class="label">招生</span>
              <span class="value">{{ setting('admission_phone', '010-62785100') }}</span>
            </li>
            <li>
              <span class="label">邮箱</span>
              <span class="value">{{ setting('email', 'office@university.edu.cn') }}</span>
            </li>
          </ul>
        </div>
      </div>

      <div class="bottom mono">
        <span>{{ setting('copyright', '© 启明大学 版权所有') }}</span>
        <span class="dot">·</span>
        <span>{{ setting('icp') }}</span>
        <a :href="adminUrl" target="_blank" rel="noopener" class="admin-link">管理后台 →</a>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { publicApi, type DepartmentInfo } from '@/api';
import { adminUrl, setting } from '@/store/site';

const departments = ref<DepartmentInfo[]>([]);

const quickLinks = [
  { label: '学校概况', path: '/page/about' },
  { label: '院系专业', path: '/departments' },
  { label: '师资队伍', path: '/teachers' },
  { label: '课程资源', path: '/courses' },
  { label: '新闻公告', path: '/news' },
  { label: '招生信息', path: '/page/admissions' },
];

const departmentLinks = computed(() => departments.value.slice(0, 6));

onMounted(async () => {
  try {
    departments.value = await publicApi.departments();
  } catch {
    /* 页脚教学单位加载失败不影响主体内容 */
  }
});
</script>

<style scoped lang="scss">
.site-footer {
  position: relative;
  margin-top: 0;
  padding: 64px 0 0;
  background: var(--dark-bg);
  color: var(--dark-text-2);
  font-size: 13.5px;
}
.glow-line {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--grad-primary);
}

.cols {
  display: grid;
  grid-template-columns: 1.6fr 1fr 1.1fr 1.3fr;
  gap: 36px;
  padding-bottom: 42px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;

  .logo {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border-radius: 11px;
    background: var(--grad-primary);
    color: #fff;
    font-size: 18px;
    font-weight: 700;
    box-shadow: 0 8px 20px rgba(31, 95, 224, 0.35);
  }
  .cn {
    color: #fff;
    font-size: 16px;
    font-weight: 600;
    letter-spacing: 0.02em;
  }
  .en {
    font-size: 9.5px;
    letter-spacing: 0.22em;
    color: rgba(255, 255, 255, 0.4);
  }
}
.intro {
  margin: 0 0 16px;
  line-height: 1.9;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.56);
}
.status {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 6px 12px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  font-size: 11.5px;
  letter-spacing: 0.08em;
  color: #cfe0ff;
  background: rgba(255, 255, 255, 0.04);
}

h4 {
  margin: 0 0 16px;
  font-size: 11.5px;
  font-weight: 500;
  letter-spacing: 0.16em;
  color: #7dd3fc;
  text-transform: uppercase;
}

ul {
  list-style: none;
  margin: 0;
  padding: 0;
}
li {
  margin-bottom: 10px;
  line-height: 1.6;
}
a {
  color: rgba(255, 255, 255, 0.6);
}
a:hover {
  color: #fff;
}

.contact li {
  display: flex;
  gap: 10px;
  font-size: 12.5px;
}
.contact .label {
  flex: 0 0 34px;
  color: rgba(255, 255, 255, 0.36);
}
.contact .value {
  color: rgba(255, 255, 255, 0.62);
}

.bottom {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 18px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 11.5px;
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.42);
}
.bottom .dot {
  opacity: 0.5;
}
.admin-link {
  color: rgba(255, 255, 255, 0.6);
  margin-left: 6px;
}
.admin-link:hover {
  color: #7dd3fc;
}

@media (max-width: 1000px) {
  .cols {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 28px;
  }
}
@media (max-width: 600px) {
  .site-footer {
    padding-top: 44px;
  }
  .cols {
    grid-template-columns: minmax(0, 1fr);
    gap: 26px;
    padding-bottom: 30px;
  }
  .bottom {
    flex-direction: column;
    gap: 6px;
  }
  .bottom .dot {
    display: none;
  }
}
</style>
