//api/src/dictamen/dictamen.routes.ts

import { Router } from 'express';
import { authGuard, requirePermission } from '../auth/auth.middleware.js';
import * as ctrl from './dictamen.ctrl.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const r = Router();
const uploadDir = path.join(process.cwd(), 'uploads', 'dictamen');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({ storage });

r.get('/bienes', authGuard, requirePermission('dictamen:read'), ctrl.searchBienes);

r.post('/', authGuard, requirePermission('dictamen:write'), ctrl.createDictamen);
r.get('/:id', authGuard, requirePermission('dictamen:read'), ctrl.getDictamen);
r.put('/:id', authGuard, requirePermission('dictamen:write'), ctrl.updateDictamen);

r.post('/:id/firmar', authGuard, requirePermission('dictamen:write'), ctrl.firmarDictamen);
r.get('/:id/pdf', authGuard, requirePermission('dictamen:read'), ctrl.dictamenPdf);

r.get('/', authGuard, requirePermission('dictamen:read'), ctrl.listDictamenes);

r.post('/:id/cancelar', authGuard, requirePermission('dictamen:write'), ctrl.cancelarDictamen);

r.post('/:id/escaneado', authGuard, requirePermission('dictamen:write'), upload.single('file'), ctrl.subirEscaneado);



export default r;
