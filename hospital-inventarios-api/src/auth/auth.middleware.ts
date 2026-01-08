// api/src/auth/auth.middleware.ts
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

export const COOKIE = 'sid';

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';

// ✅ Permisos por rol (aquí es donde debe vivir, no en routes)
const ROLE_PERMS: Record<string, string[]> = {
    ADMIN: ['*'],
    CONTROL_PATRIMONIAL: [
        'dictamen:read',
        'dictamen:write',
        'proveedores:read',
        'proveedores:write',
    ], // si aplica
    AUXILIAR_PATRIMONIAL: [
        'dictamen:read',
        'dictamen:write',
        'proveedores:read',
        'proveedores:write',
    ],

    MANTENIMIENTO: [
        'dictamen:read',
        'dictamen:write',
        'proveedores:read',
    ],

    TECNOLOGIAS: [
        'dictamen:read',
        'proveedores:read',
        'proveedores:write',
    ],

    COLABORADOR: [
        'proveedores:read',
    ],
};


export const signJWT = (payload: any) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });
};

export const verifyJWT = (token: string) => {
    return jwt.verify(token, JWT_SECRET) as any;
};

export const authGuard = (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies?.[COOKIE];
    if (!token) return res.status(401).json({ error: 'No autenticado' });

    try {
        const decoded = verifyJWT(token);

        // ✅ normaliza role (por si viene "colaborador" o "Colaborador")
        const role = String(decoded?.role ?? 'COLABORADOR').toUpperCase();
        decoded.role = role;

        // ✅ inyecta permissions
        decoded.permissions = ROLE_PERMS[role] ?? [];

        (req as any).user = decoded;
        next();
    } catch {
        return res.status(401).json({ error: 'Token inválido' });
    }
};

export const adminOnly = (req: Request, res: Response, next: NextFunction) => {
    const role = String((req as any).user?.role ?? '').toUpperCase();
    if (role !== 'ADMIN') return res.status(403).json({ error: 'Solo admin' });
    next();
};

// ✅ permiso por endpoint (además del guard del frontend)
export const requirePermission = (perm: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = (req as any).user;
        if (!user) return res.status(401).json({ error: 'No autenticado' });

        if (String(user.role).toUpperCase() === 'ADMIN') return next();

        const perms: string[] = Array.isArray(user.permissions) ? user.permissions : [];
        if (perms.includes(perm)) return next();

        return res.status(403).json({ error: 'Sin permiso' });
    };
};
