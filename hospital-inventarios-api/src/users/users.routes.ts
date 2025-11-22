// hospital-inventarios-api/src/users/users.routes.ts
import { Router } from 'express';
import { authGuard, adminOnly } from '../auth/auth.middleware.js';
import * as ctrl from './users.ctrl.js';

const router = Router();

// Todas requieren estar logueado y ser ADMIN
router.use(authGuard, adminOnly);

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.post('/:id/reset-password', ctrl.resetPassword);
router.delete('/:id', ctrl.remove);

export default router;
