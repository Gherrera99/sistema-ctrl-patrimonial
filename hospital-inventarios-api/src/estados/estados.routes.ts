import { Router } from 'express';
import { authGuard, adminOnly } from '../auth/auth.middleware.js';
import * as ctrl from './estados.ctrl.js';

const r = Router();

// Listar (cualquiera autenticado)
r.get('/', authGuard, ctrl.list);

// Crear / actualizar / eliminar (solo admin)
r.post('/', authGuard, adminOnly, ctrl.create);
r.put('/:id', authGuard, adminOnly, ctrl.update);
r.delete('/:id', authGuard, adminOnly, ctrl.remove);

export default r;
