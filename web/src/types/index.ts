/** 与后端返回结构保持一致（数据库字段为 snake_case，直接复用避免多一层映射） */

export type Role = 'admin' | 'teacher' | 'student';

export interface UserInfo {
  uid: number;
  username: string;
  role: Role;
  realName: string;
  refId: number | null;
  avatar?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface Department {
  id: number;
  code: string;
  name: string;
  dean: string | null;
  phone: string | null;
  office: string | null;
  description: string | null;
  sort_order: number;
  major_count?: number;
  teacher_count?: number;
  student_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Major {
  id: number;
  code: string;
  name: string;
  department_id: number;
  department_name?: string;
  degree_type: string;
  duration_years: number;
  description: string | null;
  class_count?: number;
  student_count?: number;
}

export interface ClassGroup {
  id: number;
  code: string;
  name: string;
  major_id: number;
  major_name?: string;
  department_name?: string;
  counselor_id: number | null;
  counselor_name?: string | null;
  grade_year: number;
  classroom: string | null;
  status: string;
  student_count?: number;
}

export interface Teacher {
  id: number;
  teacher_no: string;
  name: string;
  gender: string;
  title: string;
  department_id: number | null;
  department_name?: string | null;
  phone: string | null;
  email: string | null;
  hire_date: string | null;
  status: string;
  remark: string | null;
  offering_count?: number;
}

export interface Student {
  id: number;
  student_no: string;
  name: string;
  gender: string;
  birth_date: string | null;
  id_card: string | null;
  phone: string | null;
  email: string | null;
  class_id: number | null;
  class_name?: string | null;
  major_id?: number | null;
  major_name?: string | null;
  department_id?: number | null;
  department_name?: string | null;
  grade_year?: number;
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
  created_at?: string;
}

export interface StudentDetail extends Student {
  transcript: TranscriptRow[];
  summary: {
    courseCount: number;
    scoredCount: number;
    totalCredit: number;
    avgScore: number;
    failCount: number;
  };
  account: { id: number; username: string; status: string; last_login_at: string | null } | null;
}

export interface TranscriptRow {
  id: number;
  score: number | null;
  select_status: string;
  exam_type: string;
  semester: string;
  offering_code: string;
  classroom: string | null;
  course_name: string;
  course_code: string;
  credit: number;
  course_type: string;
  teacher_name: string | null;
  grade_point?: number | null;
}

export interface Course {
  id: number;
  course_code: string;
  name: string;
  credit: number;
  hours: number;
  course_type: string;
  department_id: number | null;
  department_name?: string | null;
  description: string | null;
  offering_count?: number;
}

export interface Offering {
  id: number;
  offering_code: string;
  course_id: number;
  course_name?: string;
  course_code?: string;
  credit?: number;
  course_type?: string;
  teacher_id: number | null;
  teacher_name?: string | null;
  semester: string;
  class_id: number | null;
  class_name?: string | null;
  department_name?: string | null;
  classroom: string | null;
  schedule: string | null;
  capacity: number;
  status: string;
  student_count?: number;
  created_at?: string;
}

export interface RosterRow {
  id: number;
  student_id: number;
  student_no: string;
  student_name: string;
  gender: string;
  class_name: string | null;
  major_name: string | null;
  score: number | null;
  select_status: string;
  exam_type: string;
  remark: string | null;
}

export interface OfferingDetail extends Offering {
  roster: RosterRow[];
  summary: {
    enrolled: number;
    scoredCount: number;
    avgScore: number;
    maxScore: number;
    minScore: number;
    passRate: number;
  };
}

export interface Enrollment {
  id: number;
  offering_id: number;
  student_id: number;
  student_no: string;
  student_name: string;
  gender: string;
  class_name: string | null;
  major_name: string | null;
  department_name: string | null;
  offering_code: string;
  semester: string;
  classroom: string | null;
  schedule: string | null;
  course_name: string;
  course_code: string;
  credit: number;
  course_type: string;
  teacher_name: string | null;
  score: number | null;
  grade_point: number | null;
  select_status: string;
  exam_type: string;
}

export interface SysAccount {
  id: number;
  username: string;
  real_name: string;
  role: Role;
  role_label?: string;
  ref_id: number | null;
  phone: string | null;
  email: string | null;
  avatar: string | null;
  status: string;
  last_login_at: string | null;
  created_at: string;
}

export interface LogRow {
  id: number;
  user_id: number | null;
  username: string | null;
  module: string | null;
  action: string | null;
  method: string | null;
  path: string | null;
  ip: string | null;
  detail: string | null;
  success: number;
  cost_ms: number | null;
  created_at: string;
}

export interface Option {
  id: number;
  code?: string;
  name?: string;
  label?: string;
  teacher_no?: string;
  department_id?: number | null;
  degree_type?: string;
  major_id?: number;
  grade_year?: number;
  course_code?: string;
  credit?: number;
  course_type?: string;
  title?: string;
}

export interface DashboardData {
  greetingName: string;
  currentSemester: string;
  stats: {
    totalStudents: number;
    activeStudents: number;
    totalTeachers: number;
    totalCourses: number;
    totalOfferings: number;
    totalDepartments: number;
    totalMajors: number;
    totalClasses: number;
    enrollments: number;
    avgScore: number;
    passRate: number;
    excellentCount: number;
  };
  charts: {
    departmentDistribution: { name: string; value: number }[];
    enrollmentTrend: { name: string; value: number }[];
    scoreDistribution: { name: string; value: number }[];
    statusDistribution: { name: string; value: number }[];
    hotCourses: { name: string; value: number; teacher: string | null }[];
    teacherLoad: { name: string; value: number }[];
  };
  todos: { label: string; value: number; type: string }[];
  recentStudents: {
    id: number;
    student_no: string;
    name: string;
    gender: string;
    enroll_year: number;
    status: string;
    class_name: string | null;
    major_name: string | null;
  }[];
}

export interface MetaInfo {
  appName: string;
  version: string;
  env: string;
  serverTime: string;
  currentSemester: string;
  counts: { students: number; teachers: number; courses: number };
}

export interface ImportResult {
  total: number;
  success: number;
  failed: number;
  errors: { row: number; message: string }[];
}
