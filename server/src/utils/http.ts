/** 统一响应结构与业务异常 */
import type { NextFunction, Request, Response } from 'express';

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

/** 业务异常：抛出后由全局错误中间件转换为标准响应 */
export class ApiError extends Error {
  status: number;
  code: number;

  constructor(message: string, status = 400, code = status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }

  static badRequest(message = '请求参数有误') {
    return new ApiError(message, 400);
  }

  static unauthorized(message = '登录已失效，请重新登录') {
    return new ApiError(message, 401);
  }

  static forbidden(message = '没有权限执行该操作') {
    return new ApiError(message, 403);
  }

  static notFound(message = '数据不存在') {
    return new ApiError(message, 404);
  }

  static conflict(message = '数据冲突') {
    return new ApiError(message, 409);
  }
}

export function ok<T>(res: Response, data: T, message = 'success') {
  const body: ApiResponse<T> = { code: 0, message, data };
  res.json(body);
}

/** 分页响应体 */
export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export function page<T>(list: T[], total: number, pageNo: number, pageSize: number): PageResult<T> {
  return { list, total, page: pageNo, pageSize };
}

/** async 控制器包装：把 rejected promise 交给错误中间件 */
export function handler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
