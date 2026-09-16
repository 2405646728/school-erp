import axios, { type AxiosRequestConfig } from 'axios';
import { ElMessage } from 'element-plus';

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

const instance = axios.create({
  baseURL: '/api',
  timeout: 20000,
});

/** 登录态失效时只提示一次，避免并发请求刷屏 */
let redirecting = false;

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('school-erp-token');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

instance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const message: string =
      error?.response?.data?.message || error?.message || '网络异常，请稍后重试';

    if (status === 401 && !redirecting) {
      redirecting = true;
      localStorage.removeItem('school-erp-token');
      ElMessage.error(message);
      setTimeout(() => {
        window.location.href = '/login';
        redirecting = false;
      }, 600);
      return Promise.reject(new Error(message));
    }

    if (status !== 401) ElMessage.error(message);
    return Promise.reject(new Error(message));
  },
);

/** 统一返回 data，业务层无需再判断 code */
export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await instance.request<ApiResult<T>>(config);
  return response.data.data;
}

/** 需要拿到 message（如保存提示）时使用 */
export async function requestFull<T>(config: AxiosRequestConfig): Promise<ApiResult<T>> {
  const response = await instance.request<ApiResult<T>>(config);
  return response.data;
}

export const http = {
  get: <T>(url: string, params?: Record<string, unknown>) => request<T>({ url, method: 'GET', params }),
  post: <T>(url: string, data?: unknown) => request<T>({ url, method: 'POST', data }),
  put: <T>(url: string, data?: unknown) => request<T>({ url, method: 'PUT', data }),
  delete: <T>(url: string, params?: Record<string, unknown>) =>
    request<T>({ url, method: 'DELETE', params }),
};

/** 下载后端返回的文件流（携带鉴权头，解决 window.open 无法带 token 的问题） */
export async function download(url: string, params?: Record<string, unknown>, fallbackName = 'export.csv') {
  const response = await instance.request<Blob>({
    url,
    method: 'GET',
    params,
    responseType: 'blob',
  });

  const disposition = String(response.headers['content-disposition'] || '');
  const matched = disposition.match(/filename="?([^";]+)"?/);
  const filename = matched ? decodeURIComponent(matched[1]) : fallbackName;

  const blobUrl = window.URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}

export default instance;
