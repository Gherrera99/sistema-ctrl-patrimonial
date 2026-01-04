//api/src/dictamen/dictamen.ctrl.ts

import { Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { buildDictamenPdf } from './dictamen.pdf.js';
import { TipoArchivoDictamen } from '@prisma/client';

function coordFromCategoria(item: any) {
    // GENERAL -> MANTENIMIENTO, INFORMATICA -> TECNOLOGIAS
    const cat = String(item.categoria ?? 'GENERAL').toUpperCase();
    return cat === 'INFORMATICA' ? 'TECNOLOGIAS' : 'MANTENIMIENTO';
}

function tipoDictamenFromCategoria(item: any) {
    const cat = String(item.categoria ?? 'GENERAL').toUpperCase();
    return cat === 'INFORMATICA' ? 'INFORMATICA' : 'ADMINISTRATIVO';
}

function getUser(req: Request) {
    const u = (req as any).user || {};
    return {
        id: Number(u.id),
        role: String(u.role || ''),
        name: String(u.name || ''),
    };
}

function isAdmin(req: Request) {
    return String((req as any).user?.role || '') === 'ADMIN';
}

function isOwner(req: Request, dictamen: any) {
    const uid = Number((req as any).user?.id);
    return !!uid && Number(dictamen?.creadoPorId) === uid;
}

function canEditDictamen(req: Request, dictamen: any) {
    // BORRADOR: creador o ADMIN
    if (String(dictamen?.estado) !== 'BORRADOR') return false;
    return isAdmin(req) || isOwner(req, dictamen);
}

function canUploadScan(req: Request, dictamen: any) {
    const estado = String(dictamen?.estado || '');
    // CANCELADO: nadie
    if (estado === 'CANCELADO') return false;

    // BORRADOR: creador o ADMIN
    if (estado === 'BORRADOR') return isAdmin(req) || isOwner(req, dictamen);

    // FIRMADO: SOLO ADMIN (reemplazo permitido)
    if (estado === 'FIRMADO') return isAdmin(req);

    return false;
}

function canSign(req: Request, dictamen: any) {
    // Solo BORRADOR y solo creador/admin
    if (String(dictamen?.estado) !== 'BORRADOR') return false;
    return isAdmin(req) || isOwner(req, dictamen);
}

export async function searchBienes(req: Request, res: Response) {
    const q = String(req.query.q ?? '').trim();
    if (!q) return res.json([]);

    const items = await prisma.inventoryItem.findMany({
        where: {
            OR: [
                { no_inventario: { contains: q } },
                { nombre: { contains: q } },
                { no_serie: { contains: q } },
            ],
        },
        take: 20,
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            no_inventario: true,
            nombre: true,
            no_serie: true,
            marca: true,
            modelo: true,
            responsable: true,
            categoria: true,
            ubicacion: { select: { nombre: true } },
            estado: { select: { label: true } },
        },
    });

    res.json(items);
}

