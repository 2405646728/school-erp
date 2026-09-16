/**
 * 接口冒烟测试：覆盖登录、各业务列表、增删改闭环、成绩录入与权限校验
 * 用法：node scripts/api-smoke.mjs [baseUrl]
 */
const BASE = process.argv[2] || 'http://localhost:8000/api';

let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    failures.push(`${name} ${detail}`);
    console.log(`  ✗ ${name} ${detail}`);
  }
}

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { code: -1, message: text.slice(0, 120), data: null };
  }
  return { status: res.status, ...json };
}

async function main() {
  console.log(`\n== 学生管理系统 接口冒烟测试 ==\n目标：${BASE}\n`);

  console.log('[1] 基础接口');
  const health = await api('/health');
  check('健康检查', health.code === 0 && health.data?.status === 'UP');
  const meta = await api('/meta');
  check('服务元信息', meta.code === 0 && !!meta.data?.version, JSON.stringify(meta.data ?? {}));

  console.log('\n[2] 身份认证与权限');
  const login = await api('/auth/login', {
    method: 'POST',
    body: { username: 'admin', password: 'admin123' },
  });
  check('管理员登录', login.code === 0 && !!login.data?.token, login.message);
  const admin = login.data?.token;

  const bad = await api('/auth/login', {
    method: 'POST',
    body: { username: 'admin', password: 'wrong-password' },
  });
  check('错误密码被拒绝', bad.status === 401, `status=${bad.status}`);

  const noToken = await api('/students');
  check('未登录访问被拦截', noToken.status === 401, `status=${noToken.status}`);

  const profile = await api('/auth/profile', { token: admin });
  check('个人资料', profile.code === 0 && profile.data?.account?.username === 'admin');

  console.log('\n[3] 列表类接口');
  const lists = [
    ['/dashboard/overview', (d) => d.stats?.totalStudents > 0, '仪表盘'],
    ['/departments?page=1&pageSize=5', (d) => d.total > 0, '院系'],
    ['/majors?page=1&pageSize=5', (d) => d.total > 0, '专业'],
    ['/classes?page=1&pageSize=5', (d) => d.total > 0, '班级'],
    ['/teachers?page=1&pageSize=5', (d) => d.total > 0, '教师'],
    ['/students?page=1&pageSize=5', (d) => d.total > 0, '学生'],
    ['/courses?page=1&pageSize=5', (d) => d.total > 0, '课程'],
    ['/offerings?page=1&pageSize=5', (d) => d.total > 0, '教学班'],
    ['/enrollments?page=1&pageSize=5', (d) => d.total > 0, '选课记录'],
    ['/users?page=1&pageSize=5', (d) => d.total > 0, '系统账号'],
    ['/logs?page=1&pageSize=5', (d) => d.total > 0, '操作日志'],
  ];
  for (const [path, assert, label] of lists) {
    const res = await api(path, { token: admin });
    check(`${label}列表`, res.code === 0 && assert(res.data), res.message);
  }

  console.log('\n[4] 组织架构增删改闭环');
  const suffix = Date.now().toString().slice(-6);
  const created = await api('/departments', {
    method: 'POST',
    token: admin,
    body: { code: `T${suffix}`, name: `测试学院${suffix}`, dean: '测试院长', sortOrder: 99 },
  });
  check('新增院系', created.code === 0 && created.data?.id > 0, created.message);
  const deptId = created.data?.id;

  const updated = await api(`/departments/${deptId}`, {
    method: 'PUT',
    token: admin,
    body: { code: `T${suffix}`, name: `测试学院${suffix}`, dean: '已修改院长', sortOrder: 99 },
  });
  check('修改院系', updated.code === 0 && updated.data?.dean === '已修改院长', updated.message);

  const dup = await api('/departments', {
    method: 'POST',
    token: admin,
    body: { code: `T${suffix}`, name: `重复代码${suffix}` },
  });
  check('重复代码被拦截', dup.status === 409, `status=${dup.status}`);

  const removed = await api(`/departments/${deptId}`, { method: 'DELETE', token: admin });
  check('删除院系', removed.code === 0, removed.message);

  console.log('\n[5] 学生档案全流程');
  const classes = await api('/classes/options', { token: admin });
  const classId = classes.data?.[0]?.id;
  const studentNo = `T${suffix}`;
  const student = await api('/students', {
    method: 'POST',
    token: admin,
    body: {
      studentNo,
      name: '测试学生',
      gender: '男',
      classId,
      enrollYear: 2025,
      status: '在读',
      politicalStatus: '共青团员',
      phone: '13800000000',
    },
  });
  check('新增学生', student.code === 0 && student.data?.id > 0, student.message);
  const studentId = student.data?.id;

  const detail = await api(`/students/${studentId}`, { token: admin });
  check('学生详情含班级链路', detail.code === 0 && !!detail.data?.class_name, detail.message);

  const reset = await api(`/students/${studentId}/reset-password`, { method: 'POST', token: admin });
  check('重置学生密码', reset.code === 0, reset.message);

  const editStudent = await api(`/students/${studentId}`, {
    method: 'PUT',
    token: admin,
    body: {
      name: '测试学生',
      gender: '男',
      classId,
      enrollYear: 2025,
      status: '休学',
      politicalStatus: '共青团员',
    },
  });
  check('修改学生（学籍异动）', editStudent.code === 0 && editStudent.data?.status === '休学', editStudent.message);

  console.log('\n[6] 选课与成绩录入');
  const offerings = await api('/offerings?page=1&pageSize=1&status=开放选课', { token: admin });
  const offeringId = offerings.data?.list?.[0]?.id;
  check('获取教学班', !!offeringId, JSON.stringify(offerings.data?.list?.[0] ?? {}).slice(0, 80));

  const select = await api('/enrollments/select', {
    method: 'POST',
    token: admin,
    body: { offeringId, studentIds: [studentId] },
  });
  check('手工选课', select.code === 0, select.message);

  const roster = await api(`/offerings/${offeringId}`, { token: admin });
  const target = roster.data?.roster?.find((r) => r.student_id === studentId);
  check('教学班名单包含新学生', !!target);

  const score = await api('/enrollments/batch-score', {
    method: 'POST',
    token: admin,
    body: { items: [{ id: target?.id, score: 88.5, examType: '正常考试' }] },
  });
  check('录入成绩', score.code === 0 && score.data?.updated === 1, score.message);

  const badScore = await api('/enrollments/batch-score', {
    method: 'POST',
    token: admin,
    body: { items: [{ id: target?.id, score: 120 }] },
  });
  check('非法成绩被拦截', badScore.status === 400, `status=${badScore.status}`);

  console.log('\n[7] 角色视角');
  const teacherLogin = await api('/auth/login', {
    method: 'POST',
    body: { username: 'T0001', password: '123456' },
  });
  check('教师登录', teacherLogin.code === 0, teacherLogin.message);
  const teacherToken = teacherLogin.data?.token;

  const teachings = await api('/enrollments/my-teachings', { token: teacherToken });
  check('教师查看授课教学班', teachings.code === 0 && Array.isArray(teachings.data?.list), teachings.message);

  const teacherDenied = await api('/users', { token: teacherToken });
  check('教师无用户管理权限', teacherDenied.status === 403, `status=${teacherDenied.status}`);

  const studentLogin = await api('/auth/login', {
    method: 'POST',
    body: { username: studentNo, password: '123456' },
  });
  check('学生登录（新建账号）', studentLogin.code === 0, studentLogin.message);
  const studentToken = studentLogin.data?.token;

  const myCourses = await api('/enrollments/my-courses', { token: studentToken });
  check('学生查看我的课程', myCourses.code === 0 && Array.isArray(myCourses.data?.list), myCourses.message);

  const myScores = await api('/enrollments/my-scores', { token: studentToken });
  check(
    '学生查看我的成绩',
    myScores.code === 0 && myScores.data?.list?.some((r) => r.score === 88.5),
    myScores.message,
  );

  const studentDenied = await api("/students", { token: studentToken });
  check('学生无学生管理权限', studentDenied.status === 403, `status=${studentDenied.status}`);

  console.log('\n[8] 官网公开接口');
  const site = await api('/public/site');
  check('站点信息', site.code === 0 && !!site.data?.settings?.site_name, site.data?.settings?.site_name);
  check('站点统计', site.data?.stats?.students > 0, JSON.stringify(site.data?.stats ?? {}));

  const bannerList = await api('/public/banners');
  check('首页轮播图', bannerList.code === 0 && bannerList.data.length > 0, `len=${bannerList.data?.length}`);

  const headline = await api('/public/headline');
  check(
    '首页要闻与公告',
    headline.code === 0 && headline.data?.top?.length > 0 && headline.data?.notices?.length > 0,
    `top=${headline.data?.top?.length} notices=${headline.data?.notices?.length}`,
  );

  const publicArticles = await api('/public/articles?page=1&pageSize=5');
  check('文章列表', publicArticles.code === 0 && publicArticles.data.total > 0, `total=${publicArticles.data?.total}`);

  const byCategory = await api(`/public/articles?category=${encodeURIComponent('通知公告')}`);
  check(
    '按分类筛选文章',
    byCategory.code === 0 &&
      byCategory.data.total > 0 &&
      byCategory.data.list.every((item) => item.category === '通知公告'),
    `total=${byCategory.data?.total}`,
  );

  const firstArticle = publicArticles.data.list[0];
  const articleDetail = await api(`/public/articles/${firstArticle.id}`);
  check(
    '文章详情（浏览量自增）',
    articleDetail.code === 0 &&
      !!articleDetail.data.content &&
      articleDetail.data.view_count > firstArticle.view_count,
    `views ${firstArticle.view_count} -> ${articleDetail.data?.view_count}`,
  );

  const publicPage = await api('/public/pages/about');
  check('单页内容', publicPage.code === 0 && publicPage.data.title === '学校概况', publicPage.data?.title);

  const publicDepts = await api('/public/departments');
  check(
    '院系与专业',
    publicDepts.code === 0 && publicDepts.data.length > 0 && publicDepts.data[0].majors.length > 0,
    `${publicDepts.data?.length} 个院系`,
  );

  const publicTeachers = await api('/public/teachers');
  check('师资列表', publicTeachers.code === 0 && publicTeachers.data.length > 0, `${publicTeachers.data?.length} 位教师`);

  const publicCourses = await api('/public/courses');
  check('课程列表', publicCourses.code === 0 && publicCourses.data.length > 0, `${publicCourses.data?.length} 门课程`);

  const searched = await api(`/public/search?keyword=${encodeURIComponent('招生')}`);
  check(
    '站内搜索',
    searched.code === 0 && searched.data.articles.length > 0,
    `articles=${searched.data?.articles?.length} majors=${searched.data?.majors?.length}`,
  );

  const missingArticle = await api('/public/articles/999999');
  check('不存在的文章返回 404', missingArticle.status === 404, `status=${missingArticle.status}`);

  console.log('\n[9] 官网内容管理（后台）');
  const cmsDenied = await api('/cms/articles');
  check('未登录无法访问内容管理', cmsDenied.status === 401, `status=${cmsDenied.status}`);

  const cmsDeniedByTeacher = await api('/cms/articles', { token: teacherToken });
  check('教师无内容管理权限', cmsDeniedByTeacher.status === 403, `status=${cmsDeniedByTeacher.status}`);

  const cmsStats = await api('/cms/articles/stats', { token: admin });
  check('内容统计', cmsStats.code === 0 && cmsStats.data.total > 0, `total=${cmsStats.data?.total}`);

  const draftTitle = `冒烟测试新闻 ${suffix}`;
  const createdArticle = await api('/cms/articles', {
    method: 'POST',
    token: admin,
    body: {
      title: draftTitle,
      category: '学校新闻',
      summary: '由接口冒烟测试创建的临时内容',
      content: '<p>测试正文</p><script>alert(1)</script><p>结束</p>',
      author: '自动化测试',
      status: '草稿',
      isTop: 0,
    },
  });
  check('新增草稿', createdArticle.code === 0 && createdArticle.data?.id > 0, createdArticle.message);
  const draftId = createdArticle.data?.id;

  check(
    '保存时过滤脚本标签',
    !String(createdArticle.data?.content ?? '').includes('<script'),
    String(createdArticle.data?.content ?? '').slice(0, 60),
  );

  const publicDraft = await api(`/public/articles/${draftId}`);
  check('草稿在前台不可见', publicDraft.status === 404, `status=${publicDraft.status}`);

  const published = await api(`/cms/articles/${draftId}/toggle-status`, { method: 'POST', token: admin });
  check('发布草稿', published.code === 0 && published.data?.status === '已发布', published.message);

  const publicPublished = await api(`/public/articles/${draftId}`);
  check(
    '发布后前台可见',
    publicPublished.code === 0 && publicPublished.data.title === draftTitle,
    publicPublished.message,
  );

  const topToggled = await api(`/cms/articles/${draftId}/toggle-top`, { method: 'POST', token: admin });
  check('切换置顶', topToggled.code === 0 && topToggled.data?.isTop === 1, topToggled.message);

  const settingsBefore = await api('/cms/settings', { token: admin });
  const originalSlogan = settingsBefore.data.find((item) => item.key === 'site_slogan')?.value ?? '';
  const tempSlogan = `冒烟测试标语 ${suffix}`;
  const settingsSaved = await api('/cms/settings', {
    method: 'PUT',
    token: admin,
    body: { items: [{ key: 'site_slogan', value: tempSlogan }] },
  });
  check('保存站点设置', settingsSaved.code === 0, settingsSaved.message);

  const siteAfterSave = await api('/public/site');
  check(
    '前台即时读到新设置',
    siteAfterSave.data?.settings?.site_slogan === tempSlogan,
    siteAfterSave.data?.settings?.site_slogan,
  );

  await api('/cms/settings', {
    method: 'PUT',
    token: admin,
    body: { items: [{ key: 'site_slogan', value: originalSlogan }] },
  });
  const siteRestored = await api('/public/site');
  check(
    '恢复站点设置',
    siteRestored.data?.settings?.site_slogan === originalSlogan,
    siteRestored.data?.settings?.site_slogan,
  );

  const bannerCreated = await api('/cms/banners', {
    method: 'POST',
    token: admin,
    body: { title: `冒烟测试轮播 ${suffix}`, subtitle: '临时数据', sortOrder: 99, status: '草稿' },
  });
  check('新增轮播图', bannerCreated.code === 0 && bannerCreated.data?.id > 0, bannerCreated.message);

  const publicBannersAfter = await api('/public/banners');
  check(
    '草稿轮播图不在前台展示',
    !publicBannersAfter.data.some((item) => item.title === `冒烟测试轮播 ${suffix}`),
    `前台 ${publicBannersAfter.data?.length} 条`,
  );

  const bannerRemoved = await api(`/cms/banners/${bannerCreated.data?.id}`, { method: 'DELETE', token: admin });
  check('删除轮播图', bannerRemoved.code === 0, bannerRemoved.message);

  const articleRemoved = await api(`/cms/articles/${draftId}`, { method: 'DELETE', token: admin });
  check('删除测试文章', articleRemoved.code === 0, articleRemoved.message);

  const reservedPageDelete = await api('/cms/pages/1', { method: 'DELETE', token: admin });
  check('内置单页不允许删除', reservedPageDelete.status === 400, `status=${reservedPageDelete.status}`);

  console.log('\n[10] 导出与清理');
  const csvRes = await fetch(`${BASE}/students/export?status=在读`, {
    headers: { Authorization: `Bearer ${admin}` },
  });
  const csv = await csvRes.text();
  check('导出 CSV', csvRes.status === 200 && csv.includes('学号'), `bytes=${csv.length}`);

  const finalDelete = await api(`/students/${studentId}`, { method: 'DELETE', token: admin });
  check('删除测试学生', finalDelete.code === 0, finalDelete.message);

  console.log(`\n== 结果：通过 ${passed} 项，失败 ${failed} 项 ==`);
  if (failed) {
    console.log('失败明细：');
    failures.forEach((item) => console.log(`  - ${item}`));
    process.exit(1);
  }
  console.log('全部接口工作正常\n');
}

main().catch((error) => {
  console.error('冒烟测试执行失败：', error);
  process.exit(1);
});
