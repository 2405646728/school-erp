import axios from 'axios';

/** 官网接口封装：全部为公开接口，无需鉴权 */
export interface ApiResult<T> {
  code: number;
  message: string;
  data: T;
}

export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

const instance = axios.create({ baseURL: '/api/public', timeout: 15000 });

instance.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error?.response?.data?.message || error?.message || '网络异常，请稍后重试';
    return Promise.reject(new Error(message));
  },
);

async function request<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const response = await instance.get<ApiResult<T>>(url, { params });
  return response.data.data;
}

export interface SiteInfo {
  settings: Record<string, string>;
  pages: { slug: string; title: string; subtitle: string | null }[];
  categories: string[];
  stats: {
    departments: number;
    majors: number;
    students: number;
    teachers: number;
    courses: number;
    articles: number;
  };
}

export interface Banner {
  id: number;
  title: string;
  subtitle: string | null;
  image: string | null;
  link: string | null;
}

export interface ArticleBrief {
  id: number;
  title: string;
  category: string;
  summary: string | null;
  cover: string | null;
  author?: string | null;
  source?: string | null;
  tags?: string | null;
  is_top?: number;
  view_count?: number;
  published_at: string | null;
}

export interface ArticleDetail extends ArticleBrief {
  content: string | null;
  prev: { id: number; title: string } | null;
  next: { id: number; title: string } | null;
}

export interface MajorInfo {
  id: number;
  code: string;
  name: string;
  degree_type: string;
  duration_years: number;
  description: string | null;
  class_count: number;
}

export interface DepartmentInfo {
  id: number;
  code: string;
  name: string;
  dean: string | null;
  office: string | null;
  phone: string | null;
  description: string | null;
  major_count: number;
  teacher_count: number;
  student_count: number;
  majors: MajorInfo[];
}

export interface TeacherInfo {
  id: number;
  teacher_no: string;
  name: string;
  gender: string;
  title: string;
  email: string | null;
  department_name: string | null;
  offering_count: number;
}

export interface CourseInfo {
  id: number;
  course_code: string;
  name: string;
  credit: number;
  hours: number;
  course_type: string;
  description: string | null;
  department_name: string | null;
}

export interface PageDetail {
  slug: string;
  title: string;
  subtitle: string | null;
  content: string | null;
  updated_at: string;
}

export interface SearchResult {
  articles: { id: number; title: string; category: string; summary: string | null; published_at: string }[];
  majors: { id: number; name: string; code: string; department_name: string | null }[];
  pages: { slug: string; title: string; subtitle: string | null }[];
}

export const publicApi = {
  site: () => request<SiteInfo>('/site'),
  banners: () => request<Banner[]>('/banners'),
  headline: () =>
    request<{ top: ArticleBrief[]; notices: ArticleBrief[] }>('/headline'),
  articles: (params: Record<string, unknown>) => request<PageResult<ArticleBrief>>('/articles', params),
  article: (id: number) => request<ArticleDetail>(`/articles/${id}`),
  page: (slug: string) => request<PageDetail>(`/pages/${slug}`),
  departments: () => request<DepartmentInfo[]>('/departments'),
  teachers: (params?: Record<string, unknown>) => request<TeacherInfo[]>('/teachers', params),
  courses: (params?: Record<string, unknown>) => request<CourseInfo[]>('/courses', params),
  search: (keyword: string) => request<SearchResult>('/search', { keyword }),
};
