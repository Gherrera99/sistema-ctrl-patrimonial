// hospital-inventarios-api/src/inventory/inventory.routes.ts
import { Router } from 'express';
import { authGuard } from '../auth/auth.middleware.js';
import * as ctrl from './inventory.ctrl.js';

const r = Router();

// Listado con filtros
r.get('/', authGuard, ctrl.list);

// Uno por id
r.get('/:id', authGuard, ctrl.getOne);

// Crear / Actualizar / Eliminar
r.post('/', authGuard, ctrl.create);
r.put('/:id', authGuard, ctrl.update);
r.delete('/:id', authGuard, ctrl.remove);   // 👈 Asegura el DELETE

export default r;
