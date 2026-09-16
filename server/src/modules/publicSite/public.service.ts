/** 官网（前台站点）公开接口：无需登录即可访问，仅暴露已发布内容 */
import type { Request } from 'express';
import { all, get, run, scalar } from '../../db';
import { page } from '../../utils/http';
import { num, parseListQuery, str } from '../../utils/query';
import { toPlainText } from '../../utils/sanitize';

const ARTICLE_CATEGORIES = ['学校新闻', '通知公告', '学术活动', '招生信息'];

/** 站点设置：键值对转对象，前端直接使用 */
export function siteInfo() {
  const rows = all<{ key: string; value: string }>(`SELECT key, value FROM cms_setting`);
  const settings: Record<string, string> = {};
  for (const row of rows) settings[row.key] = row.value;

  const pages = all<{ slug: string; title: string; subtitle: string | null }>(
    `SELECT slug, title, subtitle FROM cms_page WHERE status = '已发布' ORDER BY sort_order ASC, id ASC`,
  );

  return {
    settings,
    pages,
    categories: ARTICLE_CATEGORIES,
    stats: {
      departments: scalar<number>(`SELECT COUNT(*) FROM department`),
      majors: scalar<number>(`SELECT COUNT(*) FROM major`),
      students: scalar<number>(`SELECT COUNT(*) FROM student`),
      teachers: scalar<number>(`SELECT COUNT(*) FROM teacher WHERE status = '在职'`),
      courses: scalar<number>(`SELECT COUNT(*) FROM course`),
      articles: scalar<number>(`SELECT COUNT(*) FROM cms_article WHERE status = '已发布'`),
    },
  };
}

export function banners() {
  return all<Record<string, unknown>>(
    `SELECT id, title, subtitle, image, link FROM cms_banner
     WHERE status = '已发布' ORDER BY sort_order ASC, id DESC`,
  );
}

/** 文章列表：仅已发布，支持分类 / 关键字 / 分页 */
export function articles(req: Request) {
  const query = parseListQuery(req, 10, 50);
  const where: string[] = [`status = '已发布'`];
  const params: (string | number)[] = [];

  const category = str(req.query.category);
  if (category) {
    where.push('category = ?');
    params.push(category);
  }
  if (query.keyword) {
    where.push('(title LIKE ? OR summary LIKE ? OR tags LIKE ?)');
    const like = `%${query.keyword}%`;
    params.push(like, like, like);
  }
  const whereSql = `WHERE ${where.join(' AND ')}`;

  const total = scalar<number>(`SELECT COUNT(*) FROM cms_article ${whereSql}`, params);
  const list = all<Record<string, unknown>>(
    `SELECT id, title, category, summary, cover, author, source, tags, is_top, view_count, published_at
     FROM cms_article ${whereSql}
     ORDER BY is_top DESC, published_at DESC, id DESC
     LIMIT ? OFFSET ?`,
    [...params, query.pageSize, query.offset],
  );

  return page(list, total, query.page, query.pageSize);
}

/** 文章详情：浏览量 +1，并返回上一篇 / 下一篇 */
export function articleDetail(id: number) {
  const row = get<Record<string, unknown>>(
    `SELECT * FROM cms_article WHERE id = ? AND status = '已发布'`,
    [id],
  );
  if (!row) return null;

  run(`UPDATE cms_article SET view_count = view_count + 1 WHERE id = ?`, [id]);

  const prev = get<{ id: number; title: string }>(
    `SELECT id, title FROM cms_article
     WHERE status = '已发布' AND published_at < ? ORDER BY published_at DESC LIMIT 1`,
    [String(row.published_at ?? '')],
  );
  const next = get<{ id: number; title: string }>(
    `SELECT id, title FROM cms_article
     WHERE status = '已发布' AND published_at > ? ORDER BY published_at ASC LIMIT 1`,
    [String(row.published_at ?? '')],
  );

  return {
    ...row,
    view_count: Number(row.view_count ?? 0) + 1,
    prev: prev ?? null,
    next: next ?? null,
  };
}

/** 首页要闻：置顶 + 最新 */
export function headline() {
  const top = all<Record<string, unknown>>(
    `SELECT id, title, category, summary, cover, published_at FROM cms_article
     WHERE status = '已发布' ORDER BY is_top DESC, published_at DESC LIMIT 5`,
  );
  const notices = all<Record<string, unknown>>(
    `SELECT id, title, category, published_at FROM cms_article
     WHERE status = '已发布' AND category IN ('通知公告','招生信息')
     ORDER BY published_at DESC LIMIT 6`,
  );
  return { top, notices };
}

