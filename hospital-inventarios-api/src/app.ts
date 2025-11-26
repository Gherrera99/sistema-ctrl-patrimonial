import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import authRoutes from './auth/auth.routes.js';
import invRoutes from './inventory/inventory.routes.js';
import autzRoutes from './authorizers/authorizers.routes.js';
import estadosRoutes from './estados/estados.routes.js';
import ubicacionesRoutes from './ubicaciones/ubicaciones.routes.js';
import pdfRoutes from './pdf/pdf.routes.js';
import usersRoutes from './users/users.routes.js';
import movimientosRoutes from "./movimientos/movimientos.routes.js";
import proveedoresRoutes from "./proveedores/proveedores.routes.js";



const app = express();
app.set('trust proxy', 1);

const origin = process.env.ALLOW_ORIGIN || 'http://localhost:8081';
app.use(cors({ origin: 'http://localhost:8081', credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/inventario', invRoutes);
app.use('/api/authorizers', autzRoutes);
app.use('/api/estados-fisicos', estadosRoutes);
app.use('/api/ubicaciones', ubicacionesRoutes);
app.use('/api/resguardo', pdfRoutes);
app.use('/api/users', usersRoutes);
app.use("/api/movimientos", movimientosRoutes);
app.use("/api/proveedores", proveedoresRoutes); // 👈 NUEVO

// al final de app.ts, antes de export default app;
app.use((err: any, _req, res, _next) => {
    console.error('[unhandled]', err);
    res.status(500).json({ error: 'Error interno' });
});


export default app;
