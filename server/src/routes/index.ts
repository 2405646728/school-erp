import { Router } from 'express';
import { get, scalar } from '../db';
import { config } from '../config';
import { renderApiIndex } from './apiIndex';
import authRoutes from '../modules/auth/auth.routes';
import classRoutes from '../modules/classGroup/class.routes';
import cmsRoutes from '../modules/cms/cms.routes';
import courseRoutes from '../modules/course/course.routes';
import dashboardRoutes from '../modules/dashboard/dashboard.routes';
import departmentRoutes from '../modules/department/department.routes';
import enrollmentRoutes from '../modules/enrollment/enrollment.routes';
import logRoutes from '../modules/log/log.routes';
import majorRoutes from '../modules/major/major.routes';
import offeringRoutes from '../modules/offering/offering.routes';
import publicRoutes from '../modules/publicSite/public.routes';
import studentRoutes from '../modules/student/student.routes';
import teacherRoutes from '../modules/teacher/teacher.routes';
import userRoutes from '../modules/user/user.routes';

const router = Router();

/** 根路径：接口索引页，方便直接浏览后端能力 */
router.get('/', (_req, res) => {
  res.type('html').send(renderApiIndex());
});

/** 服务元信息：前端用于展示版本号、当前学期等 */
router.get('/meta', (_req, res) => {
  const semester = get<{ semester: string }>(
    `SELECT semester FROM course_offering ORDER BY semester DESC LIMIT 1`,
  )?.semester;

  res.json({
    code: 0,
    message: 'success',
    data: {
      appName: config.appName,
      version: config.version,
      env: config.env,
      serverTime: new Date().toISOString(),
      currentSemester: semester ?? '2025-2026-1',
      counts: {
        students: scalar<number>(`SELECT COUNT(*) FROM student`),
        teachers: scalar<number>(`SELECT COUNT(*) FROM teacher`),
        courses: scalar<number>(`SELECT COUNT(*) FROM course`),
      },
    },
  });
});

router.get('/health', (_req, res) => {
  res.json({ code: 0, message: 'ok', data: { status: 'UP', uptime: process.uptime() } });
});

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/departments', departmentRoutes);
router.use('/majors', majorRoutes);
router.use('/classes', classRoutes);
router.use('/teachers', teacherRoutes);
router.use('/students', studentRoutes);
router.use('/courses', courseRoutes);
router.use('/offerings', offeringRoutes);
router.use('/enrollments', enrollmentRoutes);
router.use('/users', userRoutes);
router.use('/logs', logRoutes);

// 官网公开接口（无需登录）与官网内容管理（仅管理员）
router.use('/public', publicRoutes);
router.use('/cms', cmsRoutes);

export default router;
