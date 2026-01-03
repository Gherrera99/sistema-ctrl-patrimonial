// api/src/auth/auth.routes.ts
import { Router } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../prisma.js';
import { authGuard, adminOnly, signJWT, COOKIE } from './auth.middleware.js';

const router = Router();

/**
 * POST /api/auth/login
 * - Verifica credenciales
 * - Firma JWT con { id, name, email, role }
 * - Guarda cookie httpOnly "sid"
 */
router.post('/login', async (req, res) => {
    const { email, password } = req.body as { email: string; password: string };

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Credenciales' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Credenciales' });

    const token = signJWT({ id: user.id, name: user.name, email: user.email, role: user.role });

    res.cookie(COOKIE, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: false, // true si HTTPS
        path: '/',
        maxAge: 1000 * 60 * 60 * 12,
    });

    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

/**
 * GET /api/auth/me
 * - Devuelve el usuario + permissions (inyectados por authGuard)
 */
router.get('/me', authGuard, async (req, res) => {
    const jwtUser = (req as any).user;

    const me = await prisma.user.findUnique({
        where: { id: jwtUser.id },
        select: { id: true, name: true, email: true, role: true },
    });

    if (!me) return res.status(401).json({ error: 'No autenticado' });

    res.json({
        ...me,
        permissions: Array.isArray(jwtUser.permissions) ? jwtUser.permissions : [],
    });
});

/**
 * POST /api/auth/logout
 * - Borra cookie
 */
router.post('/logout', (_req, res) => {
    res.clearCookie(COOKIE, { path: '/' });
    res.json({ ok: true });
});

/**
 * ADMIN: Gestión mínima de usuarios
 */
router.get('/users', authGuard, adminOnly, async (_req, res) => {
    const users = await prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
    });
    res.json(users);
});

router.post('/users', authGuard, adminOnly, async (req, res) => {
    const { name, email, password, role } = req.body as {
        name: string; email: string; password: string; role?: 'ADMIN' | 'COLABORADOR';
    };

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'name, email y password son obligatorios' });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: 'Email ya registrado' });

    const hash = await bcrypt.hash(password, 10);
    const u = await prisma.user.create({
        data: { name, email, password: hash, role: (role ?? 'COLABORADOR') },
        select: { id: true, name: true, email: true, role: true },
    });

    res.status(201).json(u);
});

export default router;
