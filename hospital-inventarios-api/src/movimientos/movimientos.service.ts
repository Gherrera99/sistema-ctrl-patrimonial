// src/movimientos/movimientos.service.ts
import { PrismaClient, TipoMovimiento } from "@prisma/client";

const prisma = new PrismaClient();

export const MovimientosService = {

    async registrarMovimiento({
                                  bienId,
                                  usuarioId,
                                  tipo,
                                  motivo,
                                  responsableAntes,
                                  responsableDespues,
                                  ubicacionAntes,
                                  ubicacionDespues
                              }) {
        return prisma.movimientoBien.create({
            data: {
                bienId,
                usuarioId,
                tipo,
                motivo,
                responsableAntes,
                responsableDespues,
                ubicacionAntes,
                ubicacionDespues
            },
        });
    },

    async obtenerPorBien(bienId: number) {
        return prisma.movimientoBien.findMany({
            where: { bienId },
            orderBy: { fecha: "desc" },
            include: {
                usuario: {
                    select: { id: true, name: true, email: true },
                },
            },
        });
    },
};
