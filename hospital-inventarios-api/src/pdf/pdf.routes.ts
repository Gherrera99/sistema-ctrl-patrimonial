// hospital-inventarios-api/src/pdf/pdf.routes.ts
import { Router } from 'express';
import { authGuard } from '../auth/auth.middleware.js';
import { resguardoPdf } from './pdf.ctrl.js';   // ← import nombrado (SIN default)

const router = Router();

// GET /api/resguardo/:id
router.get('/:id', authGuard, resguardoPdf);

export default router;
