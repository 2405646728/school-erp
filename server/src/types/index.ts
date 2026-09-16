/** 全局共享类型 */
import type { Request } from 'express';

export type Role = 'admin' | 'teacher' | 'student';

export interface AuthUser {
  uid: number;
  username: string;
  role: Role;
  realName: string;
  refId: number | null;
}

/** 携带登录态与权限上下文的请求对象 */
export interface AuthedRequest extends Request {
  user?: AuthUser;
  /** 写操作审计描述，由各路由设置后写入 sys_log */
  auditDetail?: string;
}

export interface ListQuery {
  page: number;
  pageSize: number;
  keyword: string;
  offset: number;
}

export interface DepartmentRow {
  id: number;
  code: string;
  name: string;
  dean: string | null;
  phone: string | null;
  office: string | null;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface MajorRow {
  id: number;
  code: string;
  name: string;
  department_id: number;
  degree_type: string;
  duration_years: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClassRow {
  id: number;
  code: string;
  name: string;
  major_id: number;
  grade_year: number;
  counselor_id: number | null;
  classroom: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface TeacherRow {
  id: number;
  teacher_no: string;
  name: string;
  gender: string;
  title: string;
  department_id: number | null;
  phone: string | null;
  email: string | null;
  hire_date: string | null;
  status: string;
  remark: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentRow {
  id: number;
  student_no: string;
  name: string;
  gender: string;
  birth_date: string | null;
  id_card: string | null;
  phone: string | null;
  email: string | null;
  class_id: number | null;
  enroll_year: number;
  status: string;
  political_status: string;
  ethnicity: string | null;
  native_place: string | null;
  address: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  dormitory: string | null;
  remark: string | null;
  created_at: string;
  updated_at: string;
}

export interface CourseRow {
  id: number;
  course_code: string;
  name: string;
  credit: number;
  hours: number;
  course_type: string;
  department_id: number | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface OfferingRow {
  id: number;
  offering_code: string;
  course_id: number;
  teacher_id: number | null;
  semester: string;
  class_id: number | null;
  classroom: string | null;
  schedule: string | null;
  capacity: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface EnrollmentRow {
  id: number;
  offering_id: number;
  student_id: number;
  select_status: string;
  score: number | null;
  exam_type: string;
  remark: string | null;
  created_at: string;
  updated_at: string;
}

export interface SysUserRow {
  id: number;
  username: string;
  password: string;
  real_name: string;
  role: Role;
  ref_id: number | null;
  phone: string | null;
  email: string | null;
  avatar: string | null;
  status: string;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}