export function pageDetail(slug: string) {
  const row = get<Record<string, unknown>>(
    `SELECT * FROM cms_page WHERE slug = ? AND status = '已发布'`,
    [slug],
  );
  return row ?? null;
}

/** 院系与专业（官网展示用） */
export function departments() {
  return all<Record<string, unknown>>(
    `SELECT d.id, d.code, d.name, d.dean, d.office, d.phone, d.description,
            (SELECT COUNT(*) FROM major m WHERE m.department_id = d.id) AS major_count,
            (SELECT COUNT(*) FROM teacher t WHERE t.department_id = d.id AND t.status = '在职') AS teacher_count,
            (SELECT COUNT(*) FROM student s
               JOIN class_group c ON c.id = s.class_id
               JOIN major m2 ON m2.id = c.major_id
              WHERE m2.department_id = d.id AND s.status = '在读') AS student_count
     FROM department d
     ORDER BY d.sort_order ASC, d.id ASC`,
  ).map((row) => ({
    ...row,
    majors: all<Record<string, unknown>>(
      `SELECT id, code, name, degree_type, duration_years, description,
              (SELECT COUNT(*) FROM class_group c WHERE c.major_id = major.id) AS class_count
       FROM major WHERE department_id = ? ORDER BY id ASC`,
      [Number(row.id)],
    ),
  }));
}

export function teachers(req: Request) {
  const departmentId = num(req.query.departmentId);
  const where: string[] = [`t.status = '在职'`];
  const params: (string | number)[] = [];
  if (departmentId) {
    where.push('t.department_id = ?');
    params.push(departmentId);
  }
  const keyword = str(req.query.keyword);
  if (keyword) {
    where.push('(t.name LIKE ? OR t.title LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  return all<Record<string, unknown>>(
    `SELECT t.id, t.teacher_no, t.name, t.gender, t.title, t.email,
            d.name AS department_name,
            (SELECT COUNT(*) FROM course_offering o WHERE o.teacher_id = t.id) AS offering_count
     FROM teacher t
     LEFT JOIN department d ON d.id = t.department_id
     WHERE ${where.join(' AND ')}
     ORDER BY CASE t.title WHEN '教授' THEN 1 WHEN '副教授' THEN 2 WHEN '讲师' THEN 3 ELSE 4 END, t.teacher_no
     LIMIT 200`,
    params,
  );
}

export function courses(req: Request) {
  const departmentId = num(req.query.departmentId);
  const courseType = str(req.query.courseType);
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (departmentId) {
    where.push('c.department_id = ?');
    params.push(departmentId);
  }
  if (courseType) {
    where.push('c.course_type = ?');
    params.push(courseType);
  }
  const keyword = str(req.query.keyword);
  if (keyword) {
    where.push('(c.name LIKE ? OR c.course_code LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  return all<Record<string, unknown>>(
    `SELECT c.id, c.course_code, c.name, c.credit, c.hours, c.course_type, c.description,
            d.name AS department_name
     FROM course c
     LEFT JOIN department d ON d.id = c.department_id
     ${whereSql}
     ORDER BY c.course_code ASC
     LIMIT 300`,
    params,
  );
}

/** 站内搜索：新闻 + 单页 + 专业 */
export function search(req: Request) {
  const keyword = str(req.query.keyword) ?? '';
  if (!keyword) return { articles: [], majors: [], pages: [] };
  const like = `%${keyword}%`;

  return {
    articles: all<Record<string, unknown>>(
      `SELECT id, title, category, summary, published_at FROM cms_article
       WHERE status = '已发布' AND (title LIKE ? OR summary LIKE ? OR content LIKE ?)
       ORDER BY published_at DESC LIMIT 8`,
      [like, like, like],
    ),
    majors: all<Record<string, unknown>>(
      `SELECT m.id, m.name, m.code, d.name AS department_name
       FROM major m LEFT JOIN department d ON d.id = m.department_id
       WHERE m.name LIKE ? OR m.code LIKE ? LIMIT 8`,
      [like, like],
    ),
    pages: all<Record<string, unknown>>(
      `SELECT slug, title, subtitle FROM cms_page
       WHERE status = '已发布' AND (title LIKE ? OR content LIKE ?) LIMIT 6`,
      [like, like],
    ),
  };
}

export { ARTICLE_CATEGORIES, toPlainText };
