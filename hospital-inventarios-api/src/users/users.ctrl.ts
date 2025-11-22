// hospital-inventarios-api/src/users/users.ctrl.ts
import { Request, Response } from 'express';
import { prisma } from '../prisma.js';
import bcrypt from 'bcrypt';

export async function list(_req: Request, res: Response) {
    const users = await prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true },
        orderBy: { createdAt: 'desc' },
    });
    res.json(users);
}

export async function create(req: Request, res: Response) {
    const { name, email, password, role } = req.body as { name: string; email: string; password: string; role: 'ADMIN' | 'COLABORADOR' };
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password requeridos' });

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: 'Email ya registrado' });

    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
        data: { name, email, password: hash, role: role ?? 'COLABORADOR' },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    res.status(201).json(user);
}

export async function update(req: Request, res: Response) {
    const id = Number(req.params.id);
    const { name, email, role } = req.body as { name?: string; email?: string; role?: 'ADMIN' | 'COLABORADOR' };
    const user = await prisma.user.update({
        where: { id },
        data: { name, email, role },
        select: { id: true, name: true, email: true, role: true, updatedAt: true },
    });
    res.json(user);
}

export async function resetPassword(req: Request, res: Response) {
    const id = Number(req.params.id);
    const { newPassword } = req.body as { newPassword: string };
    if (!newPassword) return res.status(400).json({ error: 'newPassword requerido' });
    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id }, data: { password: hash } });
    res.json({ ok: true });
}

export async function remove(req: Request, res: Response) {
    const id = Number(req.params.id);
    // opcional: evita que un admin se borre a sí mismo
    const meId = (req as any).user?.id as number | undefined;
    if (meId && meId === id) return res.status(400).json({ error: 'No puedes eliminar tu propio usuario' });

    await prisma.user.delete({ where: { id } });
    res.json({ ok: true });
}
