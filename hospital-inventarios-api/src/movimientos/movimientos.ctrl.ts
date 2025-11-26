// src/movimientos/movimientos.ctrl.ts
import { MovimientosService } from "./movimientos.service.js";

export const MovimientosController = {

    async registrar(req, res) {
        try {
            const { bienId, tipo, motivo, responsableAntes, responsableDespues, ubicacionAntes, ubicacionDespues } = req.body;

            if (!bienId || !tipo) {
                return res.status(400).json({ error: "Faltan campos obligatorios." });
            }

            const movimiento = await MovimientosService.registrarMovimiento({
                bienId: Number(bienId),
                usuarioId: req.user.id,
                tipo,
                motivo,
                responsableAntes,
                responsableDespues,
                ubicacionAntes,
                ubicacionDespues
            });

            return res.json(movimiento);

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Error registrando movimiento" });
        }
    },

    async listar(req, res) {
        try {
            const bienId = Number(req.params.bienId);
            const movimientos = await MovimientosService.obtenerPorBien(bienId);
            return res.json(movimientos);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Error obteniendo movimientos" });
        }
    },

};
