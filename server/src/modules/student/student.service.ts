import type { Request } from 'express';
import { z } from 'zod';
import { all, get, run, scalar, transaction } from '../../db';
import type { StudentRow } from '../../types';
import { ApiError, page } from '../../utils/http';
import { num, parseListQuery, safeSort, str } from '../../utils/query';
import { assertUnique, insert, mustExist, remove, update } from '../../utils/sql';
import { hashPassword } from '../../utils/password';

const DEFAULT_PASSWORD = '123456';

const studentBase = {
  name: z.string().min(2, '姓名至少 2 个字符').max(30),
  gender: z.enum(['男', '女']),
  birthDate: z.string().max(20).optional().nullable(),
  idCard: z.string().max(30).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().max(60).optional().nullable(),
  classId: z.number().int().positive().nullable().optional(),
  enrollYear: z.number().int().min(1990).max(2100),
  status: z.enum(['在读', '休学', '毕业', '退学']),
  politicalStatus: z.string().max(20),
  ethnicity: z.string().max(20).optional().nullable(),
  nativePlace: z.string().max(60).optional().nullable(),
  address: z.string().max(150).optional().nullable(),
  guardianName: z.string().max(30).optional().nullable(),
  guardianPhone: z.string().max(20).optional().nullable(),
  dormitory: z.string().max(30).optional().nullable(),
  remark: z.string().max(255).optional().nullable(),
};

export const createSchema = z.object({
  studentNo: z.string().min(4, '学号至少 4 位').max(30),
  ...studentBase,
});

export const updateSchema = z.object(studentBase);

export const importSchema = z.object({
  rows: z.array(z.record(z.string(), z.unknown())).min(1, '导入内容为空').max(2000, '单次最多导入 2000 行'),
});

const SORTABLE: Record<string, string> = {
  studentNo: 's.student_no',
  name: 's.name',
  enrollYear: 's.enroll_year',
  status: 's.status',
  createdAt: 's.created_at',
};

/** 学生列表的公共 SELECT / JOIN 片段 */
const STUDENT_SELECT = `
  SELECT s.*, c.name AS class_name, c.grade_year, m.name AS major_name, m.id AS major_id,
         d.name AS department_name, d.id AS department_id
  FROM student s
  LEFT JOIN class_group c ON c.id = s.class_id
  LEFT JOIN major m ON m.id = c.major_id
  LEFT JOIN department d ON d.id = m.department_id`;

