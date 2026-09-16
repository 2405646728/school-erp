import type { Request } from 'express';
import { z } from 'zod';
import { all, get, scalar, transaction } from '../../db';
import type { AuthUser } from '../../types';
import { ApiError, page } from '../../utils/http';
import { num, parseListQuery, safeSort, str } from '../../utils/query';
import { insert, mustExist, remove, update } from '../../utils/sql';

export const scoreSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.number().int().positive(),
        score: z.number().min(0, '成绩不能小于 0').max(100, '成绩不能大于 100').nullable(),
        examType: z.enum(['正常考试', '补考', '重修']).optional(),
        remark: z.string().max(120).nullable().optional(),
      }),
    )
    .min(1, '没有需要保存的成绩'),
});

export const selectSchema = z.object({
  offeringId: z.number().int().positive(),
  studentIds: z.array(z.number().int().positive()).min(1, '请选择学生'),
});

const SORTABLE: Record<string, string> = {
  studentNo: 's.student_no',
  score: 'e.score',
  semester: 'o.semester',
  createdAt: 'e.created_at',
};

const ENROLLMENT_SELECT = `
  SELECT e.*, s.student_no, s.name AS student_name, s.gender,
         cg.name AS class_name, m.name AS major_name, d.name AS department_name,
         o.offering_code, o.semester, o.classroom, o.schedule,
         c.name AS course_name, c.course_code, c.credit, c.course_type,
         t.name AS teacher_name
  FROM enrollment e
  JOIN student s ON s.id = e.student_id
  JOIN course_offering o ON o.id = e.offering_id
  JOIN course c ON c.id = o.course_id
  LEFT JOIN teacher t ON t.id = o.teacher_id
  LEFT JOIN class_group cg ON cg.id = s.class_id
  LEFT JOIN major m ON m.id = cg.major_id
  LEFT JOIN department d ON d.id = m.department_id`;

/** 列表/成绩单查询返回的行（带索引签名，便于附加绩点等派生字段） */
interface JoinedRow {
  id: number;
  score: number | null;
  credit: number;
  [key: string]: unknown;
}

/** 百分制成绩换算绩点（4.0 制） */
export function toGradePoint(score: number): number {
  if (score >= 90) return 4.0;
  if (score >= 85) return 3.7;
  if (score >= 82) return 3.3;
  if (score >= 78) return 3.0;
  if (score >= 75) return 2.7;
  if (score >= 72) return 2.3;
  if (score >= 68) return 2.0;
  if (score >= 64) return 1.5;
  if (score >= 60) return 1.0;
  return 0;
}

export function list(req: Request) {
  const query = parseListQuery(req, 10, 500);
  const sortColumn = safeSort(query.sortBy, SORTABLE, 'e.id');

  const where: string[] = [];
  const params: (string | number)[] = [];
  if (query.keyword) {
    where.push('(s.name LIKE ? OR s.student_no LIKE ? OR c.name LIKE ?)');
    const like = `%${query.keyword}%`;
    params.push(like, like, like);
  }
  const offeringId = num(req.query.offeringId);
  if (offeringId) {
    where.push('e.offering_id = ?');
    params.push(offeringId);
  }
  const studentId = num(req.query.studentId);
  if (studentId) {
    where.push('e.student_id = ?');
    params.push(studentId);
  }
  const semester = str(req.query.semester);
  if (semester) {
    where.push('o.semester = ?');
    params.push(semester);
  }
  const courseId = num(req.query.courseId);
  if (courseId) {
    where.push('c.id = ?');
    params.push(courseId);
  }
  const teacherId = num(req.query.teacherId);
  if (teacherId) {
    where.push('o.teacher_id = ?');
    params.push(teacherId);
  }
  const classId = num(req.query.classId);
  if (classId) {
    where.push('s.class_id = ?');
    params.push(classId);
  }
  const selectStatus = str(req.query.selectStatus);
  if (selectStatus) {
    where.push('e.select_status = ?');
    params.push(selectStatus);
  }
  const scoreState = str(req.query.scoreState);
  if (scoreState === '已录入') where.push('e.score IS NOT NULL');
  if (scoreState === '未录入') where.push('e.score IS NULL');
  if (str(req.query.onlyFail) === '1') where.push('e.score IS NOT NULL AND e.score < 60');
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = scalar<number>(
    `SELECT COUNT(*) FROM enrollment e
       JOIN student s ON s.id = e.student_id
       JOIN course_offering o ON o.id = e.offering_id
       JOIN course c ON c.id = o.course_id
       LEFT JOIN class_group cg ON cg.id = s.class_id
       LEFT JOIN major m ON m.id = cg.major_id ${whereSql}`,
    params,
  );

  const rows = all<JoinedRow>(
    `${ENROLLMENT_SELECT} ${whereSql} ORDER BY ${sortColumn} ${query.order}, e.id ASC LIMIT ? OFFSET ?`,
    [...params, query.pageSize, query.offset],
  );

  const list = rows.map((row) => ({
    ...row,
    grade_point: row.score === null || row.score === undefined ? null : toGradePoint(Number(row.score)),
  }));

  return page(list, total, query.page, query.pageSize);
}

