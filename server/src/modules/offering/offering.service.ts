import type { Request } from 'express';
import { z } from 'zod';
import { all, get, scalar, transaction } from '../../db';
import type { OfferingRow } from '../../types';
import { ApiError, page } from '../../utils/http';
import { num, parseListQuery, safeSort, str } from '../../utils/query';
import { assertUnique, insert, mustExist, remove, update } from '../../utils/sql';

export const upsertSchema = z.object({
  offeringCode: z.string().min(3, '教学班编号至少 3 位').max(40),
  courseId: z.number().int().positive('请选择课程'),
  teacherId: z.number().int().positive().nullable().optional(),
  semester: z.string().min(4, '请填写学期，例如 2025-2026-1').max(20),
  classId: z.number().int().positive().nullable().optional(),
  classroom: z.string().max(50).optional().nullable(),
  schedule: z.string().max(80).optional().nullable(),
  capacity: z.number().int().min(1, '容量至少 1 人').max(500),
  status: z.enum(['开放选课', '已结束']),
});

export const enrollSchema = z.object({
  studentIds: z.array(z.number().int().positive()).min(1, '请选择学生'),
});

const SORTABLE: Record<string, string> = {
  offeringCode: 'o.offering_code',
  semester: 'o.semester',
  capacity: 'o.capacity',
  createdAt: 'o.created_at',
  studentCount: 'student_count',
};

const OFFERING_SELECT = `
  SELECT o.*, c.name AS course_name, c.course_code, c.credit, c.course_type,
         t.name AS teacher_name, cg.name AS class_name,
         d.name AS department_name,
         (SELECT COUNT(*) FROM enrollment e WHERE e.offering_id = o.id AND e.select_status = '已选') AS student_count
  FROM course_offering o
  LEFT JOIN course c ON c.id = o.course_id
  LEFT JOIN teacher t ON t.id = o.teacher_id
  LEFT JOIN class_group cg ON cg.id = o.class_id
  LEFT JOIN department d ON d.id = c.department_id`;

