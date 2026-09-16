-- ============================================================
--  高校学生管理系统 — 数据库结构 (SQLite)
--  说明：本文件为幂等 DDL，可重复执行；配合 migrate.ts 使用
-- ============================================================

PRAGMA foreign_keys = ON;

-- ---------- 组织架构：院系 ----------
CREATE TABLE IF NOT EXISTS department (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT    NOT NULL UNIQUE,              -- 院系代码
  name        TEXT    NOT NULL,                     -- 院系名称
  dean        TEXT,                                 -- 院长/负责人
  phone       TEXT,
  office      TEXT,                                 -- 办公地点
  description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- ---------- 组织架构：专业 ----------
CREATE TABLE IF NOT EXISTS major (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  code            TEXT    NOT NULL UNIQUE,          -- 专业代码
  name            TEXT    NOT NULL,                 -- 专业名称
  department_id   INTEGER NOT NULL REFERENCES department(id) ON DELETE RESTRICT,
  degree_type     TEXT    NOT NULL DEFAULT '本科',  -- 本科 / 硕士 / 博士 / 专科
  duration_years  INTEGER NOT NULL DEFAULT 4,       -- 学制（年）
  description     TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);
CREATE INDEX IF NOT EXISTS idx_major_department ON major(department_id);

-- ---------- 组织架构：教师 ----------
CREATE TABLE IF NOT EXISTS teacher (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  teacher_no     TEXT    NOT NULL UNIQUE,           -- 工号
  name           TEXT    NOT NULL,
  gender         TEXT    NOT NULL DEFAULT '男',     -- 男 / 女
  title          TEXT    NOT NULL DEFAULT '讲师',   -- 教授 / 副教授 / 讲师 / 助教
  department_id  INTEGER REFERENCES department(id) ON DELETE SET NULL,
  phone          TEXT,
  email          TEXT,
  hire_date      TEXT,                              -- 入职日期 YYYY-MM-DD
  status         TEXT    NOT NULL DEFAULT '在职',   -- 在职 / 休假 / 离职
  remark         TEXT,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);
CREATE INDEX IF NOT EXISTS idx_teacher_department ON teacher(department_id);

-- ---------- 组织架构：班级 ----------
CREATE TABLE IF NOT EXISTS class_group (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  code         TEXT    NOT NULL UNIQUE,             -- 班级编号
  name         TEXT    NOT NULL,                    -- 班级名称
  major_id     INTEGER NOT NULL REFERENCES major(id) ON DELETE RESTRICT,
  grade_year   INTEGER NOT NULL,                    -- 年级（入学年份）
  counselor_id INTEGER REFERENCES teacher(id) ON DELETE SET NULL,  -- 辅导员
  classroom    TEXT,                                -- 固定教室
  status       TEXT    NOT NULL DEFAULT '在读',     -- 在读 / 已毕业
  created_at   TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);
CREATE INDEX IF NOT EXISTS idx_class_major ON class_group(major_id);
CREATE INDEX IF NOT EXISTS idx_class_counselor ON class_group(counselor_id);

-- ---------- 学生 ----------
CREATE TABLE IF NOT EXISTS student (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  student_no       TEXT    NOT NULL UNIQUE,         -- 学号
  name             TEXT    NOT NULL,
  gender           TEXT    NOT NULL DEFAULT '男',
  birth_date       TEXT,
  id_card          TEXT,                            -- 身份证号
  phone            TEXT,
  email            TEXT,
  class_id         INTEGER REFERENCES class_group(id) ON DELETE SET NULL,
  enroll_year      INTEGER NOT NULL,                -- 入学年份
  status           TEXT    NOT NULL DEFAULT '在读', -- 在读 / 休学 / 毕业 / 退学
  political_status TEXT    NOT NULL DEFAULT '共青团员', -- 政治面貌
  ethnicity        TEXT    DEFAULT '汉族',
  native_place     TEXT,                            -- 籍贯
  address          TEXT,                            -- 家庭住址
  guardian_name    TEXT,                            -- 监护人
  guardian_phone   TEXT,
  dormitory        TEXT,                            -- 宿舍
  remark           TEXT,
  created_at       TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at       TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);
CREATE INDEX IF NOT EXISTS idx_student_class  ON student(class_id);
CREATE INDEX IF NOT EXISTS idx_student_status ON student(status);
CREATE INDEX IF NOT EXISTS idx_student_year   ON student(enroll_year);
CREATE INDEX IF NOT EXISTS idx_student_name   ON student(name);

-- ---------- 课程库 ----------
CREATE TABLE IF NOT EXISTS course (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  course_code   TEXT    NOT NULL UNIQUE,            -- 课程代码
  name          TEXT    NOT NULL,
  credit        REAL    NOT NULL DEFAULT 2,         -- 学分
  hours         INTEGER NOT NULL DEFAULT 32,        -- 学时
  course_type   TEXT    NOT NULL DEFAULT '必修',    -- 必修 / 选修 / 通识 / 实践
  department_id INTEGER REFERENCES department(id) ON DELETE SET NULL,
  description   TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);
CREATE INDEX IF NOT EXISTS idx_course_department ON course(department_id);

-- ---------- 教学班（开课） ----------
CREATE TABLE IF NOT EXISTS course_offering (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  offering_code TEXT    NOT NULL UNIQUE,            -- 教学班编号
  course_id     INTEGER NOT NULL REFERENCES course(id) ON DELETE CASCADE,
  teacher_id    INTEGER REFERENCES teacher(id) ON DELETE SET NULL,
  semester      TEXT    NOT NULL,                   -- 例如 2025-2026-1
  class_id      INTEGER REFERENCES class_group(id) ON DELETE SET NULL, -- 面向班级，空=全校选修
  classroom     TEXT,
  schedule      TEXT,                               -- 上课时间描述
  capacity      INTEGER NOT NULL DEFAULT 60,
  status        TEXT    NOT NULL DEFAULT '开放选课',-- 开放选课 / 已结束
  created_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);
CREATE INDEX IF NOT EXISTS idx_offering_course   ON course_offering(course_id);
CREATE INDEX IF NOT EXISTS idx_offering_teacher  ON course_offering(teacher_id);
CREATE INDEX IF NOT EXISTS idx_offering_semester ON course_offering(semester);

-- ---------- 选课与成绩 ----------
CREATE TABLE IF NOT EXISTS enrollment (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  offering_id   INTEGER NOT NULL REFERENCES course_offering(id) ON DELETE CASCADE,
  student_id    INTEGER NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  select_status TEXT    NOT NULL DEFAULT '已选',    -- 已选 / 退选
  score         REAL,                               -- 总评成绩
  exam_type     TEXT    NOT NULL DEFAULT '正常考试',-- 正常考试 / 补考 / 重修
  remark        TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
  UNIQUE (offering_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_enrollment_student  ON enrollment(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_offering ON enrollment(offering_id);

-- ---------- 系统用户 ----------
CREATE TABLE IF NOT EXISTS sys_user (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    NOT NULL UNIQUE,
  password      TEXT    NOT NULL,                   -- bcrypt hash
  real_name     TEXT    NOT NULL,
  role          TEXT    NOT NULL DEFAULT 'student', -- admin / teacher / student
  ref_id        INTEGER,                            -- teacher.id 或 student.id
  phone         TEXT,
  email         TEXT,
  avatar        TEXT,
  status        TEXT    NOT NULL DEFAULT '启用',    -- 启用 / 停用
  last_login_at TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- ---------- 操作日志 ----------
CREATE TABLE IF NOT EXISTS sys_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER,
  username   TEXT,
  module     TEXT,
  action     TEXT,
  method     TEXT,
  path       TEXT,
  ip         TEXT,
  detail     TEXT,
  success    INTEGER NOT NULL DEFAULT 1,
  cost_ms    INTEGER,
  created_at TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);
CREATE INDEX IF NOT EXISTS idx_log_created ON sys_log(created_at);

-- ---------- 系统参数 ----------
CREATE TABLE IF NOT EXISTS sys_setting (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  label      TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- ============================================================
--  官网（前台站点）内容管理
-- ============================================================

-- ---------- 首页轮播图 ----------
CREATE TABLE IF NOT EXISTS cms_banner (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT    NOT NULL,
  subtitle    TEXT,
  image       TEXT,                                  -- 图片地址，留空则使用默认渐变
  link        TEXT,                                  -- 点击跳转地址
  sort_order  INTEGER NOT NULL DEFAULT 0,
  status      TEXT    NOT NULL DEFAULT '已发布',      -- 已发布 / 草稿
  created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- ---------- 新闻 / 公告 / 学术活动 ----------
CREATE TABLE IF NOT EXISTS cms_article (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  title           TEXT    NOT NULL,
  category        TEXT    NOT NULL DEFAULT '学校新闻', -- 学校新闻 / 通知公告 / 学术活动 / 招生信息
  summary         TEXT,
  cover           TEXT,
  content         TEXT,                               -- 正文（HTML）
  author          TEXT,
  source          TEXT,
  tags            TEXT,
  status          TEXT    NOT NULL DEFAULT '草稿',     -- 草稿 / 已发布
  is_top          INTEGER NOT NULL DEFAULT 0,          -- 是否置顶
  view_count      INTEGER NOT NULL DEFAULT 0,
  seo_title       TEXT,
  seo_keywords    TEXT,
  seo_description TEXT,
  published_at    TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);
CREATE INDEX IF NOT EXISTS idx_article_category ON cms_article(category, status);
CREATE INDEX IF NOT EXISTS idx_article_published ON cms_article(published_at);

-- ---------- 单页（学校概况 / 招生信息 / 联系方式 等） ----------
CREATE TABLE IF NOT EXISTS cms_page (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  slug            TEXT    NOT NULL UNIQUE,            -- about / admissions / contact 等
  title           TEXT    NOT NULL,
  subtitle        TEXT,
  content         TEXT,
  seo_title       TEXT,
  seo_keywords    TEXT,
  seo_description TEXT,
  status          TEXT    NOT NULL DEFAULT '已发布',
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- ---------- 站点设置 ----------
CREATE TABLE IF NOT EXISTS cms_setting (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL DEFAULT '',
  label      TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);
