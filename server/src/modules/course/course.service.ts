import type { Request } from 'express';
import { z } from 'zod';
import { all, scalar } from '../../db';
import type { CourseRow } from '../../types';
import { ApiError, page } from '../../utils/http';
import { num, parseListQuery, safeSort, str } from '../../utils/query';
import { assertUnique, insert, mustExist, remove, update } from '../../utils/sql';

export const upsertSchema = z.object({
  courseCode: z.string().min(2, '课程代码至少 2 位').max(30),
  name: z.string().min(2, '课程名称至少 2 个字符').max(60),
  credit: z.number().min(0.5, '学分至少 0.5').max(20),
  hours: z.number().int().min(8, '学时至少 8').max(400),
  courseType: z.enum(['必修', '选修', '通识', '实践']),
  departmentId: z.number().int().positive().nullable().optional(),
  description: z.string().max(255).optional().nullable(),
});

const SORTABLE: Record<string, string> = {
  courseCode: 'c.course_code',
  name: 'c.name',
  credit: 'c.credit',
  createdAt: 'c.created_at',
  offeringCount: 'offering_count',
};

export function list(req: Request) {
  const query = parseListQuery(req);
  const sortColumn = safeSort(query.sortBy, SORTABLE, 'c.course_code');

  const where: string[] = [];
  const params: (string | number)[] = [];
  if (query.keyword) {
    where.push('(c.name LIKE ? OR c.course_code LIKE ? OR c.description LIKE ?)');
    const like = `%${query.keyword}%`;
    params.push(like, like, like);
  }
  const departmentId = num(req.query.departmentId);
  if (departmentId) {
    where.push('c.department_id = ?');
    params.push(departmentId);
  }
  const courseType = str(req.query.courseType);
  if (courseType) {
    where.push('c.course_type = ?');
    params.push(courseType);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = scalar<number>(
    `SELECT COUNT(*) FROM course c LEFT JOIN department d ON d.id = c.department_id ${whereSql}`,
    params,
  );

  const list = all<CourseRow & { department_name: string | null; offering_count: number }>(
    `SELECT c.*, d.name AS department_name,
            (SELECT COUNT(*) FROM course_offering o WHERE o.course_id = c.id) AS offering_count
     FROM course c
     LEFT JOIN department d ON d.id = c.department_id
     ${whereSql}
     ORDER BY ${sortColumn} ${query.order}, c.id ASC
     LIMIT ? OFFSET ?`,
    [...params, query.pageSize, query.offset],
  );

  return page(list, total, query.page, query.pageSize);
}

export function options() {
  return all<{ id: number; course_code: string; name: string; credit: number; course_type: string }>(
    `SELECT id, course_code, name, credit, course_type FROM course ORDER BY course_code ASC`,
  );
}

export function detail(id: number) {
  const row = mustExist<CourseRow>('course', id, '课程');
  const department = all<{ id: number; name: string }>(`SELECT id, name FROM department WHERE id = ?`, [
    row.department_id,
  ])[0];
  const offerings = all<Record<string, unknown>>(
    `SELECT o.id, o.offering_code, o.semester, o.status, t.name AS teacher_name,
            (SELECT COUNT(*) FROM enrollment e WHERE e.offering_id = o.id AND e.select_status = '已选') AS student_count
     FROM course_offering o LEFT JOIN teacher t ON t.id = o.teacher_id
     WHERE o.course_id = ? ORDER BY o.semester DESC`,
    [id],
  );
  return { ...row, department: department ?? null, offerings };
}

export function create(input: z.infer<typeof upsertSchema>) {
  assertUnique('course', 'course_code', input.courseCode, undefined, '课程代码');
  if (input.departmentId) mustExist('department', input.departmentId, '院系');
  const id = insert('course', {
    course_code: input.courseCode,
    name: input.name,
    credit: input.credit,
    hours: input.hours,
    course_type: input.courseType,
    department_id: input.departmentId ?? null,
    description: str(input.description),
  });
  return detail(id);
}

export function edit(id: number, input: z.infer<typeof upsertSchema>) {
  mustExist('course', id, '课程');
  assertUnique('course', 'course_code', input.courseCode, id, '课程代码');
  if (input.departmentId) mustExist('department', input.departmentId, '院系');
  update('course', id, {
    course_code: input.courseCode,
    name: input.name,
    credit: input.credit,
    hours: input.hours,
    course_type: input.courseType,
    department_id: input.departmentId ?? null,
    description: str(input.description),
  });
  return detail(id);
}

export function destroy(id: number) {
  mustExist('course', id, '课程');
  const offerings = scalar<number>(`SELECT COUNT(*) FROM course_offering WHERE course_id = ?`, [id]);
  if (offerings > 0) throw ApiError.badRequest(`该课程已开设 ${offerings} 个教学班，请先删除教学班`);
  remove('course', id);
  return true;
}
