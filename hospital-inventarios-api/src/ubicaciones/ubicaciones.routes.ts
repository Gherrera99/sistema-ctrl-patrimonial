import { Router } from 'express';
import { authGuard, adminOnly } from '../auth/auth.middleware.js';
import * as ctrl from './ubicaciones.ctrl.js';

const r = Router();

// Listar (autenticado)
r.get('/', authGuard, ctrl.list);
// Crear / actualizar / eliminar (admin)
r.post('/', authGuard, adminOnly, ctrl.create);
r.put('/:id', authGuard, adminOnly, ctrl.update);
r.delete('/:id', authGuard, adminOnly, ctrl.remove);

export default r;
