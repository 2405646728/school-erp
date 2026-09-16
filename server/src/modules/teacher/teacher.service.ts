import type { Request } from 'express';
import { z } from 'zod';
import { all, get, run, scalar, transaction } from '../../db';
import type { TeacherRow } from '../../types';
import { ApiError, page } from '../../utils/http';
import { num, parseListQuery, safeSort, str } from '../../utils/query';
import { assertUnique, insert, mustExist, remove, update } from '../../utils/sql';
import { hashPassword } from '../../utils/password';

/** 新建教师时的初始密码 */
const DEFAULT_PASSWORD = '123456';

export const upsertSchema = z.object({
  teacherNo: z.string().min(3, '工号至少 3 位').max(30),
  name: z.string().min(2, '姓名至少 2 个字符').max(30),
  gender: z.enum(['男', '女']),
  title: z.enum(['教授', '副教授', '讲师', '助教', '研究员']),
  departmentId: z.number().int().positive('请选择所属院系').nullable().optional(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().max(60).optional().nullable(),
  hireDate: z.string().max(20).optional().nullable(),
  status: z.enum(['在职', '休假', '离职']),
  remark: z.string().max(255).optional().nullable(),
});

const SORTABLE: Record<string, string> = {
  teacherNo: 't.teacher_no',
  name: 't.name',
  title: 't.title',
  hireDate: 't.hire_date',
  createdAt: 't.created_at',
};

export function list(req: Request) {
  const query = parseListQuery(req);
  const sortColumn = safeSort(query.sortBy, SORTABLE, 't.teacher_no');

  const where: string[] = [];
  const params: (string | number)[] = [];
  if (query.keyword) {
    where.push('(t.name LIKE ? OR t.teacher_no LIKE ? OR t.phone LIKE ?)');
    const like = `%${query.keyword}%`;
    params.push(like, like, like);
  }
  const departmentId = num(req.query.departmentId);
  if (departmentId) {
    where.push('t.department_id = ?');
    params.push(departmentId);
  }
  const title = str(req.query.title);
  if (title) {
    where.push('t.title = ?');
    params.push(title);
  }
  const status = str(req.query.status);
  if (status) {
    where.push('t.status = ?');
    params.push(status);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = scalar<number>(
    `SELECT COUNT(*) FROM teacher t LEFT JOIN department d ON d.id = t.department_id ${whereSql}`,
    params,
  );

  const list = all<TeacherRow & { department_name: string | null; offering_count: number }>(
    `SELECT t.*, d.name AS department_name,
            (SELECT COUNT(*) FROM course_offering o WHERE o.teacher_id = t.id) AS offering_count
     FROM teacher t
     LEFT JOIN department d ON d.id = t.department_id
     ${whereSql}
     ORDER BY ${sortColumn} ${query.order}, t.id ASC
     LIMIT ? OFFSET ?`,
    [...params, query.pageSize, query.offset],
  );

  return page(list, total, query.page, query.pageSize);
}

export function options() {
  return all<{ id: number; teacher_no: string; name: string; title: string; department_id: number | null }>(
    `SELECT id, teacher_no, name, title, department_id FROM teacher
     WHERE status <> '离职' ORDER BY teacher_no ASC`,
  );
}

export function detail(id: number) {
  const row = mustExist<TeacherRow>('teacher', id, '教师');
  const department = get<{ id: number; name: string }>(
    `SELECT id, name FROM department WHERE id = ?`,
    [row.department_id],
  );
  const offerings = all<Record<string, unknown>>(
    `SELECT o.id, o.offering_code, o.semester, o.classroom, o.schedule, o.status,
            c.name AS course_name, c.credit,
            (SELECT COUNT(*) FROM enrollment e WHERE e.offering_id = o.id AND e.select_status = '已选') AS student_count
     FROM course_offering o
     JOIN course c ON c.id = o.course_id
     WHERE o.teacher_id = ? ORDER BY o.semester DESC, o.id DESC`,
    [id],
  );
  const account = get<Record<string, unknown>>(
    `SELECT id, username, status, last_login_at FROM sys_user WHERE role = 'teacher' AND ref_id = ?`,
    [id],
  );
  return { ...row, department: department ?? null, offerings, account: account ?? null };
}

export function create(input: z.infer<typeof upsertSchema>) {
  assertUnique('teacher', 'teacher_no', input.teacherNo, undefined, '教师工号');
  if (input.departmentId) mustExist('department', input.departmentId, '院系');

  return transaction(() => {
    const id = insert('teacher', {
      teacher_no: input.teacherNo,
      name: input.name,
      gender: input.gender,
      title: input.title,
      department_id: input.departmentId ?? null,
      phone: str(input.phone),
      email: str(input.email),
      hire_date: str(input.hireDate),
      status: input.status,
      remark: str(input.remark),
    });

    // 同步开通登录账号：账号 = 工号，初始密码 123456
    insert('sys_user', {
      username: input.teacherNo,
      password: hashPassword(DEFAULT_PASSWORD),
      real_name: input.name,
      role: 'teacher',
      ref_id: id,
      phone: str(input.phone),
      email: str(input.email),
      status: input.status === '离职' ? '停用' : '启用',
    });

    return detail(id);
  });
}

export function edit(id: number, input: z.infer<typeof upsertSchema>) {
  mustExist('teacher', id, '教师');
  assertUnique('teacher', 'teacher_no', input.teacherNo, id, '教师工号');
  if (input.departmentId) mustExist('department', input.departmentId, '院系');

  return transaction(() => {
    update('teacher', id, {
      teacher_no: input.teacherNo,
      name: input.name,
      gender: input.gender,
      title: input.title,
      department_id: input.departmentId ?? null,
      phone: str(input.phone),
      email: str(input.email),
      hire_date: str(input.hireDate),
      status: input.status,
      remark: str(input.remark),
    });

    run(
      `UPDATE sys_user SET real_name = ?, phone = ?, email = ?, status = ?,
              updated_at = datetime('now', 'localtime')
       WHERE role = 'teacher' AND ref_id = ?`,
      [
        input.name,
        str(input.phone),
        str(input.email),
        input.status === '离职' ? '停用' : '启用',
        id,
      ],
    );

    return detail(id);
  });
}

export function destroy(id: number) {
  mustExist('teacher', id, '教师');
  const offerings = scalar<number>(`SELECT COUNT(*) FROM course_offering WHERE teacher_id = ?`, [id]);
  if (offerings > 0) throw ApiError.badRequest(`该教师还有 ${offerings} 个教学班，请先调整开课信息`);

  return transaction(() => {
    run(`DELETE FROM sys_user WHERE role = 'teacher' AND ref_id = ?`, [id]);
    run(`UPDATE class_group SET counselor_id = NULL WHERE counselor_id = ?`, [id]);
    remove('teacher', id);
    return true;
  });
}

/** 重置教师登录密码为默认密码 */
export function resetPassword(id: number) {
  mustExist('teacher', id, '教师');
  const changes = run(
    `UPDATE sys_user SET password = ?, updated_at = datetime('now', 'localtime')
     WHERE role = 'teacher' AND ref_id = ?`,
    [hashPassword(DEFAULT_PASSWORD), id],
  ).changes;
  if (!changes) throw ApiError.notFound('该教师尚未开通登录账号');
  return DEFAULT_PASSWORD;
}

export function statByTitle() {
  return all<{ name: string; value: number }>(
    `SELECT title AS name, COUNT(*) AS value FROM teacher WHERE status = '在职' GROUP BY title`,
  );
}
