// src/movimientos/movimientos.routes.ts
import { Router } from "express";
import { MovimientosController } from "./movimientos.ctrl.js";
import { authGuard } from "../auth/auth.middleware.js";
import { MovimientosService } from "./movimientos.service.js";

const router = Router();

// Registrar movimiento manual
router.post("/", authGuard, MovimientosController.registrar);

// Listar movimientos por bien
router.get("/:bienId", authGuard, MovimientosController.listar);

router.get('/:bienId', async (req, res) => {
    const bienId = Number(req.params.bienId);
    const movs = await MovimientosService.obtenerPorBien(bienId);
    res.json(movs);
});


export default router;
