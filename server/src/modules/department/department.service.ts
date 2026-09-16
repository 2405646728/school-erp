import { z } from 'zod';
import { all, get, scalar } from '../../db';
import type { DepartmentRow } from '../../types';
import { ApiError, page } from '../../utils/http';
import { parseListQuery, safeSort, str } from '../../utils/query';
import { assertUnique, insert, mustExist, remove, update } from '../../utils/sql';
import type { Request } from 'express';

export const upsertSchema = z.object({
  code: z.string().min(2, '院系代码至少 2 位').max(20),
  name: z.string().min(2, '院系名称至少 2 个字符').max(50),
  dean: z.string().max(30).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  office: z.string().max(60).optional().nullable(),
  description: z.string().max(255).optional().nullable(),
  sortOrder: z.number().int().optional(),
});

const SORTABLE: Record<string, string> = {
  code: 'd.code',
  name: 'd.name',
  sortOrder: 'd.sort_order',
  createdAt: 'd.created_at',
  studentCount: 'student_count',
};

export function list(req: Request) {
  const query = parseListQuery(req);
  const sortColumn = safeSort(query.sortBy, SORTABLE, 'd.sort_order');

  const where: string[] = [];
  const params: (string | number)[] = [];
  if (query.keyword) {
    where.push('(d.name LIKE ? OR d.code LIKE ? OR d.dean LIKE ?)');
    const like = `%${query.keyword}%`;
    params.push(like, like, like);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = scalar<number>(`SELECT COUNT(*) FROM department d ${whereSql}`, params);
  const list = all<DepartmentRow & { student_count: number; major_count: number; teacher_count: number }>(
    `SELECT d.*,
            (SELECT COUNT(*) FROM major m WHERE m.department_id = d.id) AS major_count,
            (SELECT COUNT(*) FROM teacher t WHERE t.department_id = d.id) AS teacher_count,
            (SELECT COUNT(*) FROM student s
               JOIN class_group c ON c.id = s.class_id
               JOIN major m2 ON m2.id = c.major_id
              WHERE m2.department_id = d.id) AS student_count
     FROM department d ${whereSql}
     ORDER BY ${sortColumn} ${query.order}, d.id ASC
     LIMIT ? OFFSET ?`,
    [...params, query.pageSize, query.offset],
  );

  return page(list, total, query.page, query.pageSize);
}

/** 下拉选项：供学生/教师/专业等表单使用 */
export function options() {
  return all<{ id: number; code: string; name: string }>(
    `SELECT id, code, name FROM department ORDER BY sort_order ASC, id ASC`,
  );
}

export function detail(id: number) {
  const row = mustExist<DepartmentRow>('department', id, '院系');
  const majors = all<{ id: number; name: string; code: string; student_count: number }>(
    `SELECT m.id, m.name, m.code,
            (SELECT COUNT(*) FROM class_group c
              JOIN student s ON s.class_id = c.id WHERE c.major_id = m.id) AS student_count
     FROM major m WHERE m.department_id = ? ORDER BY m.id`,
    [id],
  );
  return { ...row, majors };
}

export function create(input: z.infer<typeof upsertSchema>) {
  assertUnique('department', 'code', input.code, undefined, '院系代码');
  assertUnique('department', 'name', input.name, undefined, '院系名称');
  const id = insert('department', {
    code: input.code,
    name: input.name,
    dean: str(input.dean),
    phone: str(input.phone),
    office: str(input.office),
    description: str(input.description),
    sort_order: input.sortOrder ?? 0,
  });
  return detail(id);
}

export function edit(id: number, input: z.infer<typeof upsertSchema>) {
  mustExist('department', id, '院系');
  assertUnique('department', 'code', input.code, id, '院系代码');
  assertUnique('department', 'name', input.name, id, '院系名称');
  update('department', id, {
    code: input.code,
    name: input.name,
    dean: str(input.dean),
    phone: str(input.phone),
    office: str(input.office),
    description: str(input.description),
    sort_order: input.sortOrder ?? 0,
  });
  return detail(id);
}

export function destroy(id: number) {
  mustExist('department', id, '院系');
  const majors = scalar<number>(`SELECT COUNT(*) FROM major WHERE department_id = ?`, [id]);
  if (majors > 0) throw ApiError.badRequest(`该院系下还有 ${majors} 个专业，请先调整专业归属`);

  const teachers = scalar<number>(`SELECT COUNT(*) FROM teacher WHERE department_id = ?`, [id]);
  if (teachers > 0) throw ApiError.badRequest(`该院系下还有 ${teachers} 位教师，请先调整教师归属`);

  remove('department', id);
  return true;
}

export function summary() {
  const row = get<{ total: number; majors: number; students: number }>(
    `SELECT (SELECT COUNT(*) FROM department) AS total,
            (SELECT COUNT(*) FROM major) AS majors,
            (SELECT COUNT(*) FROM student) AS students`,
  );
  return row;
}
