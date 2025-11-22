// hospital-inventarios-api/src/authorizers/authorizers.routes.ts
import { Router } from 'express';
import * as ctrl from './authorizers.ctrl.js';
import { authGuard, adminOnly } from '../auth/auth.middleware.js';

const r = Router();

// Listado (requiere sesión, cualquier rol)
r.get('/', authGuard, ctrl.list);

// Crear, activar y eliminar (solo admin)
r.post('/', authGuard, adminOnly, ctrl.create);
r.post('/:id/activate', authGuard, adminOnly, ctrl.activate);
r.delete('/:id', authGuard, adminOnly, ctrl.remove);

export default r;