/** 批量录入/修改成绩 */
export function batchScore(input: z.infer<typeof scoreSchema>, auth: AuthUser) {
  const updated = transaction(() => {
    let count = 0;
    for (const item of input.items) {
      const row = mustExist<{ id: number; offering_id: number }>('enrollment', item.id, '选课记录');

      if (auth.role === 'teacher') {
        const owner = get<{ id: number }>(
          `SELECT o.id FROM course_offering o WHERE o.id = ? AND o.teacher_id = ?`,
          [row.offering_id, auth.refId ?? 0],
        );
        if (!owner) throw ApiError.forbidden('只能录入本人授课教学班的成绩');
      }

      update('enrollment', item.id, {
        score: item.score,
        exam_type: item.examType ?? '正常考试',
        remark: item.remark ?? null,
      });
      count += 1;
    }
    return count;
  });

  return { updated };
}

/** 手工选课：把学生加入指定教学班 */
export function selectCourse(input: z.infer<typeof selectSchema>) {
  const offering = mustExist<{ id: number; capacity: number }>(
    'course_offering',
    input.offeringId,
    '教学班',
  );
  const enrolled = scalar<number>(
    `SELECT COUNT(*) FROM enrollment WHERE offering_id = ? AND select_status = '已选'`,
    [offering.id],
  );
  if (enrolled + input.studentIds.length > offering.capacity) {
    throw ApiError.badRequest(`超出教学班容量（${offering.capacity} 人）`);
  }

  return transaction(() => {
    let added = 0;
    for (const studentId of input.studentIds) {
      mustExist('student', studentId, '学生');
      const exists = get<{ id: number; select_status: string }>(
        `SELECT id, select_status FROM enrollment WHERE offering_id = ? AND student_id = ?`,
        [offering.id, studentId],
      );
      if (exists) {
        if (exists.select_status === '退选') {
          update('enrollment', exists.id, { select_status: '已选' });
          added += 1;
        }
        continue;
      }
      insert('enrollment', { offering_id: offering.id, student_id: studentId, select_status: '已选' });
      added += 1;
    }
    return { added };
  });
}

/** 退选 */
export function drop(id: number, auth: AuthUser) {
  const row = mustExist<{ id: number; student_id: number; score: number | null }>(
    'enrollment',
    id,
    '选课记录',
  );
  if (row.score !== null && row.score !== undefined) {
    throw ApiError.badRequest('该记录已录入成绩，不能退选');
  }
  if (auth.role === 'student' && row.student_id !== auth.refId) {
    throw ApiError.forbidden('只能退选本人的课程');
  }
  remove('enrollment', id);
  return true;
}

/** 学生端：我的课表 */
export function myCourses(auth: AuthUser, semester?: string | null) {
  if (!auth.refId) throw ApiError.badRequest('当前账号未关联学生档案');

  const where = ['e.student_id = ?', `e.select_status = '已选'`];
  const params: (string | number)[] = [auth.refId];
  if (semester) {
    where.push('o.semester = ?');
    params.push(semester);
  }

  const list = all<Record<string, unknown>>(
    `SELECT e.id, e.score, e.exam_type, o.semester, o.classroom, o.schedule, o.offering_code,
            c.name AS course_name, c.course_code, c.credit, c.course_type,
            t.name AS teacher_name,
            (SELECT COUNT(*) FROM enrollment e2 WHERE e2.offering_id = o.id AND e2.select_status = '已选') AS class_size
     FROM enrollment e
     JOIN course_offering o ON o.id = e.offering_id
     JOIN course c ON c.id = o.course_id
     LEFT JOIN teacher t ON t.id = o.teacher_id
     WHERE ${where.join(' AND ')}
     ORDER BY o.semester DESC, c.course_code`,
    params,
  );

  const totalCredit = list.reduce((sum, row) => sum + Number(row.credit ?? 0), 0);
  const semesters = all<{ semester: string }>(
    `SELECT DISTINCT o.semester FROM enrollment e JOIN course_offering o ON o.id = e.offering_id
     WHERE e.student_id = ? ORDER BY o.semester DESC`,
    [auth.refId],
  ).map((row) => row.semester);

  return { list, semesters, totalCredit: Math.round(totalCredit * 10) / 10 };
}

