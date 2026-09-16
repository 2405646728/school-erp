import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import type { AuthedRequest } from '../../types';
import { handler, ok } from '../../utils/http';
import * as service from './dashboard.service';

const router = Router();

router.get(
  '/overview',
  authenticate,
  handler(async (req, res) => {
    ok(res, service.overview((req as AuthedRequest).user!));
  }),
);

export default router;
