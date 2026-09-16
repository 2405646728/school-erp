import type { Request } from 'express';
import { z } from 'zod';
import { all, scalar } from '../../db';
import type { MajorRow } from '../../types';
import { ApiError, page } from '../../utils/http';
import { num, parseListQuery, safeSort, str } from '../../utils/query';
import { assertUnique, insert, mustExist, remove, update } from '../../utils/sql';

export const upsertSchema = z.object({
  code: z.string().min(2, '专业代码至少 2 位').max(20),
  name: z.string().min(2, '专业名称至少 2 个字符').max(50),
  departmentId: z.number().int().positive('请选择所属院系'),
  degreeType: z.enum(['专科', '本科', '硕士', '博士']),
  durationYears: z.number().int().min(2).max(8),
  description: z.string().max(255).optional().nullable(),
});

const SORTABLE: Record<string, string> = {
  code: 'm.code',
  name: 'm.name',
  gradeYear: 'm.id',
  createdAt: 'm.created_at',
  classCount: 'class_count',
  studentCount: 'student_count',
};

export function list(req: Request) {
  const query = parseListQuery(req);
  const sortColumn = safeSort(query.sortBy, SORTABLE, 'm.id');

  const where: string[] = [];
  const params: (string | number)[] = [];
  if (query.keyword) {
    where.push('(m.name LIKE ? OR m.code LIKE ? OR d.name LIKE ?)');
    const like = `%${query.keyword}%`;
    params.push(like, like, like);
  }
  const departmentId = num(req.query.departmentId);
  if (departmentId) {
    where.push('m.department_id = ?');
    params.push(departmentId);
  }
  const degreeType = str(req.query.degreeType);
  if (degreeType) {
    where.push('m.degree_type = ?');
    params.push(degreeType);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = scalar<number>(
    `SELECT COUNT(*) FROM major m LEFT JOIN department d ON d.id = m.department_id ${whereSql}`,
    params,
  );

  const list = all<MajorRow & { department_name: string; class_count: number; student_count: number }>(
    `SELECT m.*, d.name AS department_name,
            (SELECT COUNT(*) FROM class_group c WHERE c.major_id = m.id) AS class_count,
            (SELECT COUNT(*) FROM student s
               JOIN class_group c2 ON c2.id = s.class_id WHERE c2.major_id = m.id) AS student_count
     FROM major m
     LEFT JOIN department d ON d.id = m.department_id
     ${whereSql}
     ORDER BY ${sortColumn} ${query.order}, m.id ASC
     LIMIT ? OFFSET ?`,
    [...params, query.pageSize, query.offset],
  );

  return page(list, total, query.page, query.pageSize);
}

export function options(departmentId?: number | null) {
  const params: number[] = [];
  let whereSql = '';
  if (departmentId) {
    whereSql = 'WHERE m.department_id = ?';
    params.push(departmentId);
  }
  return all<{ id: number; code: string; name: string; department_id: number; degree_type: string }>(
    `SELECT m.id, m.code, m.name, m.department_id, m.degree_type
     FROM major m ${whereSql} ORDER BY m.id ASC`,
    params,
  );
}

export function detail(id: number) {
  const row = mustExist<MajorRow>('major', id, '专业');
  const department = all<{ id: number; name: string }>(
    `SELECT id, name FROM department WHERE id = ?`,
    [row.department_id],
  )[0];
  const classes = all<{ id: number; name: string; code: string; grade_year: number; student_count: number }>(
    `SELECT c.id, c.name, c.code, c.grade_year,
            (SELECT COUNT(*) FROM student s WHERE s.class_id = c.id) AS student_count
     FROM class_group c WHERE c.major_id = ? ORDER BY c.grade_year DESC, c.id`,
    [id],
  );
  return { ...row, department, classes };
}

export function create(input: z.infer<typeof upsertSchema>) {
  mustExist('department', input.departmentId, '院系');
  assertUnique('major', 'code', input.code, undefined, '专业代码');
  const id = insert('major', {
    code: input.code,
    name: input.name,
    department_id: input.departmentId,
    degree_type: input.degreeType,
    duration_years: input.durationYears,
    description: str(input.description),
  });
  return detail(id);
}

export function edit(id: number, input: z.infer<typeof upsertSchema>) {
  mustExist('major', id, '专业');
  mustExist('department', input.departmentId, '院系');
  assertUnique('major', 'code', input.code, id, '专业代码');
  update('major', id, {
    code: input.code,
    name: input.name,
    department_id: input.departmentId,
    degree_type: input.degreeType,
    duration_years: input.durationYears,
    description: str(input.description),
  });
  return detail(id);
}

export function destroy(id: number) {
  mustExist('major', id, '专业');
  const classes = scalar<number>(`SELECT COUNT(*) FROM class_group WHERE major_id = ?`, [id]);
  if (classes > 0) throw ApiError.badRequest(`该专业下还有 ${classes} 个班级，请先调整班级归属`);
  const courses = scalar<number>(`SELECT COUNT(*) FROM student s JOIN class_group c ON c.id = s.class_id WHERE c.major_id = ?`, [id]);
  if (courses > 0) throw ApiError.badRequest('该专业下仍有学生，无法删除');
  remove('major', id);
  return true;
}
