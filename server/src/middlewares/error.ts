import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { config } from '../config';
import { ApiError } from '../utils/http';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    code: 404,
    message: `接口不存在：${req.method} ${req.originalUrl}`,
    data: null,
  });
}

/** 全局错误处理：业务异常 / 校验异常 / 数据库约束异常 统一转成标准响应体 */
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    const first = error.issues[0];
    const path = first?.path?.join('.') || '';
    res.status(400).json({
      code: 400,
      message: path ? `${path}：${first.message}` : first?.message || '参数校验失败',
      data: null,
    });
    return;
  }

  if (error instanceof ApiError) {
    res.status(error.status).json({ code: error.code, message: error.message, data: null });
    return;
  }

  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('UNIQUE constraint failed')) {
    res.status(409).json({ code: 409, message: '数据已存在（唯一字段重复），请检查后重试', data: null });
    return;
  }
  if (message.includes('FOREIGN KEY constraint failed')) {
    res.status(400).json({ code: 400, message: '存在关联数据，无法完成该操作', data: null });
    return;
  }
  if (message.includes('NOT NULL constraint failed')) {
    res.status(400).json({ code: 400, message: '必填字段不能为空', data: null });
    return;
  }

  // eslint-disable-next-line no-console
  console.error('[server error]', error);
  res.status(500).json({
    code: 500,
    message: config.env === 'production' ? '服务器内部错误' : `服务器内部错误：${message}`,
    data: null,
  });
}
