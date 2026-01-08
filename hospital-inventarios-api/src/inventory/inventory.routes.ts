// hospital-inventarios-api/src/inventory/inventory.routes.ts
import { Router } from 'express';
import { authGuard } from '../auth/auth.middleware.js';
import * as ctrl from './inventory.ctrl.js';
import { uploadFactura, uploadResguardo } from './inventory.upload.js';
import {listClasificaciones} from "./inventory.ctrl.js";

const r = Router();

// Listado con filtros
r.get('/', authGuard, ctrl.list);

// src/routes/catalogos.routes.ts (o donde tengas tus rutas)
r.get('/clasificaciones', authGuard, ctrl.listClasificaciones);


// Acciones de archivos / flujo
r.post('/:id/factura', authGuard, uploadFactura.single('file'), ctrl.subirFactura);
r.post('/:id/resguardo/firmado', authGuard, uploadResguardo.single('file'), ctrl.subirResguardoFirmado);
r.post('/:id/resguardo/cancelado', authGuard, uploadResguardo.single('file'), ctrl.subirResguardoCancelado);

r.post('/:id/subir', authGuard, ctrl.subirAlInventario);
r.post('/:id/resguardo/cancelar', authGuard, ctrl.cancelarResguardo);

// Uno por id
r.get('/:id', authGuard, ctrl.getOne);

// Crear / Actualizar / Eliminar
r.post('/', authGuard, ctrl.create);
r.put('/:id', authGuard, ctrl.update);
r.delete('/:id', authGuard, ctrl.remove);

export default r;
