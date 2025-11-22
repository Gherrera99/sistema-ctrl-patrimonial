// hospital-inventarios-api/src/ubicaciones/ubicaciones.ctrl.ts
import { Request, Response } from 'express';
import { prisma } from '../prisma.js';

export const list = async (_req: Request, res: Response) => {
    const data = await prisma.ubicacion.findMany({
        orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
    });
    res.json(data);
};

export const create = async (req: Request, res: Response) => {
    try {
        const { code, nombre, name, orden } = req.body as any;
        const nom = (nombre ?? name ?? '').toString().trim();
        const cod = (code ?? '').toString().trim();
        const ord = Number.isFinite(Number(orden)) ? Number(orden) : 99;

        if (!cod || !nom) {
            return res.status(400).json({ error: 'code y nombre son requeridos' });
        }

        const u = await prisma.ubicacion.create({ data: { code: cod, nombre: nom, orden: ord } });
        res.json(u);
    } catch (err) {
        console.error('[ubicaciones.create] error', err);
        res.status(500).json({ error: 'Error al crear ubicación' });
    }
};

export const update = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const { code, nombre, name, orden } = req.body as any;
        const nom = (nombre ?? name ?? '').toString().trim();
        const cod = (code ?? '').toString().trim();
        const ord = Number.isFinite(Number(orden)) ? Number(orden) : undefined;

        if (!id) return res.status(400).json({ error: 'id inválido' });
        if (!cod || !nom) return res.status(400).json({ error: 'code y nombre son requeridos' });

        const u = await prisma.ubicacion.update({
            where: { id },
            data: { code: cod, nombre: nom, ...(ord !== undefined ? { orden: ord } : {}) },
        });
        res.json(u);
    } catch (err) {
        console.error('[ubicaciones.update] error', err);
        res.status(500).json({ error: 'Error al actualizar ubicación' });
    }
};

export const remove = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        if (!id) return res.status(400).json({ error: 'id inválido' });
        await prisma.ubicacion.delete({ where: { id } });
        res.json({ ok: true });
    } catch (err) {
        console.error('[ubicaciones.remove] error', err);
        res.status(500).json({ error: 'Error al eliminar ubicación' });
    }
};