export async function createDictamen(req: Request, res: Response) {
    const userId = Number((req as any).user?.id);
    const { bienId, dictamenTexto, coordinacion, unidadAdscripcion, ubicacionFisica, fecha } = req.body || {};

    if (!bienId) return res.status(400).json({ error: 'bienId requerido' });
    if (!dictamenTexto || !String(dictamenTexto).trim()) {
        return res.status(400).json({ error: 'dictamenTexto requerido' });
    }
    if (!userId) return res.status(401).json({ error: 'No autenticado' });

    const bien = await prisma.inventoryItem.findUnique({
        where: { id: Number(bienId) },
        include: { ubicacion: true, estado: true },
    });
    if (!bien) return res.status(404).json({ error: 'Bien no encontrado' });

    // ✅ Regla nueva: no dictámenes para bienes BAJA
    if (String(bien.estadoLogico).toUpperCase() === 'BAJA') {
        return res.status(400).json({ error: 'No se puede crear dictamen para un bien en BAJA.' });
    }

    // (Opcional pero recomendado) Evita dictámenes si el bien está BORRADOR
    // Si quieres permitirlo, borra este bloque.
    if (String(bien.estadoLogico).toUpperCase() === 'BORRADOR') {
        return res.status(400).json({ error: 'No se puede crear dictamen para un bien en BORRADOR.' });
    }

    // (Opcional recomendado) Evita más de 1 dictamen BORRADOR para el mismo bien
    const borradorExistente = await prisma.dictamenBien.findFirst({
        where: { bienId: bien.id, estado: 'BORRADOR' as any },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    if (borradorExistente) {
        return res.status(400).json({
            error: `Ya existe un dictamen BORRADOR para este bien (ID: ${borradorExistente.id}).`,
        });
    }

    const tipo = tipoDictamenFromCategoria(bien);

    const coordTipo = (coordinacion
            ? String(coordinacion).toUpperCase()
            : coordFromCategoria(bien)
    ) as any;

    const cfg = await prisma.dictamenConfig.findUnique({
        where: { coordinacion: coordTipo },
    });
    if (!cfg) return res.status(400).json({ error: `No existe configuración para coordinacion ${coordTipo}` });

    const created = await prisma.dictamenBien.create({
        data: {
            bienId: bien.id,
            tipo: tipo as any,

            coordinacionTipo: coordTipo,
            configId: cfg.id,

            unidadAdscripcion: unidadAdscripcion || null,
            ubicacionFisica: ubicacionFisica || (bien.ubicacion?.nombre ?? null),
            fecha: fecha ? new Date(fecha) : new Date(),
            dictamenTexto: String(dictamenTexto),
            estado: 'BORRADOR' as any,
            creadoPorId: userId,
        },
        include: { bien: true },
    });

    // ✅ Ya NO tocamos estadoLogico aquí (adiós EN_DICTAMEN)

    return res.status(201).json(created);
}

export async function getDictamen(req: Request, res: Response) {
    const id = Number(req.params.id);
    const d = await prisma.dictamenBien.findUnique({
        where: { id },
        include: {
            bien: { include: { ubicacion: true, estado: true, proveedor: true } },
            creadoPor: { select: { id: true, name: true, email: true, role: true } },
            DictamenArchivo: {
                orderBy: { uploadedAt: 'desc' },
                include: {
                    uploadedBy: { select: { id: true, name: true } }, // ✅ para mostrar en UI
                },
            },
        },
    });
    if (!d) return res.status(404).json({ error: 'No encontrado' });
    res.json(d);
}

export async function updateDictamen(req: Request, res: Response) {
    const id = Number(req.params.id);
    const before = await prisma.dictamenBien.findUnique({ where: { id } });
    if (!before) return res.status(404).json({ error: 'No encontrado' });

    // ✅ PERMISOS NUEVOS
    if (!canEditDictamen(req, before)) {
        return res.status(403).json({ error: 'No autorizado para editar este dictamen.' });
    }

    const { dictamenTexto, unidadAdscripcion, ubicacionFisica, fecha } = req.body || {};

    const updated = await prisma.dictamenBien.update({
        where: { id },
        data: {
            ...(dictamenTexto !== undefined ? { dictamenTexto: String(dictamenTexto) } : {}),
            ...(unidadAdscripcion !== undefined ? { unidadAdscripcion: unidadAdscripcion || null } : {}),
            ...(ubicacionFisica !== undefined ? { ubicacionFisica: ubicacionFisica || null } : {}),
            ...(fecha !== undefined ? { fecha: fecha ? new Date(fecha) : new Date() } : {}),
        },
    });

    res.json(updated);
}

export async function listDictamenes(req: Request, res: Response) {
    const q = String(req.query.q ?? '').trim();
    const estado = String(req.query.estado ?? '').trim(); // BORRADOR | FIRMADO | CANCELADO
    const mine = String(req.query.mine ?? '') === '1';
    const take = Math.min(Number(req.query.take ?? 50), 200);

    const where: any = {};
    if (estado) where.estado = estado as any;
    if (mine) where.creadoPorId = Number((req as any).user?.id);

    if (q) {
        where.OR = [
            { folio: { contains: q } },
            { bien: { no_inventario: { contains: q } } },
            { bien: { nombre: { contains: q } } },
        ];
    }

    const rows = await prisma.dictamenBien.findMany({
        where,
        take,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: {
            bien: { select: { id: true, no_inventario: true, nombre: true, categoria: true } },
            creadoPor: { select: { id: true, name: true } },
            DictamenArchivo: {
                orderBy: { uploadedAt: 'desc' },
                select: {
                    id: true,
                    tipo: true,
                    nombre: true,
                    filePath: true,
                    uploadedAt: true,
                },
            },
        },
    });

    res.json(rows);
}

export async function firmarDictamen(req: Request, res: Response) {
    const id = Number(req.params.id);

    const user = (req as any).user || {};
    const userId = user?.id ? Number(user.id) : null;

    const d0 = await prisma.dictamenBien.findUnique({
        where: { id },
        include: { DictamenArchivo: true },
    });
    if (!d0) return res.status(404).json({ error: 'No encontrado' });

    // Evita re-firmar
    if (String((d0 as any).estado).toUpperCase() === 'FIRMADO') {
        return res.status(400).json({ error: 'Este dictamen ya está firmado.' });
    }

    // ✅ PERMISOS NUEVOS
    if (!canSign(req, d0)) {
        return res.status(403).json({ error: 'No autorizado para firmar este dictamen.' });
    }

    const tieneEscaneado = (d0?.DictamenArchivo || []).some(a =>
        ['PDF', 'FOTO'].includes(String(a.tipo).toUpperCase())
    );
    if (!tieneEscaneado) {
        return res.status(400).json({ error: 'Primero sube el dictamen escaneado para poder firmar.' });
    }

    const coordTipo = String((d0 as any).coordinacionTipo ?? '').toUpperCase();
    const cfg = d0.configId
        ? await prisma.dictamenConfig.findUnique({ where: { id: d0.configId } })
        : await prisma.dictamenConfig.findUnique({ where: { coordinacion: coordTipo as any } });

    if (!cfg) return res.status(400).json({ error: `No existe configuración para ${coordTipo}` });

    const now = new Date();

    const updated = await prisma.$transaction(async (tx) => {
        // 1) Firmar dictamen
        const dictFirmado = await tx.dictamenBien.update({
            where: { id },
            data: {
                estado: 'FIRMADO' as any,
                firmadoPor: cfg.firmanteNombre,
                puestoFirmante: cfg.firmantePuesto,
                firmadoAt: now,
            },
        });

        // 2) Bien -> BAJA (automático)
        await tx.inventoryItem.update({
            where: { id: Number((d0 as any).bienId) },
            data: { estadoLogico: 'BAJA' as any },
        });

        // 3) Cancelar resguardos del bien (ACTIVO o BORRADOR)
        await tx.resguardoBien.updateMany({
            where: {
                bienId: Number((d0 as any).bienId),
                estado: { in: ['ACTIVO', 'BORRADOR'] as any },
            },
            data: {
                estado: 'CANCELADO' as any,
                canceladoAt: now,
                ...(userId ? { canceladoPorId: userId } : {}),
            },
        });

        return dictFirmado;
    });

    res.json(updated);
}

export async function cancelarDictamen(req: Request, res: Response) {
    const id = Number(req.params.id);
    const role = String((req as any).user?.role ?? '');
    if (role !== 'ADMIN') return res.status(403).json({ error: 'Solo ADMIN puede cancelar' });

    const d = await prisma.dictamenBien.findUnique({ where: { id } , include: { bien: true }});
    if (!d) return res.status(404).json({ error: 'No encontrado' });

    if (String(d.estado) === 'CANCELADO') return res.json(d);

    const updated = await prisma.dictamenBien.update({
        where: { id },
        data: { estado: 'CANCELADO' as any },
    });

    // opcional: regresar bien a ACTIVO si lo marcaste EN_DICTAMEN
    await prisma.inventoryItem.update({
        where: { id: d.bienId },
        data: { estadoLogico: 'ACTIVO' as any },
    }).catch(()=>{});

    res.json(updated);
}

export async function dictamenPdf(req: Request, res: Response) {
    const id = Number(req.params.id);

    const d = await prisma.dictamenBien.findUnique({
        where: { id },
        include: { bien: { include: { ubicacion: true, estado: true, proveedor: true } } },
    });
    if (!d) return res.status(404).send('No encontrado');

    const coordTipo = String((d as any).coordinacionTipo ?? '').toUpperCase();

    const cfg = d.configId
        ? await prisma.dictamenConfig.findUnique({ where: { id: d.configId } })
        : await prisma.dictamenConfig.findUnique({ where: { coordinacion: coordTipo as any } });

    res.setHeader('Content-Type', 'application/pdf');
    const doc = buildDictamenPdf(d as any, cfg as any);
    doc.pipe(res);
    doc.end();

}

export async function subirEscaneado(req: Request, res: Response) {
    const id = Number(req.params.id);
    const u = getUser(req);

    const d = await prisma.dictamenBien.findUnique({ where: { id } });
    if (!d) return res.status(404).json({ error: 'No encontrado' });

    // ✅ PERMISOS NUEVOS
    if (!canUploadScan(req, d)) {
        return res.status(403).json({ error: 'No autorizado para subir escaneado en este dictamen.' });
    }

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ error: 'Archivo requerido' });

    const tipoArchivo =
        file.mimetype === 'application/pdf'
            ? TipoArchivoDictamen.PDF
            : TipoArchivoDictamen.FOTO;

    const filePath = `/api/uploads/dictamen/${file.filename}`;

    await prisma.dictamenArchivo.create({
        data: {
            dictamenId: id,
            tipo: tipoArchivo,
            nombre: file.originalname,
            filePath,
            uploadedById: u.id,
        },
    });

    res.json({ ok: true, filePath });
}

