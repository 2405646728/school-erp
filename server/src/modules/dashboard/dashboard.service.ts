import { all, get, scalar } from '../../db';
import type { AuthUser } from '../../types';

/** 首页概览：核心指标 + 图表数据，一次请求返回 */
export function overview(auth: AuthUser) {
  const totalStudents = scalar<number>(`SELECT COUNT(*) FROM student`);
  const activeStudents = scalar<number>(`SELECT COUNT(*) FROM student WHERE status = '在读'`);
  const totalTeachers = scalar<number>(`SELECT COUNT(*) FROM teacher WHERE status = '在职'`);
  const totalCourses = scalar<number>(`SELECT COUNT(*) FROM course`);
  const totalOfferings = scalar<number>(`SELECT COUNT(*) FROM course_offering`);
  const totalDepartments = scalar<number>(`SELECT COUNT(*) FROM department`);
  const totalMajors = scalar<number>(`SELECT COUNT(*) FROM major`);
  const totalClasses = scalar<number>(`SELECT COUNT(*) FROM class_group`);
  const enrollments = scalar<number>(`SELECT COUNT(*) FROM enrollment WHERE select_status = '已选'`);

  const currentSemester =
    get<{ semester: string }>(`SELECT semester FROM course_offering ORDER BY semester DESC LIMIT 1`)?.semester ??
    '2025-2026-1';

  // 成绩概览（仅统计已录入成绩的选课记录）
  const scoreStats = get<{ total: number; avg_score: number; pass: number; excellent: number }>(
    `SELECT COUNT(*) AS total,
            ROUND(AVG(score), 1) AS avg_score,
            SUM(CASE WHEN score >= 60 THEN 1 ELSE 0 END) AS pass,
            SUM(CASE WHEN score >= 85 THEN 1 ELSE 0 END) AS excellent
     FROM enrollment WHERE score IS NOT NULL AND select_status = '已选'`,
  );

  const scoreTotal = scoreStats?.total ?? 0;
  const passRate = scoreTotal ? Math.round(((scoreStats?.pass ?? 0) / scoreTotal) * 1000) / 10 : 0;

  // 各院系在读学生分布
  const departmentDistribution = all<{ name: string; value: number }>(
    `SELECT d.name AS name, COUNT(s.id) AS value
     FROM department d
     LEFT JOIN major m ON m.department_id = d.id
     LEFT JOIN class_group c ON c.major_id = m.id
     LEFT JOIN student s ON s.class_id = c.id AND s.status = '在读'
     GROUP BY d.id ORDER BY value DESC`,
  );

  // 近 6 个年级的招生趋势
  const enrollmentTrend = all<{ name: string; value: number }>(
    `SELECT enroll_year || '级' AS name, COUNT(*) AS value
     FROM student GROUP BY enroll_year ORDER BY enroll_year DESC LIMIT 6`,
  ).reverse();

  // 成绩分段
  const scoreBuckets = all<{ name: string; value: number }>(
    `SELECT bucket AS name, COUNT(*) AS value FROM (
        SELECT CASE
          WHEN score >= 90 THEN '90-100'
          WHEN score >= 80 THEN '80-89'
          WHEN score >= 70 THEN '70-79'
          WHEN score >= 60 THEN '60-69'
          ELSE '60 以下' END AS bucket
        FROM enrollment WHERE score IS NOT NULL AND select_status = '已选'
     ) GROUP BY bucket`,
  );
  const bucketOrder = ['90-100', '80-89', '70-79', '60-69', '60 以下'];
  const scoreDistribution = bucketOrder.map((name) => ({
    name,
    value: scoreBuckets.find((b) => b.name === name)?.value ?? 0,
  }));

  // 学生状态构成
  const statusDistribution = all<{ name: string; value: number }>(
    `SELECT status AS name, COUNT(*) AS value FROM student GROUP BY status`,
  );

  // 热门课程 Top 6（按选课人数）
  const hotCourses = all<{ name: string; value: number; teacher: string | null }>(
    `SELECT c.name AS name, COUNT(e.id) AS value, t.name AS teacher
     FROM course_offering o
     JOIN course c ON c.id = o.course_id
     LEFT JOIN teacher t ON t.id = o.teacher_id
     LEFT JOIN enrollment e ON e.offering_id = o.id AND e.select_status = '已选'
     GROUP BY o.id ORDER BY value DESC LIMIT 6`,
  );

  // 待办提醒
  const todos = [
    {
      label: '本学年开放选课的教学班',
      value: scalar<number>(`SELECT COUNT(*) FROM course_offering WHERE status = '开放选课'`),
      type: 'primary',
    },
    {
      label: '尚未录入成绩的选课记录',
      value: scalar<number>(
        `SELECT COUNT(*) FROM enrollment WHERE score IS NULL AND select_status = '已选'`,
      ),
      type: 'warning',
    },
    {
      label: '学籍异动（休学/退学）学生',
      value: scalar<number>(`SELECT COUNT(*) FROM student WHERE status IN ('休学','退学')`),
      type: 'danger',
    },
    {
      label: '启用状态的系统账号',
      value: scalar<number>(`SELECT COUNT(*) FROM sys_user WHERE status = '启用'`),
      type: 'success',
    },
  ];

  // 教师排课负担 Top 5
  const teacherLoad = all<{ name: string; value: number }>(
    `SELECT t.name AS name, COUNT(o.id) AS value
     FROM teacher t
     LEFT JOIN course_offering o ON o.teacher_id = t.id
     GROUP BY t.id ORDER BY value DESC, t.id ASC LIMIT 5`,
  );

  const recentStudents = all<Record<string, unknown>>(
    `SELECT s.id, s.student_no, s.name, s.gender, s.enroll_year, s.status,
            c.name AS class_name, m.name AS major_name
     FROM student s
     LEFT JOIN class_group c ON c.id = s.class_id
     LEFT JOIN major m ON m.id = c.major_id
     ORDER BY s.id DESC LIMIT 6`,
  );

  return {
    greetingName: auth.realName,
    currentSemester,
    stats: {
      totalStudents,
      activeStudents,
      totalTeachers,
      totalCourses,
      totalOfferings,
      totalDepartments,
      totalMajors,
      totalClasses,
      enrollments,
      avgScore: scoreStats?.avg_score ?? 0,
      passRate,
      excellentCount: scoreStats?.excellent ?? 0,
    },
    charts: {
      departmentDistribution,
      enrollmentTrend,
      scoreDistribution,
      statusDistribution,
      hotCourses,
      teacherLoad,
    },
    todos,
    recentStudents,
  };
}
