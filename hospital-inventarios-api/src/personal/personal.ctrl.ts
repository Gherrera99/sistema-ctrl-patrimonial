import { Request, Response } from "express";
import { prisma } from "../prisma.js";

function canManage(req: any) {
    const r = String(req.user?.role || "").toUpperCase();
    return ["ADMIN", "CONTROL_PATRIMONIAL", "AUXILIAR_PATRIMONIAL"].includes(r);
}

export async function listPersonal(req: Request, res: Response) {
    const q = String(req.query.q || "").trim();
    const activo = String(req.query.activo || "1") !== "0";

    const rows = await prisma.personal.findMany({
        where: {
            activo,
            ...(q
                ? {
                    OR: [
                        { nombre: { contains: q } },
                        { rfc: { contains: q } },
                        { puesto: { contains: q } },
                    ],
                }
                : {}),
        },
        orderBy: { nombre: "asc" },
        take: 500,
    });

    res.json(rows);
}

export async function createPersonal(req: any, res: Response) {
    if (!canManage(req)) return res.status(403).json({ error: "Sin permisos" });

    const nombre = String(req.body?.nombre || "").trim();
    const rfc = String(req.body?.rfc || "").trim().toUpperCase();
    const puesto = String(req.body?.puesto || "").trim();

    if (!nombre || !rfc || !puesto) return res.status(400).json({ error: "nombre, rfc y puesto son obligatorios" });

    const row = await prisma.personal.create({
        data: { nombre, rfc, puesto, activo: true },
    });

    res.json(row);
}

export async function updatePersonal(req: any, res: Response) {
    if (!canManage(req)) return res.status(403).json({ error: "Sin permisos" });

    const id = Number(req.params.id);
    const nombre = String(req.body?.nombre || "").trim();
    const rfc = String(req.body?.rfc || "").trim().toUpperCase();
    const puesto = String(req.body?.puesto || "").trim();
    const activo = req.body?.activo;

    const row = await prisma.personal.update({
        where: { id },
        data: {
            ...(nombre ? { nombre } : {}),
            ...(rfc ? { rfc } : {}),
            ...(puesto ? { puesto } : {}),
            ...(typeof activo === "boolean" ? { activo } : {}),
        },
    });

    res.json(row);
}

export async function disablePersonal(req: any, res: Response) {
    if (!canManage(req)) return res.status(403).json({ error: "Sin permisos" });

    const id = Number(req.params.id);
    const row = await prisma.personal.update({
        where: { id },
        data: { activo: false },
    });

    res.json(row);
}