/** 学生端：我的成绩单 + 绩点 */
export function myScores(auth: AuthUser) {
  if (!auth.refId) throw ApiError.badRequest('当前账号未关联学生档案');

  const list = all<JoinedRow>(
    `SELECT e.id, e.score, e.exam_type, o.semester, c.name AS course_name, c.course_code,
            c.credit, c.course_type, t.name AS teacher_name
     FROM enrollment e
     JOIN course_offering o ON o.id = e.offering_id
     JOIN course c ON c.id = o.course_id
     LEFT JOIN teacher t ON t.id = o.teacher_id
     WHERE e.student_id = ? AND e.select_status = '已选' AND e.score IS NOT NULL
     ORDER BY o.semester DESC, c.course_code`,
    [auth.refId],
  );

  const withGp = list.map((row) => ({
    ...row,
    grade_point: toGradePoint(Number(row.score)),
  }));

  const totalCredit = withGp.filter((r) => Number(r.score) >= 60).reduce((s, r) => s + Number(r.credit), 0);
  const weighted = withGp.reduce((s, r) => s + Number(r.credit) * Number(r.grade_point), 0);
  const totalCreditAll = withGp.reduce((s, r) => s + Number(r.credit), 0);

  return {
    list: withGp,
    summary: {
      courseCount: withGp.length,
      passedCredit: Math.round(totalCredit * 10) / 10,
      totalCredit: Math.round(totalCreditAll * 10) / 10,
      gpa: totalCreditAll ? Math.round((weighted / totalCreditAll) * 100) / 100 : 0,
      avgScore: withGp.length
        ? Math.round((withGp.reduce((s, r) => s + Number(r.score), 0) / withGp.length) * 10) / 10
        : 0,
      failCount: withGp.filter((r) => Number(r.score) < 60).length,
    },
  };
}

/** 教师端：我授课的教学班 + 成绩录入进度 */
export function myTeachings(auth: AuthUser, semester?: string | null) {
  if (!auth.refId) throw ApiError.badRequest('当前账号未关联教师档案');

  const where = ['o.teacher_id = ?'];
  const params: (string | number)[] = [auth.refId];
  if (semester) {
    where.push('o.semester = ?');
    params.push(semester);
  }

  const list = all<Record<string, unknown>>(
    `SELECT o.id, o.offering_code, o.semester, o.classroom, o.schedule, o.capacity, o.status,
            c.name AS course_name, c.course_code, c.credit, c.course_type,
            cg.name AS class_name,
            (SELECT COUNT(*) FROM enrollment e WHERE e.offering_id = o.id AND e.select_status = '已选') AS student_count,
            (SELECT COUNT(*) FROM enrollment e WHERE e.offering_id = o.id AND e.score IS NOT NULL) AS scored_count
     FROM course_offering o
     JOIN course c ON c.id = o.course_id
     LEFT JOIN class_group cg ON cg.id = o.class_id
     WHERE ${where.join(' AND ')}
     ORDER BY o.semester DESC, c.course_code`,
    params,
  );

  const semesters = all<{ semester: string }>(
    `SELECT DISTINCT semester FROM course_offering WHERE teacher_id = ? ORDER BY semester DESC`,
    [auth.refId],
  ).map((row) => row.semester);

  return { list, semesters };
}

/** 选课情况总览（管理端首页用） */
export function overview() {
  const total = scalar<number>(`SELECT COUNT(*) FROM enrollment WHERE select_status = '已选'`);
  const scored = scalar<number>(`SELECT COUNT(*) FROM enrollment WHERE score IS NOT NULL`);
  const avg = get<{ avg_score: number | null }>(
    `SELECT ROUND(AVG(score), 1) AS avg_score FROM enrollment WHERE score IS NOT NULL`,
  );
  return {
    total,
    scored,
    unscored: total - scored,
    avgScore: avg?.avg_score ?? 0,
    bySemester: all<{ name: string; value: number }>(
      `SELECT o.semester AS name, COUNT(*) AS value FROM enrollment e
       JOIN course_offering o ON o.id = e.offering_id
       WHERE e.select_status = '已选' GROUP BY o.semester ORDER BY o.semester DESC LIMIT 8`,
    ),
  };
}
