// src/proveedores/proveedores.ctrl.ts
import { Request, Response } from "express";
import { prisma } from "../prisma.js";

export async function list(req: Request, res: Response) {
    const proveedores = await prisma.proveedor.findMany({
        orderBy: { nombre: "asc" }
    });
    res.json(proveedores);
}

export async function create(req: Request, res: Response) {
    const { nombre, rfc, telefono, correo, direccion } = req.body;

    if (!nombre) {
        return res.status(400).json({ error: "El nombre del proveedor es obligatorio" });
    }

    try {
        const proveedor = await prisma.proveedor.create({
            data: {
                nombre,
                rfc: rfc || null,
                telefono: telefono || null,
                correo: correo || null,
                direccion: direccion || null,
            },
        });

        res.status(201).json(proveedor);
    } catch (e: any) {
        res.status(400).json({ error: e?.message || "No se pudo crear el proveedor" });
    }
}

export async function getOne(req: Request, res: Response) {
    const id = Number(req.params.id);
    const proveedor = await prisma.proveedor.findUnique({ where: { id } });

    if (!proveedor) return res.status(404).json({ error: "Proveedor no encontrado" });

    res.json(proveedor);
}

export async function update(req: Request, res: Response) {
    const id = Number(req.params.id);
    const { nombre, rfc, telefono, correo, direccion } = req.body;

    try {
        const proveedor = await prisma.proveedor.update({
            where: { id },
            data: { nombre, rfc, telefono, correo, direccion },
        });

        res.json(proveedor);
    } catch (e: any) {
        res.status(400).json({ error: "No se pudo actualizar el proveedor" });
    }
}

export async function remove(req: Request, res: Response) {
    const id = Number(req.params.id);

    try {
        await prisma.proveedor.delete({ where: { id } });
        res.json({ ok: true });
    } catch (e: any) {
        res.status(400).json({ error: "No se pudo eliminar el proveedor" });
    }
}