export function list(req: Request) {
  const query = parseListQuery(req);
  const sortColumn = safeSort(query.sortBy, SORTABLE, 'o.semester');

  const where: string[] = [];
  const params: (string | number)[] = [];
  if (query.keyword) {
    where.push('(c.name LIKE ? OR o.offering_code LIKE ? OR t.name LIKE ? OR o.classroom LIKE ?)');
    const like = `%${query.keyword}%`;
    params.push(like, like, like, like);
  }
  const semester = str(req.query.semester);
  if (semester) {
    where.push('o.semester = ?');
    params.push(semester);
  }
  const courseId = num(req.query.courseId);
  if (courseId) {
    where.push('o.course_id = ?');
    params.push(courseId);
  }
  const teacherId = num(req.query.teacherId);
  if (teacherId) {
    where.push('o.teacher_id = ?');
    params.push(teacherId);
  }
  const classId = num(req.query.classId);
  if (classId) {
    where.push('o.class_id = ?');
    params.push(classId);
  }
  const status = str(req.query.status);
  if (status) {
    where.push('o.status = ?');
    params.push(status);
  }
  const departmentId = num(req.query.departmentId);
  if (departmentId) {
    where.push('c.department_id = ?');
    params.push(departmentId);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = scalar<number>(
    `SELECT COUNT(*) FROM course_offering o
       LEFT JOIN course c ON c.id = o.course_id
       LEFT JOIN teacher t ON t.id = o.teacher_id ${whereSql}`,
    params,
  );

  const list = all<OfferingRow & Record<string, unknown>>(
    `${OFFERING_SELECT} ${whereSql} ORDER BY ${sortColumn} ${query.order}, o.id DESC LIMIT ? OFFSET ?`,
    [...params, query.pageSize, query.offset],
  );

  return page(list, total, query.page, query.pageSize);
}

export function options(req: Request) {
  const semester = str(req.query.semester);
  const teacherId = num(req.query.teacherId);
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (semester) {
    where.push('o.semester = ?');
    params.push(semester);
  }
  if (teacherId) {
    where.push('o.teacher_id = ?');
    params.push(teacherId);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  return all<{ id: number; offering_code: string; course_name: string; semester: string }>(
    `SELECT o.id, o.offering_code, c.name AS course_name, o.semester
     FROM course_offering o JOIN course c ON c.id = o.course_id
     ${whereSql} ORDER BY o.semester DESC, c.name ASC`,
    params,
  );
}

export function semesters() {
  return all<{ semester: string }>(
    `SELECT DISTINCT semester FROM course_offering ORDER BY semester DESC`,
  ).map((row) => row.semester);
}

/** 教学班详情：含学生名单与成绩（成绩录入页数据源） */
export function detail(id: number) {
  const row = get<OfferingRow & Record<string, unknown>>(`${OFFERING_SELECT} WHERE o.id = ?`, [id]);
  if (!row) throw ApiError.notFound('教学班不存在或已被删除');

  const roster = all<Record<string, unknown>>(
    `SELECT e.id, e.student_id, e.score, e.select_status, e.exam_type, e.remark,
            s.student_no, s.name AS student_name, s.gender,
            cg.name AS class_name, m.name AS major_name
     FROM enrollment e
     JOIN student s ON s.id = e.student_id
     LEFT JOIN class_group cg ON cg.id = s.class_id
     LEFT JOIN major m ON m.id = cg.major_id
     WHERE e.offering_id = ?
     ORDER BY s.student_no ASC`,
    [id],
  );

  const scored = roster.filter((r) => r.score !== null && r.score !== undefined);
  const scores = scored.map((r) => Number(r.score));

  return {
    ...row,
    roster,
    summary: {
      enrolled: roster.filter((r) => r.select_status === '已选').length,
      scoredCount: scored.length,
      avgScore: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0,
      maxScore: scores.length ? Math.max(...scores) : 0,
      minScore: scores.length ? Math.min(...scores) : 0,
      passRate: scores.length
        ? Math.round((scores.filter((s) => s >= 60).length / scores.length) * 1000) / 10
        : 0,
    },
  };
}

export function create(input: z.infer<typeof upsertSchema>) {
  assertUnique('course_offering', 'offering_code', input.offeringCode, undefined, '教学班编号');
  mustExist('course', input.courseId, '课程');
  if (input.teacherId) mustExist('teacher', input.teacherId, '授课教师');
  if (input.classId) mustExist('class_group', input.classId, '上课班级');

  const id = insert('course_offering', {
    offering_code: input.offeringCode,
    course_id: input.courseId,
    teacher_id: input.teacherId ?? null,
    semester: input.semester,
    class_id: input.classId ?? null,
    classroom: str(input.classroom),
    schedule: str(input.schedule),
    capacity: input.capacity,
    status: input.status,
  });

  // 面向行政班开课时，自动把该班在读学生加入名单，减少手工操作
  if (input.classId) {
    const students = all<{ id: number }>(
      `SELECT id FROM student WHERE class_id = ? AND status IN ('在读','休学')`,
      [input.classId],
    );
    transaction(() => {
      for (const student of students) {
        insert('enrollment', { offering_id: id, student_id: student.id, select_status: '已选' });
      }
    });
  }

  return detail(id);
}

export function edit(id: number, input: z.infer<typeof upsertSchema>) {
  mustExist('course_offering', id, '教学班');
  assertUnique('course_offering', 'offering_code', input.offeringCode, id, '教学班编号');
  mustExist('course', input.courseId, '课程');
  if (input.teacherId) mustExist('teacher', input.teacherId, '授课教师');
  if (input.classId) mustExist('class_group', input.classId, '上课班级');

  update('course_offering', id, {
    offering_code: input.offeringCode,
    course_id: input.courseId,
    teacher_id: input.teacherId ?? null,
    semester: input.semester,
    class_id: input.classId ?? null,
    classroom: str(input.classroom),
    schedule: str(input.schedule),
    capacity: input.capacity,
    status: input.status,
  });
  return detail(id);
}

export function destroy(id: number) {
  mustExist('course_offering', id, '教学班');
  const enrolled = scalar<number>(
    `SELECT COUNT(*) FROM enrollment WHERE offering_id = ? AND score IS NOT NULL`,
    [id],
  );
  if (enrolled > 0) throw ApiError.badRequest('该教学班已录入成绩，无法删除，可将其状态改为「已结束」');
  remove('course_offering', id);
  return true;
}

/** 批量把学生加入教学班（补录/手工选课） */
export function enrollStudents(id: number, studentIds: number[]) {
  const offering = mustExist<OfferingRow>('course_offering', id, '教学班');
  const enrolled = scalar<number>(
    `SELECT COUNT(*) FROM enrollment WHERE offering_id = ? AND select_status = '已选'`,
    [id],
  );
  const existing = all<{ student_id: number }>(
    `SELECT student_id FROM enrollment WHERE offering_id = ?`,
    [id],
  ).map((row) => row.student_id);

  const fresh = studentIds.filter((sid) => !existing.includes(sid));
  if (enrolled + fresh.length > offering.capacity) {
    throw ApiError.badRequest(`超出教学班容量（${offering.capacity} 人），当前已选 ${enrolled} 人`);
  }

  transaction(() => {
    for (const sid of studentIds) {
      mustExist('student', sid, '学生');
      if (existing.includes(sid)) continue; // 已在名单中，跳过
      insert('enrollment', { offering_id: id, student_id: sid, select_status: '已选' });
    }
  });

  return { added: fresh.length, skipped: studentIds.length - fresh.length };
}
