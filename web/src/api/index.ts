/** 所有后端接口的集中声明，页面只依赖这里的方法 */
import { download, http, request, type PageResult } from './request';
import type {
  ClassGroup,
  Course,
  DashboardData,
  Department,
  Enrollment,
  ImportResult,
  LogRow,
  Major,
  MetaInfo,
  Offering,
  OfferingDetail,
  Option,
  Role,
  Student,
  StudentDetail,
  SysAccount,
  Teacher,
  UserInfo,
} from '@/types';

type Query = Record<string, unknown>;

export const authApi = {
  login: (data: { username: string; password: string }) =>
    request<{ token: string; user: UserInfo }>({ url: '/auth/login', method: 'POST', data }),
  logout: () => http.post<boolean>('/auth/logout'),
  profile: () =>
    request<{
      account: SysAccount;
      teacher: Record<string, unknown> | null;
      student: Record<string, unknown> | null;
    }>({ url: '/auth/profile', method: 'GET' }),
  updateProfile: (data: Query) => http.put('/auth/profile', data),
  changePassword: (data: { oldPassword: string; newPassword: string }) =>
    http.put<boolean>('/auth/password', data),
};

export const metaApi = {
  info: () => request<MetaInfo>({ url: '/meta', method: 'GET' }),
  health: () => request<{ status: string; uptime: number }>({ url: '/health', method: 'GET' }),
};

export const dashboardApi = {
  overview: () => request<DashboardData>({ url: '/dashboard/overview', method: 'GET' }),
};

export const departmentApi = {
  list: (params: Query) => request<PageResult<Department>>({ url: '/departments', params }),
  options: () => http.get<Option[]>('/departments/options'),
  detail: (id: number) => http.get<Department & { majors: Record<string, unknown>[] }>(`/departments/${id}`),
  create: (data: Query) => http.post<Department>('/departments', data),
  update: (id: number, data: Query) => http.put<Department>(`/departments/${id}`, data),
  remove: (id: number) => http.delete<boolean>(`/departments/${id}`),
};

export const majorApi = {
  list: (params: Query) => request<PageResult<Major>>({ url: '/majors', params }),
  options: (departmentId?: number) =>
    http.get<Option[]>('/majors/options', departmentId ? { departmentId } : undefined),
  detail: (id: number) => http.get<Major>(`/majors/${id}`),
  create: (data: Query) => http.post<Major>('/majors', data),
  update: (id: number, data: Query) => http.put<Major>(`/majors/${id}`, data),
  remove: (id: number) => http.delete<boolean>(`/majors/${id}`),
};

export const classApi = {
  list: (params: Query) => request<PageResult<ClassGroup>>({ url: '/classes', params }),
  options: (majorId?: number) => http.get<Option[]>('/classes/options', majorId ? { majorId } : undefined),
  detail: (id: number) => http.get<ClassGroup & { students: Record<string, unknown>[] }>(`/classes/${id}`),
  create: (data: Query) => http.post<ClassGroup>('/classes', data),
  update: (id: number, data: Query) => http.put<ClassGroup>(`/classes/${id}`, data),
  remove: (id: number) => http.delete<boolean>(`/classes/${id}`),
};

export const teacherApi = {
  list: (params: Query) => request<PageResult<Teacher>>({ url: '/teachers', params }),
  options: () => http.get<Option[]>('/teachers/options'),
  detail: (id: number) =>
    http.get<
      Teacher & {
        department: { id: number; name: string } | null;
        offerings: Record<string, unknown>[];
        account: Record<string, unknown> | null;
      }
    >(`/teachers/${id}`),
  create: (data: Query) => http.post<Teacher>('/teachers', data),
  update: (id: number, data: Query) => http.put<Teacher>(`/teachers/${id}`, data),
  remove: (id: number) => http.delete<boolean>(`/teachers/${id}`),
  resetPassword: (id: number) => http.post<{ password: string }>(`/teachers/${id}/reset-password`),
};

export const studentApi = {
  list: (params: Query) => request<PageResult<Student>>({ url: '/students', params }),
  detail: (id: number) => http.get<StudentDetail>(`/students/${id}`),
  statistics: () =>
    http.get<{ total: number; byStatus: { name: string; value: number }[] }>('/students/statistics'),
  create: (data: Query) => http.post<StudentDetail>('/students', data),
  update: (id: number, data: Query) => http.put<StudentDetail>(`/students/${id}`, data),
  remove: (id: number) => http.delete<boolean>(`/students/${id}`),
  batchDelete: (ids: number[]) => http.post<{ deleted: number }>('/students/batch-delete', { ids }),
  import: (rows: Record<string, unknown>[]) => http.post<ImportResult>('/students/import', { rows }),
  resetPassword: (id: number) => http.post<{ password: string }>(`/students/${id}/reset-password`),
  /** 导出当前筛选条件下的学生名单为 CSV */
  exportCsv: (params: Query) => download('/students/export', params, 'students.csv'),
};

export const courseApi = {
  list: (params: Query) => request<PageResult<Course>>({ url: '/courses', params }),
  options: () => http.get<Option[]>('/courses/options'),
  detail: (id: number) => http.get<Course>(`/courses/${id}`),
  create: (data: Query) => http.post<Course>('/courses', data),
  update: (id: number, data: Query) => http.put<Course>(`/courses/${id}`, data),
  remove: (id: number) => http.delete<boolean>(`/courses/${id}`),
};

