import type { Request } from 'express';
import { z } from 'zod';
import { all, scalar } from '../../db';
import type { ClassRow } from '../../types';
import { ApiError, page } from '../../utils/http';
import { num, parseListQuery, safeSort, str } from '../../utils/query';
import { assertUnique, insert, mustExist, remove, update } from '../../utils/sql';

export const upsertSchema = z.object({
  code: z.string().min(2, '班级编号至少 2 位').max(30),
  name: z.string().min(2, '班级名称至少 2 个字符').max(50),
  majorId: z.number().int().positive('请选择所属专业'),
  gradeYear: z.number().int().min(1990).max(2100),
  counselorId: z.number().int().positive().nullable().optional(),
  classroom: z.string().max(50).optional().nullable(),
  status: z.enum(['在读', '已毕业']),
});

const SORTABLE: Record<string, string> = {
  code: 'c.code',
  name: 'c.name',
  gradeYear: 'c.grade_year',
  createdAt: 'c.created_at',
  studentCount: 'student_count',
};

export function list(req: Request) {
  const query = parseListQuery(req);
  const sortColumn = safeSort(query.sortBy, SORTABLE, 'c.grade_year');

  const where: string[] = [];
  const params: (string | number)[] = [];
  if (query.keyword) {
    where.push('(c.name LIKE ? OR c.code LIKE ? OR m.name LIKE ?)');
    const like = `%${query.keyword}%`;
    params.push(like, like, like);
  }
  const majorId = num(req.query.majorId);
  if (majorId) {
    where.push('c.major_id = ?');
    params.push(majorId);
  }
  const departmentId = num(req.query.departmentId);
  if (departmentId) {
    where.push('m.department_id = ?');
    params.push(departmentId);
  }
  const gradeYear = num(req.query.gradeYear);
  if (gradeYear) {
    where.push('c.grade_year = ?');
    params.push(gradeYear);
  }
  const status = str(req.query.status);
  if (status) {
    where.push('c.status = ?');
    params.push(status);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = scalar<number>(
    `SELECT COUNT(*) FROM class_group c
       LEFT JOIN major m ON m.id = c.major_id ${whereSql}`,
    params,
  );

  const list = all<
    ClassRow & {
      major_name: string;
      department_name: string;
      counselor_name: string | null;
      student_count: number;
    }
  >(
    `SELECT c.*, m.name AS major_name, d.name AS department_name, t.name AS counselor_name,
            (SELECT COUNT(*) FROM student s WHERE s.class_id = c.id) AS student_count
     FROM class_group c
     LEFT JOIN major m ON m.id = c.major_id
     LEFT JOIN department d ON d.id = m.department_id
     LEFT JOIN teacher t ON t.id = c.counselor_id
     ${whereSql}
     ORDER BY ${sortColumn} ${query.order}, c.id ASC
     LIMIT ? OFFSET ?`,
    [...params, query.pageSize, query.offset],
  );

  return page(list, total, query.page, query.pageSize);
}

export function options(req: Request) {
  const majorId = num(req.query.majorId);
  const params: number[] = [];
  let whereSql = '';
  if (majorId) {
    whereSql = 'WHERE c.major_id = ?';
    params.push(majorId);
  }
  return all<{ id: number; code: string; name: string; major_id: number; grade_year: number }>(
    `SELECT c.id, c.code, c.name, c.major_id, c.grade_year
     FROM class_group c ${whereSql} ORDER BY c.grade_year DESC, c.id ASC`,
    params,
  );
}

export function detail(id: number) {
  const row = mustExist<ClassRow>('class_group', id, '班级');
  const students = all<Record<string, unknown>>(
    `SELECT id, student_no, name, gender, phone, status FROM student
     WHERE class_id = ? ORDER BY student_no LIMIT 200`,
    [id],
  );
  const context = all<{ major_name: string; department_name: string; counselor_name: string | null }>(
    `SELECT m.name AS major_name, d.name AS department_name, t.name AS counselor_name
     FROM class_group c
     LEFT JOIN major m ON m.id = c.major_id
     LEFT JOIN department d ON d.id = m.department_id
     LEFT JOIN teacher t ON t.id = c.counselor_id
     WHERE c.id = ?`,
    [id],
  )[0];
  return { ...row, ...context, students };
}

export function create(input: z.infer<typeof upsertSchema>) {
  mustExist('major', input.majorId, '专业');
  if (input.counselorId) mustExist('teacher', input.counselorId, '辅导员');
  assertUnique('class_group', 'code', input.code, undefined, '班级编号');
  const id = insert('class_group', {
    code: input.code,
    name: input.name,
    major_id: input.majorId,
    grade_year: input.gradeYear,
    counselor_id: input.counselorId ?? null,
    classroom: str(input.classroom),
    status: input.status,
  });
  return detail(id);
}

export function edit(id: number, input: z.infer<typeof upsertSchema>) {
  mustExist('class_group', id, '班级');
  mustExist('major', input.majorId, '专业');
  if (input.counselorId) mustExist('teacher', input.counselorId, '辅导员');
  assertUnique('class_group', 'code', input.code, id, '班级编号');
  update('class_group', id, {
    code: input.code,
    name: input.name,
    major_id: input.majorId,
    grade_year: input.gradeYear,
    counselor_id: input.counselorId ?? null,
    classroom: str(input.classroom),
    status: input.status,
  });
  return detail(id);
}

export function destroy(id: number) {
  mustExist('class_group', id, '班级');
  const students = scalar<number>(`SELECT COUNT(*) FROM student WHERE class_id = ?`, [id]);
  if (students > 0) throw ApiError.badRequest(`该班级下还有 ${students} 名学生，请先调整学生归属`);
  remove('class_group', id);
  return true;
}