function buildFilter(req: Request) {
  const where: string[] = [];
  const params: (string | number)[] = [];

  const keyword = str(req.query.keyword);
  if (keyword) {
    where.push('(s.name LIKE ? OR s.student_no LIKE ? OR s.phone LIKE ? OR s.id_card LIKE ?)');
    const like = `%${keyword}%`;
    params.push(like, like, like, like);
  }
  const departmentId = num(req.query.departmentId);
  if (departmentId) {
    where.push('d.id = ?');
    params.push(departmentId);
  }
  const majorId = num(req.query.majorId);
  if (majorId) {
    where.push('m.id = ?');
    params.push(majorId);
  }
  const classId = num(req.query.classId);
  if (classId) {
    where.push('s.class_id = ?');
    params.push(classId);
  }
  const status = str(req.query.status);
  if (status) {
    where.push('s.status = ?');
    params.push(status);
  }
  const gender = str(req.query.gender);
  if (gender) {
    where.push('s.gender = ?');
    params.push(gender);
  }
  const enrollYear = num(req.query.enrollYear);
  if (enrollYear) {
    where.push('s.enroll_year = ?');
    params.push(enrollYear);
  }

  return { whereSql: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

export function list(req: Request) {
  const query = parseListQuery(req);
  const sortColumn = safeSort(query.sortBy, SORTABLE, 's.student_no');
  const { whereSql, params } = buildFilter(req);

  const total = scalar<number>(
    `SELECT COUNT(*) FROM student s
       LEFT JOIN class_group c ON c.id = s.class_id
       LEFT JOIN major m ON m.id = c.major_id
       LEFT JOIN department d ON d.id = m.department_id
     ${whereSql}`,
    params,
  );

  const list = all<StudentRow & Record<string, unknown>>(
    `${STUDENT_SELECT} ${whereSql} ORDER BY ${sortColumn} ${query.order}, s.id ASC LIMIT ? OFFSET ?`,
    [...params, query.pageSize, query.offset],
  );

  return page(list, total, query.page, query.pageSize);
}

/** 学生档案详情：基础信息 + 班级链路 + 成绩单 + 学分统计 */
export function detail(id: number) {
  const row = get<StudentRow & Record<string, unknown>>(`${STUDENT_SELECT} WHERE s.id = ?`, [id]);
  if (!row) throw ApiError.notFound('学生不存在或已被删除');

  const transcript = all<Record<string, unknown>>(
    `SELECT e.id, e.score, e.select_status, e.exam_type,
            o.semester, o.offering_code, o.classroom,
            c.name AS course_name, c.course_code, c.credit, c.course_type,
            t.name AS teacher_name
     FROM enrollment e
     JOIN course_offering o ON o.id = e.offering_id
     JOIN course c ON c.id = o.course_id
     LEFT JOIN teacher t ON t.id = o.teacher_id
     WHERE e.student_id = ?
     ORDER BY o.semester DESC, c.course_code`,
    [id],
  );

  const scored = transcript.filter((t) => t.score !== null && t.score !== undefined);
  const totalCredit = scored
    .filter((t) => Number(t.score) >= 60)
    .reduce((sum, t) => sum + Number(t.credit ?? 0), 0);
  const avgScore = scored.length
    ? Math.round((scored.reduce((sum, t) => sum + Number(t.score), 0) / scored.length) * 10) / 10
    : 0;

  const account = get<Record<string, unknown>>(
    `SELECT id, username, status, last_login_at FROM sys_user WHERE role = 'student' AND ref_id = ?`,
    [id],
  );

  return {
    ...row,
    transcript,
    summary: {
      courseCount: transcript.length,
      scoredCount: scored.length,
      totalCredit: Math.round(totalCredit * 10) / 10,
      avgScore,
      failCount: scored.filter((t) => Number(t.score) < 60).length,
    },
    account: account ?? null,
  };
}

function buildColumns(input: Record<string, unknown>) {
  return {
    name: input.name as string,
    gender: input.gender as string,
    birth_date: str(input.birthDate),
    id_card: str(input.idCard),
    phone: str(input.phone),
    email: str(input.email),
    class_id: (input.classId as number | null | undefined) ?? null,
    enroll_year: input.enrollYear as number,
    status: input.status as string,
    political_status: input.politicalStatus as string,
    ethnicity: str(input.ethnicity),
    native_place: str(input.nativePlace),
    address: str(input.address),
    guardian_name: str(input.guardianName),
    guardian_phone: str(input.guardianPhone),
    dormitory: str(input.dormitory),
    remark: str(input.remark),
  };
}

export function create(input: z.infer<typeof createSchema>) {
  assertUnique('student', 'student_no', input.studentNo, undefined, '学号');
  if (input.classId) mustExist('class_group', input.classId, '班级');

  return transaction(() => {
    const id = insert('student', { student_no: input.studentNo, ...buildColumns(input) });
    insert('sys_user', {
      username: input.studentNo,
      password: hashPassword(DEFAULT_PASSWORD),
      real_name: input.name,
      role: 'student',
      ref_id: id,
      phone: str(input.phone),
      email: str(input.email),
      status: input.status === '在读' || input.status === '休学' ? '启用' : '停用',
    });
    return detail(id);
  });
}

export function edit(id: number, input: z.infer<typeof updateSchema>) {
  mustExist('student', id, '学生');
  if (input.classId) mustExist('class_group', input.classId, '班级');

  return transaction(() => {
    update('student', id, buildColumns(input));
    run(
      `UPDATE sys_user SET real_name = ?, phone = ?, email = ?, status = ?,
              updated_at = datetime('now', 'localtime')
       WHERE role = 'student' AND ref_id = ?`,
      [
        input.name,
        str(input.phone),
        str(input.email),
        input.status === '在读' || input.status === '休学' ? '启用' : '停用',
        id,
      ],
    );
    return detail(id);
  });
}

export function destroy(id: number) {
  mustExist('student', id, '学生');
  return transaction(() => {
    run(`DELETE FROM enrollment WHERE student_id = ?`, [id]);
    run(`DELETE FROM sys_user WHERE role = 'student' AND ref_id = ?`, [id]);
    remove('student', id);
    return true;
  });
}

export function batchDelete(ids: number[]) {
  if (!ids.length) throw ApiError.badRequest('请先选择要删除的学生');
  return transaction(() => {
    let deleted = 0;
    for (const id of ids) {
      run(`DELETE FROM enrollment WHERE student_id = ?`, [id]);
      run(`DELETE FROM sys_user WHERE role = 'student' AND ref_id = ?`, [id]);
      deleted += remove('student', id);
    }
    return deleted;
  });
}

/** 重置学生登录密码 */
export function resetPassword(id: number) {
  mustExist('student', id, '学生');
  const changes = run(
    `UPDATE sys_user SET password = ?, updated_at = datetime('now', 'localtime')
     WHERE role = 'student' AND ref_id = ?`,
    [hashPassword(DEFAULT_PASSWORD), id],
  ).changes;
  if (!changes) throw ApiError.notFound('该学生尚未开通登录账号');
  return DEFAULT_PASSWORD;
}

/** 批量导入：按学号去重，返回逐行错误明细 */
export interface ImportResult {
  total: number;
  success: number;
  failed: number;
  errors: { row: number; message: string }[];
}

const CLASS_NAME_INDEX = new Map<string, number>();

function resolveClassId(rawClass: string | undefined): number | null {
  if (!rawClass) return null;
  if (!CLASS_NAME_INDEX.size) {
    for (const row of all<{ id: number; name: string; code: string }>(
      `SELECT id, name, code FROM class_group`,
    )) {
      CLASS_NAME_INDEX.set(row.name, row.id);
      CLASS_NAME_INDEX.set(row.code, row.id);
    }
  }
  return CLASS_NAME_INDEX.get(rawClass.trim()) ?? null;
}

export function importStudents(rows: Record<string, unknown>[]): ImportResult {
  const result: ImportResult = { total: rows.length, success: 0, failed: 0, errors: [] };

  rows.forEach((raw, index) => {
    const rowNo = index + 1;
    try {
      const normalized = {
        studentNo: str(raw.studentNo ?? raw['学号']),
        name: str(raw.name ?? raw['姓名']),
        gender: str(raw.gender ?? raw['性别']) ?? '男',
        phone: str(raw.phone ?? raw['手机号']),
        email: str(raw.email ?? raw['邮箱']),
        classId: raw.classId ?? resolveClassId(str(raw.className ?? raw['班级']) ?? undefined),
        enrollYear: Number(raw.enrollYear ?? raw['入学年份'] ?? new Date().getFullYear()),
        status: str(raw.status ?? raw['学籍状态']) ?? '在读',
        politicalStatus: str(raw.politicalStatus ?? raw['政治面貌']) ?? '共青团员',
        ethnicity: str(raw.ethnicity ?? raw['民族']),
        nativePlace: str(raw.nativePlace ?? raw['籍贯']),
        address: str(raw.address ?? raw['家庭住址']),
        guardianName: str(raw.guardianName ?? raw['监护人']),
        guardianPhone: str(raw.guardianPhone ?? raw['监护人电话']),
        dormitory: str(raw.dormitory ?? raw['宿舍']),
        birthDate: str(raw.birthDate ?? raw['出生日期']),
        idCard: str(raw.idCard ?? raw['身份证号']),
        remark: null,
      };

      if (!normalized.studentNo) throw ApiError.badRequest('缺少学号');
      if (!normalized.name) throw ApiError.badRequest('缺少姓名');

      const input = createSchema.parse(normalized);
      if (get(`SELECT id FROM student WHERE student_no = ?`, [input.studentNo])) {
        throw ApiError.conflict(`学号 ${input.studentNo} 已存在`);
      }
      create(input);
      result.success += 1;
    } catch (error) {
      result.failed += 1;
      result.errors.push({
        row: rowNo,
        message: error instanceof Error ? error.message : '未知错误',
      });
    }
  });

  return result;
}

/** 导出 CSV（带 BOM，Excel 直接打开不乱码） */
export function exportCsv(req: Request): { filename: string; content: string } {
  const { whereSql, params } = buildFilter(req);
  const rows = all<Record<string, unknown>>(
    `${STUDENT_SELECT} ${whereSql} ORDER BY s.student_no ASC LIMIT 20000`,
    params,
  );

  const headers = [
    ['student_no', '学号'],
    ['name', '姓名'],
    ['gender', '性别'],
    ['birth_date', '出生日期'],
    ['id_card', '身份证号'],
    ['phone', '手机号'],
    ['email', '邮箱'],
    ['department_name', '院系'],
    ['major_name', '专业'],
    ['class_name', '班级'],
    ['enroll_year', '入学年份'],
    ['status', '学籍状态'],
    ['political_status', '政治面貌'],
    ['ethnicity', '民族'],
    ['native_place', '籍贯'],
    ['address', '家庭住址'],
    ['guardian_name', '监护人'],
    ['guardian_phone', '监护人电话'],
    ['dormitory', '宿舍'],
  ] as const;

  const escape = (value: unknown) => {
    const text = value === null || value === undefined ? '' : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const lines = [headers.map(([, label]) => label).join(',')];
  for (const row of rows) {
    lines.push(headers.map(([key]) => escape(row[key])).join(','));
  }

  return {
    filename: `students-${new Date().toISOString().slice(0, 10)}.csv`,
    content: `\uFEFF${lines.join('\r\n')}`,
  };
}

export function statistics() {
  return {
    total: scalar<number>(`SELECT COUNT(*) FROM student`),
    byStatus: all<{ name: string; value: number }>(
      `SELECT status AS name, COUNT(*) AS value FROM student GROUP BY status`,
    ),
    byGender: all<{ name: string; value: number }>(
      `SELECT gender AS name, COUNT(*) AS value FROM student GROUP BY gender`,
    ),
    byYear: all<{ name: string; value: number }>(
      `SELECT enroll_year AS name, COUNT(*) AS value FROM student GROUP BY enroll_year ORDER BY enroll_year`,
    ),
  };
}