export const offeringApi = {
  list: (params: Query) => request<PageResult<Offering>>({ url: '/offerings', params }),
  options: (params?: Query) => http.get<Option[]>('/offerings/options', params),
  semesters: () => http.get<string[]>('/offerings/semesters'),
  detail: (id: number) => http.get<OfferingDetail>(`/offerings/${id}`),
  create: (data: Query) => http.post<OfferingDetail>('/offerings', data),
  update: (id: number, data: Query) => http.put<OfferingDetail>(`/offerings/${id}`, data),
  remove: (id: number) => http.delete<boolean>(`/offerings/${id}`),
  addStudents: (id: number, studentIds: number[]) =>
    http.post<{ added: number; skipped: number }>(`/offerings/${id}/students`, { studentIds }),
};

export const enrollmentApi = {
  list: (params: Query) => request<PageResult<Enrollment>>({ url: '/enrollments', params }),
  overview: () =>
    http.get<{
      total: number;
      scored: number;
      unscored: number;
      avgScore: number;
      bySemester: { name: string; value: number }[];
    }>('/enrollments/overview'),
  batchScore: (items: { id: number; score: number | null; examType?: string }[]) =>
    http.post<{ updated: number }>('/enrollments/batch-score', { items }),
  select: (offeringId: number, studentIds: number[]) =>
    http.post<{ added: number }>('/enrollments/select', { offeringId, studentIds }),
  drop: (id: number) => http.delete<boolean>(`/enrollments/${id}`),
  myCourses: (semester?: string) =>
    http.get<{
      list: Record<string, unknown>[];
      semesters: string[];
      totalCredit: number;
    }>('/enrollments/my-courses', semester ? { semester } : undefined),
  myScores: () =>
    http.get<{
      list: Record<string, unknown>[];
      summary: {
        courseCount: number;
        passedCredit: number;
        totalCredit: number;
        gpa: number;
        avgScore: number;
        failCount: number;
      };
    }>('/enrollments/my-scores'),
  myTeachings: (semester?: string) =>
    http.get<{ list: Record<string, unknown>[]; semesters: string[] }>(
      '/enrollments/my-teachings',
      semester ? { semester } : undefined,
    ),
};

export const userApi = {
  list: (params: Query) => request<PageResult<SysAccount>>({ url: '/users', params }),
  stats: () => http.get<{ name: string; value: number }[]>('/users/stats'),
  bindable: (role: Role) => http.get<{ id: number; label: string }[]>('/users/bindable', { role }),
  create: (data: Query) => http.post<SysAccount>('/users', data),
  update: (id: number, data: Query) => http.put(`/users/${id}`, data),
  toggleStatus: (id: number) => http.post<{ status: string }>(`/users/${id}/toggle-status`),
  resetPassword: (id: number) => http.post<{ password: string }>(`/users/${id}/reset-password`),
  remove: (id: number) => http.delete<boolean>(`/users/${id}`),
};

export const logApi = {
  list: (params: Query) => request<PageResult<LogRow>>({ url: '/logs', params }),
  filters: () => http.get<{ modules: string[]; actions: string[] }>('/logs/filters'),
  clean: (days = 30) => http.delete<{ deleted: number }>('/logs/clean', { days }),
};

/** 官网内容管理 */
export const cmsApi = {
  banners: () => http.get<Record<string, unknown>[]>('/cms/banners'),
  createBanner: (data: Query) => http.post('/cms/banners', data),
  updateBanner: (id: number, data: Query) => http.put(`/cms/banners/${id}`, data),
  moveBanner: (id: number, direction: 'up' | 'down') =>
    http.post(`/cms/banners/${id}/move?direction=${direction}`),
  removeBanner: (id: number) => http.delete(`/cms/banners/${id}`),

  articles: (params: Query) => request<PageResult<Record<string, unknown>>>({ url: '/cms/articles', params }),
  articleStats: () =>
    http.get<{
      total: number;
      published: number;
      draft: number;
      views: number;
      byCategory: { name: string; value: number }[];
    }>('/cms/articles/stats'),
  article: (id: number) => http.get<Record<string, unknown>>(`/cms/articles/${id}`),
  createArticle: (data: Query) => http.post('/cms/articles', data),
  updateArticle: (id: number, data: Query) => http.put(`/cms/articles/${id}`, data),
  toggleArticleStatus: (id: number) => http.post<{ status: string }>(`/cms/articles/${id}/toggle-status`),
  toggleArticleTop: (id: number) => http.post<{ isTop: number }>(`/cms/articles/${id}/toggle-top`),
  removeArticle: (id: number) => http.delete(`/cms/articles/${id}`),

  pages: () => http.get<Record<string, unknown>[]>('/cms/pages'),
  createPage: (data: Query) => http.post('/cms/pages', data),
  updatePage: (id: number, data: Query) => http.put(`/cms/pages/${id}`, data),
  removePage: (id: number) => http.delete(`/cms/pages/${id}`),

  settings: () => http.get<{ key: string; value: string; label: string | null }[]>('/cms/settings'),
  updateSettings: (items: { key: string; value: string }[]) => http.put('/cms/settings', { items }),
};
